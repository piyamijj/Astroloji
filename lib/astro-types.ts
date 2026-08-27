/**
 * Vedik Doğum Haritası - Paylaşılan TypeScript Tipleri
 *
 * Bu dosyadaki tipler hem sunucu tarafında (app/api/calculate/route.ts,
 * lib/vedic-calc.ts) hem de istemci tarafında (components/AstroForm.tsx,
 * components/ChartSvg.tsx, app/page.tsx) ortak olarak kullanılır. Böylece
 * API'nin ürettiği veri şekli ile arayüzün beklediği veri şekli her zaman
 * birebir uyumlu kalır.
 */

/** Kullanıcının doğum formunda girdiği ham veriler. */
export interface BirthFormInput {
  /** Kullanıcının adı (harita başlığında gösterilir). */
  name: string;
  /** Doğum tarihi, "GG/AA/YYYY" formatında (örn. "24/03/1995"). */
  birthDate: string;
  /** Doğum saati, 24 saatlik "SS:DD" formatında (örn. "14:30"). */
  birthTime: string;
  /** Doğum yeri şehir adı (geocoding ile enlem/boylam/saat dilimine çevrilir). */
  city: string;
}

/** Hesaplamada kullanılan 9 gezegen/gölge gezegen için sabit anahtarlar. */
export type PlanetKey =
  | "sun"
  | "moon"
  | "mars"
  | "mercury"
  | "jupiter"
  | "venus"
  | "saturn"
  | "rahu"
  | "ketu";

/** Tek bir gezegenin sidereal (Lahiri ayanamsa) konum bilgisi. */
export interface PlanetPosition {
  /** Sabit dahili anahtar (örn. "sun"). */
  key: PlanetKey;
  /** Türkçe görünen ad (örn. "Güneş"). */
  nameTr: string;
  /** Harita üzerinde kullanılan kısaltma (örn. "Gü", "Ay", "Ra"). */
  abbr: string;
  /** Sidereal boylam, 0-360 derece aralığında (Koç 0° başlangıç kabul edilir). */
  longitude: number;
  /** Burç numarası, 1 (Koç) ile 12 (Balık) arasında. */
  sign: number;
  /** Burcun Türkçe adı (örn. "Koç"). */
  signNameTr: string;
  /** Burç içindeki derece, 0-30 aralığında. */
  degreeInSign: number;
  /** Ev numarası (whole-sign / tüm burç ev sistemi), 1-12 arasında. */
  house: number;
  /** Gezegen retro (geri gidiyor) mu? Rahu ve Ketu gelenek gereği daima retro kabul edilir. */
  retrograde: boolean;
}

/** Yükselen (Ascendant / Lagna) konum bilgisi. */
export interface AscendantPosition {
  /** Sidereal boylam, 0-360 derece aralığında. */
  longitude: number;
  /** Burç numarası, 1 (Koç) ile 12 (Balık) arasında. */
  sign: number;
  /** Burcun Türkçe adı. */
  signNameTr: string;
  /** Burç içindeki derece, 0-30 aralığında. */
  degreeInSign: number;
}

/** Geocoding servisinden çözümlenen konum bilgisi. */
export interface ResolvedLocation {
  /** Enlem (derece, ondalık). */
  latitude: number;
  /** Boylam (derece, ondalık). */
  longitude: number;
  /** IANA saat dilimi adı (örn. "Europe/Istanbul"). */
  timezone: string;
  /** Geocoding servisinin döndürdüğü, kullanıcıya gösterilebilir yer adı. */
  resolvedName: string;
}

/**
 * Hesaplamanın hangi efemeris motoru/moduyla yapıldığı:
 * - "moshier": native Swiss Ephemeris (swisseph), gömülü Moshier yarı-analitik modu.
 * - "swisseph-file": native Swiss Ephemeris (swisseph), indirilmiş .se1 veri dosyalarıyla.
 * - "pure-js": native 'swisseph' bu ortamda yüklenemediği için devreye giren, tamamen
 *   JavaScript ile yazılmış yedek motor ('circular-natal-horoscope-js' + yaklaşık
 *   Lahiri ayanamsa düzeltmesi). Bkz. lib/ayanamsa.ts.
 */
export type CalculationMode = "moshier" | "swisseph-file" | "pure-js";

/** /api/calculate uç noktasının başarılı yanıtı: eksiksiz doğum haritası verisi. */
export interface ChartResult {
  /** Kullanıcının form üzerinden girdiği ham veriler (aynen geri yansıtılır). */
  input: BirthFormInput;
  /** Şehir isminden çözümlenen enlem/boylam/saat dilimi bilgisi. */
  location: ResolvedLocation;
  /** Hesaplamada kullanılan UT (Evrensel Zaman) bazlı Julian Günü. */
  julianDayUT: number;
  /** Hesaplama anındaki Lahiri ayanamsa değeri (derece). */
  ayanamsa: number;
  /** Kullanılan efemeris hesaplama modu ("moshier" veya "swisseph-file"). */
  calculationMode: CalculationMode;
  /** Yükselen (Lagna) konumu. */
  ascendant: AscendantPosition;
  /** 9 gezegenin/gölge gezegenin sidereal konum listesi. */
  planets: PlanetPosition[];
}

/** /api/calculate uç noktasının hata yanıtı. */
export interface ApiErrorResponse {
  /** Kullanıcıya gösterilebilir, Türkçe kısa hata mesajı. */
  error: string;
  /** Geliştirici/loglama amaçlı, opsiyonel teknik ayrıntı. */
  detail?: string;
}