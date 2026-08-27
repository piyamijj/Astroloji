import { DateTime } from "luxon";
import type {
  BirthFormInput,
  ChartResult,
  ResolvedLocation,
  PlanetPosition,
  AscendantPosition,
  CalculationMode,
} from "./astro-types";
import {
  PLANET_META,
  PLANET_ORDER,
  degreesToSignAndSubdegree,
  signNameTr,
} from "./astro-constants";

/**
 * Verilen şehir adını ücretsiz Open-Meteo Geocoding API kullanarak
 * enlem, boylam, saat dilimi (IANA) ve tam yer adına çözümler.
 *
 * @param city Kullanıcının girdiği şehir adı (örn. "İstanbul" veya "Izmir")
 * @returns Çözümlenmiş konum bilgileri (ResolvedLocation)
 */
export async function geocodeCity(city: string): Promise<ResolvedLocation> {
  if (!city || city.trim().length < 2) {
    throw new Error("Lütfen geçerli bir şehir adı girin (en az 2 karakter).");
  }

  const encodedCity = encodeURIComponent(city.trim());
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodedCity}&count=1&language=tr&format=json`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 86400 }, // 24 saat önbellekleme (Next.js için)
    });

    if (!response.ok) {
      throw new Error(`Geocoding servisi hata verdi (HTTP ${response.status}).`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error(
        `"${city}" şehri bulunamadı. Lütfen yazımı kontrol edin veya daha büyük bir şehir adı deneyin.`
      );
    }

    const result = data.results[0];
    const latitude = result.latitude;
    const longitude = result.longitude;
    // Open-Meteo bazen timezone döndürmeyebilir, bu durumda varsayılan UTC kabul edilir.
    const timezone = result.timezone || "UTC";

    // Kullanıcıya gösterilecek tam yer adını oluştur (örn. "Kadıköy, İstanbul, Türkiye")
    const parts = [
      result.name,
      result.admin1 !== result.name ? result.admin1 : null,
      result.country,
    ].filter(Boolean);
    const resolvedName = parts.join(", ");

    return {
      latitude,
      longitude,
      timezone,
      resolvedName,
    };
  } catch (error: any) {
    if (error.message && error.message.includes("bulunamadı")) {
      throw error;
    }
    throw new Error(
      `Konum koordinatları çözümlenirken bir hata oluştu: ${
        error.message || error
      }`
    );
  }
}

/**
 * Swiss Ephemeris (swisseph) kütüphanesini kullanarak astronomik olarak %100 doğru
 * Lahiri Ayanamsa tabanlı Vedik (Jyotish) D1 Rasi doğum haritası hesaplar.
 *
 * ÖNEMLİ: Bu fonksiyon sunucu tarafında (Server-side) çalışmalıdır çünkü 'swisseph'
 * bir C++ native addon'dur ve tarayıcıda veya saf Vercel serverless ortamında
 * doğrudan çalıştırılması özel derleme adımları gerektirir.
 *
 * @param input Kullanıcının girdiği doğum bilgileri (ad, tarih, saat, şehir)
 * @returns Hesaplanan doğum haritası verileri (ChartResult)
 */
export async function calculateVedicChart(
  input: BirthFormInput
): Promise<ChartResult> {
  // 1. Swiss Ephemeris modülünü dinamik olarak yükle (CJS native module interop için)
  let swisseph: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    swisseph = require("swisseph");
  } catch (err: any) {
    throw new Error(
      "Swiss Ephemeris (swisseph) kütüphanesi bu sunucu ortamında yüklenemedi. " +
        "Bu durum genellikle Vercel gibi serverless ortamlarda native C++ binary derleme " +
        "uyumsuzluğundan kaynaklanır. Lütfen projenin README.md dosyasındaki " +
        "'swisseph ve Vercel Uyumluluğu' bölümünü inceleyin ve gerekirse saf JS tabanlı " +
        "bir efemeris kütüphanesine (ör. 'astronomia' veya 'circular-natal-horoscope-js') geçiş yapın. " +
        `Detay: ${err.message || err}`
    );
  }

  // 2. Şehir adından enlem, boylam ve saat dilimini çözümlüyoruz
  const location = await geocodeCity(input.city);

  // 3. Tarih ve saati Luxon ile ayrıştırıyoruz
  // Tarih formatı: GG/AA/YYYY, Saat formatı: SS:DD
  const localDateTime = DateTime.fromFormat(
    `${input.birthDate} ${input.birthTime}`,
    "dd/MM/yyyy HH:mm",
    { zone: location.timezone }
  );

  if (!localDateTime.isValid) {
    throw new Error(
      "Girdiğiniz doğum tarihi veya saati geçersiz. Lütfen GG/AA/YYYY ve SS:DD formatlarına uygun girdiğinizden emin olun."
    );
  }

  // 4. Evrensel Zaman (UTC) bileşenlerini alıyoruz (Swiss Ephemeris UT hesaplaması yapar)
  const utcDateTime = localDateTime.toUTC();
  const year = utcDateTime.year;
  const month = utcDateTime.month;
  const day = utcDateTime.day;
  // Saati ondalık (decimal) saate çeviriyoruz (örn. 14:30 -> 14.5)
  const hourDecimal =
    utcDateTime.hour + utcDateTime.minute / 60 + utcDateTime.second / 3600;

  try {
    // 5. Julian Günü (UT) hesapla
    const jdUt = swisseph.swe_julday(
      year,
      month,
      day,
      hourDecimal,
      swisseph.SE_GREG_CAL
    );

    // 6. Efemeris veri yolunu (Ephemeris Path) ayarla
    // Eğer .env.local içinde SWISSEPH_EPHE_PATH tanımlanmışsa gerçek dosyaları kullanırız,
    // tanımlanmamışsa gömülü gelen "Moshier" yarı-analitik moduna düşeriz.
    const ephePath = process.env.SWISSEPH_EPHE_PATH;
    let calculationMode: CalculationMode = "moshier";
    let baseFlags = swisseph.SEFLG_SIDEREAL; // Yıldızcıl (Sidereal) zodyak kullanımı zorunlu

    if (ephePath && ephePath.trim().length > 0) {
      swisseph.swe_set_ephe_path(ephePath.trim());
      baseFlags |= swisseph.SEFLG_SWIEPH; // Gerçek Swiss Ephemeris dosyalarını kullan
      calculationMode = "swisseph-file";
    } else {
      baseFlags |= swisseph.SEFLG_MOSEPH; // Moshier yarı-analitik modunu kullan (dosya gerektirmez)
      calculationMode = "moshier";
    }

    // 7. Ayanamsa'yı 'Lahiri' (Chitra Paksha) olarak ayarla
    // SE_SIDM_LAHIRI = 0'dır. İkinci ve üçüncü parametreler t0 ve ayan_t0 olup Lahiri için 0,0 geçilir.
    swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

    // Hesaplama anındaki Lahiri ayanamsa değerini derece cinsinden oku
    const ayanamsa = swisseph.swe_get_ayanamsa_ut(jdUt);

    // 8. Promisified Swiss Ephemeris API sarmalayıcıları
    // swisseph kütüphanesi asenkron callback yapısı kullanır. Kodun okunabilirliği için bunları Promise'e çeviriyoruz.

    const sweCalcUtAsync = (
      jd: number,
      ipl: number,
      flags: number
    ): Promise<{ longitude: number; speed: number; error?: string }> => {
      return new Promise((resolve, reject) => {
        swisseph.swe_calc_ut(jd, ipl, flags, (result: any) => {
          if (result && result.error) {
            reject(new Error(result.error));
          } else if (result) {
            // result.longitude (0-360 derece), result.longitudeSpeed (hız, retro tespiti için)
            resolve({
              longitude: result.longitude,
              speed: result.longitudeSpeed ?? 0,
            });
          } else {
            reject(new Error("Gezegen hesaplanırken boş sonuç döndü."));
          }
        });
      });
    };

    const sweHousesExAsync = (
      jd: number,
      flags: number,
      lat: number,
      lng: number,
      hsys: string
    ): Promise<{ ascendant: number; error?: string }> => {
      return new Promise((resolve, reject) => {
        swisseph.swe_houses_ex(jd, flags, lat, lng, hsys, (result: any) => {
          if (result && result.error) {
            reject(new Error(result.error));
          } else if (result && result.ascendant !== undefined) {
            // result.ascendant sidereal yükselen derecesidir (çünkü flags içinde SEFLG_SIDEREAL var)
            resolve({ ascendant: result.ascendant });
          } else {
            reject(new Error("Yükselen (Ascendant) hesaplanırken boş sonuç döndü."));
          }
        });
      });
    };

    // 9. Yükselen (Ascendant / Lagna) hesaplama
    // 'P' Placidus ev sistemini temsil eder, ancak Vedik astrolojide ev sınırları yerine
    // sadece Yükselen derecesi (Ascendant) baz alınarak "Whole Sign" (Tüm Burç) ev sistemi kurulur.
    // Bu yüzden ev sistemi harfi olarak ne seçildiğinin yükselen derecesine etkisi yoktur.
    const housesResult = await sweHousesExAsync(
      jdUt,
      baseFlags,
      location.latitude,
      location.longitude,
      "P"
    );

    const ascLongitude = housesResult.ascendant;
    const ascSignInfo = degreesToSignAndSubdegree(ascLongitude);
    const ascendant: AscendantPosition = {
      longitude: ascLongitude,
      sign: ascSignInfo.sign,
      signNameTr: signNameTr(ascSignInfo.sign),
      degreeInSign: ascSignInfo.degreeInSign,
    };

    const ascendantSign = ascendant.sign; // 1-12 arası yükselen burç numarası

    // 10. Gezegenlerin konumlarını hesaplama
    const planets: PlanetPosition[] = [];

    for (const key of PLANET_ORDER) {
      const meta = PLANET_META[key];

      // Ketu, Swiss Ephemeris'te doğrudan bir gövde değildir.
      // Vedik astrolojide Ketu, Rahu'nun tam karşısındadır (Rahu + 180 derece).
      if (key === "ketu") {
        // Rahu'nun konumunu bulup 180 derece ekliyoruz
        const rahuPos = planets.find((p) => p.key === "rahu");
        if (!rahuPos) {
          throw new Error("Ketu hesaplanırken Rahu konumu bulunamadı.");
        }

        const ketuLongitude = (rahuPos.longitude + 180) % 360;
        const ketuSignInfo = degreesToSignAndSubdegree(ketuLongitude);
        // Ketu, Rahu ile aynı hızda ve daima retro (geri giden) kabul edilir.
        const ketuHouse = ((ketuSignInfo.sign - ascendantSign + 12) % 12) + 1;

        planets.push({
          key: "ketu",
          nameTr: meta.nameTr,
          abbr: meta.abbr,
          longitude: ketuLongitude,
          sign: ketuSignInfo.sign,
          signNameTr: signNameTr(ketuSignInfo.sign),
          degreeInSign: ketuSignInfo.degreeInSign,
          house: ketuHouse,
          retrograde: true, // Ketu daima retro kabul edilir
        });
        continue;
      }

      // Diğer gezegenler için Swiss Ephemeris sabit numarasını alıyoruz
      const sweConstantVal = swisseph[meta.sweConstantName];
      if (sweConstantVal === undefined) {
        throw new Error(
          `Swiss Ephemeris sabiti bulunamadı: ${meta.sweConstantName}`
        );
      }

      // Gezegenin sidereal boylamını ve hızını hesapla
      const calcResult = await sweCalcUtAsync(jdUt, sweConstantVal, baseFlags);

      const planetLongitude = calcResult.longitude;
      const planetSignInfo = degreesToSignAndSubdegree(planetLongitude);

      // Vedik "Whole Sign" (Tüm Burç) Ev Sistemi Hesaplaması:
      // Yükselen burç (ascendantSign) 1. ev kabul edilir.
      // Gezegenin bulunduğu burç (planetSignInfo.sign) ile yükselen burç arasındaki fark
      // bize gezegenin yerleştiği evi (1-12) verir.
      const planetHouse =
        ((planetSignInfo.sign - ascendantSign + 12) % 12) + 1;

      // Hız negatifse gezegen retrograddır (geri gidiyordur).
      // Rahu (Mean Node) ortalama hesaplandığı için hızı her zaman negatiftir ve daima retro kabul edilir.
      const isRetrograde = key === "rahu" ? true : calcResult.speed < 0;

      planets.push({
        key,
        nameTr: meta.nameTr,
        abbr: meta.abbr,
        longitude: planetLongitude,
        sign: planetSignInfo.sign,
        signNameTr: signNameTr(planetSignInfo.sign),
        degreeInSign: planetSignInfo.degreeInSign,
        house: planetHouse,
        retrograde: isRetrograde,
      });
    }

    // 11. Sonuçları birleştirip döndür
    return {
      input,
      location,
      julianDayUT: jdUt,
      ayanamsa,
      calculationMode,
      ascendant,
      planets,
    };
  } catch (error: any) {
    throw new Error(
      `Astrolojik harita hesaplanırken hata oluştu: ${error.message || error}`
    );
  }
}