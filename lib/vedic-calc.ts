import { DateTime } from "luxon";
import type {
  BirthFormInput,
  ChartResult,
  ResolvedLocation,
  PlanetPosition,
  AscendantPosition,
  CalculationMode,
  PlanetKey,
} from "./astro-types";
import {
  PLANET_META,
  PLANET_ORDER,
  degreesToSignAndSubdegree,
  signNameTr,
} from "./astro-constants";
import { lahiriAyanamsaApprox } from "./ayanamsa";

/**
 * Türkçe küçük harfli ülke adlarını Open-Meteo'nun daha iyi tanıdığı
 * İngilizce/orijinal karşılıklarına çevirmek için kullanılan küçük bir
 * eşleme tablosu. Kapsamlı bir liste değildir; en sık karşılaşılan
 * ülkeleri kapsar ve gerektiğinde genişletilebilir.
 */
const TR_COUNTRY_NAME_MAP: Record<string, string> = {
  almanya: "Germany",
  fransa: "France",
  ingiltere: "United Kingdom",
  "i̇ngiltere": "United Kingdom",
  "birleşik krallık": "United Kingdom",
  italya: "Italy",
  "i̇talya": "Italy",
  ispanya: "Spain",
  hollanda: "Netherlands",
  belçika: "Belgium",
  avusturya: "Austria",
  isviçre: "Switzerland",
  portekiz: "Portugal",
  yunanistan: "Greece",
  rusya: "Russia",
  amerika: "United States",
  abd: "United States",
  kanada: "Canada",
  japonya: "Japan",
  çin: "China",
  hindistan: "India",
  polonya: "Poland",
  çekya: "Czechia",
  macaristan: "Hungary",
  romanya: "Romania",
  bulgaristan: "Bulgaria",
  ukrayna: "Ukraine",
  i̇sveç: "Sweden",
  isveç: "Sweden",
  norveç: "Norway",
  danimarka: "Denmark",
  finlandiya: "Finland",
  irlanda: "Ireland",
  avustralya: "Australia",
  brezilya: "Brazil",
  meksika: "Mexico",
  mısır: "Egypt",
  "suudi arabistan": "Saudi Arabia",
  "birleşik arap emirlikleri": "United Arab Emirates",
  azerbaycan: "Azerbaijan",
  gürcistan: "Georgia",
  iran: "Iran",
  "i̇ran": "Iran",
};

/**
 * Kullanıcının girdiği ham şehir metninden, Open-Meteo Geocoding API'sine
 * sırayla denenecek aday sorgu listesini üretir. Amaç, "Bamberg almanya"
 * gibi şehir+ülke birleşik ve Türkçe küçük harfli ülke adı içeren
 * girdilerin de doğru şekilde çözümlenebilmesidir.
 */
function buildGeocodeCandidates(rawCity: string): string[] {
  const trimmed = rawCity.trim().replace(/\s+/g, " ");

  // ÖNCELİK SIRASI ÖNEMLİDİR: bir ülke ipucu tespit edilebiliyorsa, ülkeyle
  // nitelenmiş adaylar (ör. "Bamberg, Germany") DAİMA salt şehir adından
  // (ör. "Bamberg") ÖNCE denenmelidir. Aksi halde, dünyada aynı isimde
  // birden fazla şehir olduğunda (ör. ABD'de de bir "Bamberg" vardır),
  // ülke ipucu göz ardı edilip yanlış/alakasız şehir bulunabilir.
  const qualifiedCandidates: string[] = [];
  const fallbackCandidates: string[] = [trimmed];

  const lookupCountry = (text: string): string | undefined =>
    TR_COUNTRY_NAME_MAP[text.toLocaleLowerCase("tr")];

  // 1) Virgülle ayrılmış biçim: "Bamberg, Almanya"
  if (trimmed.includes(",")) {
    const segments = trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const cityPart = segments[0];
    const countryRaw = segments.slice(1).join(" ");
    if (cityPart) {
      const mappedCountry = lookupCountry(countryRaw);
      if (mappedCountry) {
        qualifiedCandidates.push(`${cityPart}, ${mappedCountry}`);
      } else if (countryRaw) {
        qualifiedCandidates.push(`${cityPart}, ${countryRaw}`);
      }
      fallbackCandidates.push(cityPart);
    }
  }

  // 2) Boşlukla ayrılmış biçim: "Bamberg almanya" (şehir + bitişik ülke adı)
  const tokens = trimmed.split(" ").filter(Boolean);
  if (tokens.length > 1) {
    // Son iki kelime bir ülke adı mı? (ör. "... suudi arabistan") — önce bunu dene,
    // çünkü iki kelimelik ülke adları tek kelimelik olası eşleşmelerden daha spesifiktir.
    if (tokens.length > 2) {
      const lastTwoWords = tokens.slice(-2).join(" ");
      const cityOnlyLastTwo = tokens.slice(0, -2).join(" ");
      const mappedLastTwo = lookupCountry(lastTwoWords);
      if (mappedLastTwo) {
        qualifiedCandidates.push(`${cityOnlyLastTwo}, ${mappedLastTwo}`);
        fallbackCandidates.push(cityOnlyLastTwo);
      }
    }

    // Son tek kelime bir ülke adı mı? (ör. "... almanya")
    const lastWord = tokens[tokens.length - 1];
    const cityOnlyLastWord = tokens.slice(0, -1).join(" ");
    const mappedLastWord = lookupCountry(lastWord);
    if (mappedLastWord) {
      qualifiedCandidates.push(`${cityOnlyLastWord}, ${mappedLastWord}`);
      fallbackCandidates.push(cityOnlyLastWord);
    }

    // 3) Son çare: yalnızca ilk kelime (çoğu şehir adı tek kelimedir)
    fallbackCandidates.push(tokens[0]);
  }

  // Önce ülkeyle nitelenmiş adaylar, ardından salt şehir adı denemeleri.
  // Boş/duplike adayları temizle, sırayı koru.
  const seen = new Set<string>();
  const uniqueCandidates: string[] = [];
  for (const candidate of [...qualifiedCandidates, ...fallbackCandidates]) {
    const key = candidate.toLocaleLowerCase("tr");
    if (candidate.length > 0 && !seen.has(key)) {
      seen.add(key);
      uniqueCandidates.push(candidate);
    }
  }
  return uniqueCandidates;
}

/**
 * Open-Meteo Geocoding API'sine tek bir sorgu gönderir. Ağ/HTTP hatasında
 * fırlatır; sonuç bulunamadığında (0 sonuç) `null` döner (hata fırlatmaz) —
 * böylece çağıran kod farklı adaylarla tekrar deneyebilir.
 */
async function fetchGeocodeCandidate(query: string): Promise<any | null> {
  const encodedCity = encodeURIComponent(query);
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodedCity}&count=1&language=tr&format=json`;

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
    return null;
  }

  return data.results[0];
}

/**
 * Verilen şehir adını ücretsiz Open-Meteo Geocoding API kullanarak
 * enlem, boylam, saat dilimi (IANA) ve tam yer adına çözümler.
 *
 * Dayanıklılık: kullanıcı "Bamberg almanya" gibi şehir+ülke birleşik ve/veya
 * Türkçe küçük harfli ülke adı içeren bir metin girebilir; Open-Meteo bu tür
 * birleşik metinleri doğrudan tek bir yer adı gibi arayıp bulamayabilir.
 * Bu yüzden `buildGeocodeCandidates` ile birkaç alternatif sorgu üretilir
 * (örn. sadece şehir kısmı, şehir + İngilizce ülke adı, sadece ilk kelime)
 * ve ilk sonuç veren aday kullanılır.
 *
 * @param city Kullanıcının girdiği şehir adı (örn. "İstanbul", "Bamberg almanya")
 * @returns Çözümlenmiş konum bilgileri (ResolvedLocation)
 */
export async function geocodeCity(city: string): Promise<ResolvedLocation> {
  if (!city || city.trim().length < 2) {
    throw new Error("Lütfen geçerli bir şehir adı girin (en az 2 karakter).");
  }

  const candidates = buildGeocodeCandidates(city);

  try {
    let result: any | null = null;

    for (const candidate of candidates) {
      result = await fetchGeocodeCandidate(candidate);
      if (result) break;
    }

    if (!result) {
      throw new Error(
        `"${city}" şehri bulunamadı. Lütfen yazımı kontrol edin veya daha büyük/bilinen bir şehir adı deneyin (ör. sadece şehir adı: "Bamberg").`
      );
    }

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
 * 'swisseph' native eklentisini yüklemeyi dener. Eklenti bu ortamda mevcut
 * değilse veya (Vercel gibi serverless ortamlarda olduğu gibi) native derleme
 * başarısız olduğu için hiç kurulamamışsa, hata fırlatmak yerine `null` döner.
 * Böylece çağıran kod, gerçek Swiss Ephemeris motoru mu yoksa saf JavaScript
 * yedek motoru mu kullanılacağına burada karar verebilir.
 */
function tryLoadSwisseph(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("swisseph");
  } catch {
    return null;
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
  // 1. Şehir adından enlem, boylam ve saat dilimini çözümlüyoruz (her iki motor için de ortak adım)
  const location = await geocodeCity(input.city);

  // 2. Tarih ve saati Luxon ile ayrıştırıyoruz
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

  const forceNativeOnly = process.env.FORCE_NATIVE_SWISSEPH === "true";
  const swisseph = tryLoadSwisseph();

  if (swisseph) {
    // Birincil motor: native Swiss Ephemeris mevcut ve yüklendi.
    return calculateWithSwisseph(swisseph, input, location, localDateTime);
  }

  if (forceNativeOnly) {
    throw new Error(
      "FORCE_NATIVE_SWISSEPH=true olarak ayarlanmış, ancak 'swisseph' native kütüphanesi " +
        "bu ortamda yüklenemedi (muhtemelen native derleme başarısız oldu veya paket kurulu değil). " +
        "Bu değişkeni kaldırırsanız uygulama otomatik olarak saf JavaScript yedek motoruna geçer."
    );
  }

  // 'swisseph' bu ortamda yüklenemedi (ör. Vercel serverless derleme ortamında native
  // eklenti derlenemediği için 'optionalDependencies' altında atlanmış olabilir).
  // Bu durumda otomatik olarak saf JavaScript tabanlı yedek motora geçilir.
  return calculateWithPureJsFallback(input, location, localDateTime);
}

/**
 * Native 'swisseph' kütüphanesi ile TAM HASSASİYETLİ hesaplama yapar.
 * Ayanamsa olarak Lahiri, efemeris modu olarak (ortam değişkenine göre) gerçek
 * Swiss Ephemeris veri dosyaları veya gömülü Moshier yarı-analitik motoru kullanılır.
 */
async function calculateWithSwisseph(
  swisseph: any,
  input: BirthFormInput,
  location: ResolvedLocation,
  localDateTime: DateTime
): Promise<ChartResult> {
  // Evrensel Zaman (UTC) bileşenlerini alıyoruz (Swiss Ephemeris UT hesaplaması yapar)
  const utcDateTime = localDateTime.toUTC();
  const year = utcDateTime.year;
  const month = utcDateTime.month;
  const day = utcDateTime.day;
  // Saati ondalık (decimal) saate çeviriyoruz (örn. 14:30 -> 14.5)
  const hourDecimal =
    utcDateTime.hour + utcDateTime.minute / 60 + utcDateTime.second / 3600;

  try {
    // Julian Günü (UT) hesapla
    const jdUt = swisseph.swe_julday(
      year,
      month,
      day,
      hourDecimal,
      swisseph.SE_GREG_CAL
    );

    // Efemeris veri yolunu (Ephemeris Path) ayarla
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

    // Ayanamsa'yı 'Lahiri' (Chitra Paksha) olarak ayarla
    // SE_SIDM_LAHIRI = 0'dır. İkinci ve üçüncü parametreler t0 ve ayan_t0 olup Lahiri için 0,0 geçilir.
    swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

    // Hesaplama anındaki Lahiri ayanamsa değerini derece cinsinden oku
    const ayanamsa = swisseph.swe_get_ayanamsa_ut(jdUt);

    // Promisified Swiss Ephemeris API sarmalayıcıları
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
            resolve({ ascendant: result.ascendant });
          } else {
            reject(new Error("Yükselen (Ascendant) hesaplanırken boş sonuç döndü."));
          }
        });
      });
    };

    // Yükselen (Ascendant / Lagna) hesaplama
    // 'P' Placidus ev sistemini temsil eder, ancak Vedik astrolojide ev sınırları yerine
    // sadece Yükselen derecesi (Ascendant) baz alınarak "Whole Sign" (Tüm Burç) ev sistemi kurulur.
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

    // Gezegenlerin konumlarını hesaplama
    const planets: PlanetPosition[] = [];

    for (const key of PLANET_ORDER) {
      const meta = PLANET_META[key];

      if (key === "ketu") {
        const rahuPos = planets.find((p) => p.key === "rahu");
        if (!rahuPos) {
          throw new Error("Ketu hesaplanırken Rahu konumu bulunamadı.");
        }

        const ketuLongitude = (rahuPos.longitude + 180) % 360;
        const ketuSignInfo = degreesToSignAndSubdegree(ketuLongitude);
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
          retrograde: true,
        });
        continue;
      }

      const sweConstantVal = swisseph[meta.sweConstantName];
      if (sweConstantVal === undefined) {
        throw new Error(
          `Swiss Ephemeris sabiti bulunamadı: ${meta.sweConstantName}`
        );
      }

      const calcResult = await sweCalcUtAsync(jdUt, sweConstantVal, baseFlags);

      const planetLongitude = calcResult.longitude;
      const planetSignInfo = degreesToSignAndSubdegree(planetLongitude);

      const planetHouse =
        ((planetSignInfo.sign - ascendantSign + 12) % 12) + 1;

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

/**
 * Saf JavaScript Yedek Motor - 'circular-natal-horoscope-js' kullanarak hesaplama yapar.
 *
 * NE ZAMAN DEVREYE GİRER: 'swisseph' native eklentisi bu ortamda yüklenemediğinde
 * (örn. Vercel serverless derleme ortamında Python 3.12+ 'distutils' modülünün
 * kaldırılmış olması nedeniyle node-gyp derlemesi başarısız olur ve paket
 * 'optionalDependencies' altında olduğu için sessizce atlanır).
 *
 * NASIL ÇALIŞIR: 'circular-natal-horoscope-js' yalnızca TROPİKAL (Batı astrolojisi)
 * gezegen konumlarını hesaplayabilir; native bir bağımlılığı yoktur (saf JS,
 * içeride 'moment', 'moment-timezone' ve 'tz-lookup' kullanır). Vedik (sidereal)
 * konuma çevirmek için, hesaplanan her tropikal boylamdan lib/ayanamsa.ts
 * içindeki yaklaşık Lahiri ayanamsa değeri çıkarılır. Ardından tüm burç/ev
 * mantığı (whole-sign ev sistemi, Ketu = Rahu + 180°) native motorla BİREBİR
 * AYNI ŞEKİLDE uygulanır - böylece API sözleşmesi ve arayüz hiç değişmez.
 *
 * DOĞRULUK: Gezegen konumlarının kendisi (tropikal boylamlar) gerçek efemeris
 * hesaplamasından gelir ve hassastır; tek yaklaşıklık, ayanamsa değerinin
 * doğrusal formülle hesaplanmasıdır (bkz. lib/ayanamsa.ts - yaklaşık 1 yay
 * dakikası mertebesinde sapma).
 */
async function calculateWithPureJsFallback(
  input: BirthFormInput,
  location: ResolvedLocation,
  localDateTime: DateTime
): Promise<ChartResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Origin, Horoscope } = require("circular-natal-horoscope-js");

    // Origin, kendi içinde enlem/boylamdan saat dilimini (tz-lookup) türetip
    // yerel saati UTC'ye çevirir; bu yüzden burada Luxon'la zaten doğru saat
    // dilimine göre ayrıştırılmış YEREL tarih/saat bileşenlerini veriyoruz.
    const origin = new Origin({
      year: localDateTime.year,
      month: localDateTime.month - 1, // Origin'de ay 0 (Ocak) ile 11 (Aralık) arasındadır
      date: localDateTime.day,
      hour: localDateTime.hour,
      minute: localDateTime.minute,
      second: localDateTime.second,
      latitude: location.latitude,
      longitude: location.longitude,
    });

    const horoscope: any = new Horoscope({
      origin,
      houseSystem: "whole-sign",
      zodiac: "tropical", // Sidereal'e çevirimi kendimiz, gerçek Lahiri ayanamsa ile yapacağız
      aspectPoints: [],
      aspectWithPoints: [],
      aspectTypes: [],
    });

    // Origin sınıfı, oluşturulurken UT bazlı Julian Günü'nü zaten hesaplar.
    const jdUt: number = origin.julianDate;

    // Bu anın yaklaşık Lahiri ayanamsa değeri (derece)
    const ayanamsa = lahiriAyanamsaApprox(jdUt);

    const toSidereal = (tropicalLongitude: number): number =>
      ((tropicalLongitude - ayanamsa) % 360 + 360) % 360;

    // Yükselen (Ascendant)
    const ascTropical: number =
      horoscope.Ascendant.ChartPosition.Ecliptic.DecimalDegrees;
    const ascSidereal = toSidereal(ascTropical);
    const ascSignInfo = degreesToSignAndSubdegree(ascSidereal);
    const ascendant: AscendantPosition = {
      longitude: ascSidereal,
      sign: ascSignInfo.sign,
      signNameTr: signNameTr(ascSignInfo.sign),
      degreeInSign: ascSignInfo.degreeInSign,
    };
    const ascendantSign = ascendant.sign;

    // 'circular-natal-horoscope-js' içindeki gövde anahtarları bizim PlanetKey'lerimizle birebir aynıdır
    // (rahu/ketu hariç - onlar CelestialPoints üzerinden ayrıca işlenir).
    const directBodyKeys: Exclude<PlanetKey, "rahu" | "ketu">[] = [
      "sun",
      "moon",
      "mars",
      "mercury",
      "jupiter",
      "venus",
      "saturn",
    ];

    const planets: PlanetPosition[] = [];

    for (const key of directBodyKeys) {
      const meta = PLANET_META[key];
      const body = horoscope.CelestialBodies[key];
      if (!body) {
        throw new Error(`Gezegen konumu bulunamadı: ${key}`);
      }

      const tropicalLongitude: number = body.ChartPosition.Ecliptic.DecimalDegrees;
      const siderealLongitude = toSidereal(tropicalLongitude);
      const signInfo = degreesToSignAndSubdegree(siderealLongitude);
      const house = ((signInfo.sign - ascendantSign + 12) % 12) + 1;

      planets.push({
        key,
        nameTr: meta.nameTr,
        abbr: meta.abbr,
        longitude: siderealLongitude,
        sign: signInfo.sign,
        signNameTr: signNameTr(signInfo.sign),
        degreeInSign: signInfo.degreeInSign,
        house,
        retrograde: Boolean(body.isRetrograde),
      });
    }

    // Rahu (Kuzey Ay Düğümü / Ortalama Ay Düğümü)
    const northNode = horoscope.CelestialPoints.northnode;
    const rahuTropical: number = northNode.ChartPosition.Ecliptic.DecimalDegrees;
    const rahuSidereal = toSidereal(rahuTropical);
    const rahuSignInfo = degreesToSignAndSubdegree(rahuSidereal);
    const rahuHouse = ((rahuSignInfo.sign - ascendantSign + 12) % 12) + 1;

    planets.push({
      key: "rahu",
      nameTr: PLANET_META.rahu.nameTr,
      abbr: PLANET_META.rahu.abbr,
      longitude: rahuSidereal,
      sign: rahuSignInfo.sign,
      signNameTr: signNameTr(rahuSignInfo.sign),
      degreeInSign: rahuSignInfo.degreeInSign,
      house: rahuHouse,
      retrograde: true, // Rahu gelenek gereği daima retro kabul edilir
    });

    // Ketu (Güney Ay Düğümü) - Rahu'nun tam 180° karşısı
    const ketuSidereal = (rahuSidereal + 180) % 360;
    const ketuSignInfo = degreesToSignAndSubdegree(ketuSidereal);
    const ketuHouse = ((ketuSignInfo.sign - ascendantSign + 12) % 12) + 1;

    planets.push({
      key: "ketu",
      nameTr: PLANET_META.ketu.nameTr,
      abbr: PLANET_META.ketu.abbr,
      longitude: ketuSidereal,
      sign: ketuSignInfo.sign,
      signNameTr: signNameTr(ketuSignInfo.sign),
      degreeInSign: ketuSignInfo.degreeInSign,
      house: ketuHouse,
      retrograde: true, // Ketu gelenek gereği daima retro kabul edilir
    });

    // Gezegenleri PLANET_ORDER sırasına göre yeniden diz (Rahu/Ketu sona eklendiği için)
    const orderedPlanets = PLANET_ORDER.map(
      (k) => planets.find((p) => p.key === k)!
    );

    return {
      input,
      location,
      julianDayUT: jdUt,
      ayanamsa,
      calculationMode: "pure-js",
      ascendant,
      planets: orderedPlanets,
    };
  } catch (error: any) {
    throw new Error(
      `Astrolojik harita (saf JS yedek motoru ile) hesaplanırken hata oluştu: ${
        error.message || error
      }`
    );
  }
}
