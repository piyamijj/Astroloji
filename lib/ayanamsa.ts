/**
 * Lahiri (Chitra Paksha) Ayanamsa - Yaklaşık Hesaplama Modülü
 *
 * BU MODÜL SADECE "saf JavaScript" yedek (fallback) hesaplama yolunda kullanılır
 * (bkz. lib/vedic-calc.ts). Uygulamanın birincil (asıl) hesaplama motoru, native
 * 'swisseph' (Swiss Ephemeris) kütüphanesidir ve gerçek presesyon (ekinoksların
 * gerileme) teorisine dayanan TAM HASSASİYETLİ Lahiri ayanamsa değerini doğrudan
 * `swisseph.swe_get_ayanamsa_ut()` üzerinden hesaplar.
 *
 * Ancak 'swisseph' bir native (C/C++) eklenti olduğundan bazı serverless
 * ortamlarda (örneğin Vercel'in derleme ortamında, Python 3.12+'ta `distutils`
 * modülünün kaldırılmış olması nedeniyle `node-gyp` derlemesi başarısız olabilir)
 * hiç kurulamayabilir. Bu durumda uygulama otomatik olarak saf JavaScript tabanlı
 * bir alternatif motora (`circular-natal-horoscope-js`) düşer; ancak bu kütüphane
 * yalnızca TROPİKAL (Batı astrolojisi) gezegen konumlarını hesaplayabildiği için,
 * sidereal (Vedik) konuma çevirmek amacıyla ayanamsa değerinin ayrı olarak
 * hesaplanması gerekir. İşte bu dosya tam olarak bu ihtiyacı karşılar.
 *
 * ÖNEMLİ - DOĞRULUK NOTU:
 * Aşağıdaki fonksiyon, gerçek Lahiri ayanamsasının yıllar içindeki değişimini
 * BİRİNCİ DERECE (doğrusal/lineer) bir yaklaşımla modeller:
 *
 *     ayanamsa (derece) = 23.85 + 0.0139 * (ondalık_yıl - 2000)
 *
 * Bu formül, Lahiri ayanamsasının 2000 yılı başı (J2000.0) civarındaki değerini
 * (~23°51′, yani ~23.85°) ve ekinoksların presesyon hızını (~50.2 yay saniyesi/yıl,
 * yani ~0.0139°/yıl) temel alan, yaygın olarak yayınlanmış ve birçok açık kaynak
 * Vedik astroloji uygulamasında kullanılan pratik bir yaklaşıklamadır (yaklaşık
 * kaynak: roxyapi.com "Ayanamsa Explained for Developers" ve N.C. Lahiri'nin
 * J2000.0 için yayınlanan ~23°51′ referans değeri).
 *
 * GERÇEK Lahiri ayanamsa, sabit bir doğrusal artıştan ZİYADE, Dünya'nın
 * ekseninin gerçek presesyon teorisine (ör. IAU/Williams presesyon modelleri)
 * göre hesaplanır; bu teori yüksek dereceli (polinomsal, hatta periyodik)
 * terimler içerir. Bu yüzden yukarıdaki doğrusal yaklaşım, 1900-2100 yılları
 * arasında gerçek değerden yaklaşık BİR YAY DAKİKASI (1/60 derece) mertebesinde
 * sapabilir. Bu sapma, bir gezegenin burç veya ev sınırına yalnızca birkaç yay
 * dakikası mesafede olduğu nadir durumlar dışında, doğum haritası yorumlamasını
 * pratikte etkilemez.
 *
 * Maksimum hassasiyet (yay saniyesi mertebesinde, gerçek presesyon teorisine
 * dayalı) isteyen kullanıcılar, uygulamayı 'swisseph' native eklentisinin
 * sorunsuz derlenebildiği bir ortamda (yerel bilgisayar, kendi VPS'iniz, Docker
 * konteyneri vb.) çalıştırmalı ve `FORCE_NATIVE_SWISSEPH=true` ortam
 * değişkenini ayarlamalıdır - bu durumda uygulama bu yaklaşık formülü hiç
 * kullanmaz, doğrudan gerçek Swiss Ephemeris hesaplamasına geçer.
 */

/**
 * Verilen UT (Evrensel Zaman) bazlı Julian Günü için, doğrusal yaklaşıma dayalı
 * Lahiri (Chitra Paksha) ayanamsa değerini DERECE cinsinden döndürür.
 *
 * @param julianDayUT UT bazlı Julian Günü (örn. swisseph.swe_julday veya
 *                    eşdeğer bir hesaplamadan elde edilen değer).
 * @returns Yaklaşık Lahiri ayanamsa değeri, derece cinsinden (0-360 aralığı
 *          dışına taşmaz; günümüz tarihleri için tipik olarak 20-30 derece
 *          arasında bir değer döner).
 */
export function lahiriAyanamsaApprox(julianDayUT: number): number {
  // Julian Günü'nden ondalık (decimal) yılı türet.
  // J2000.0 epoku (2000-01-01 12:00 TT) Julian Günü 2451545.0'a karşılık gelir.
  // Bir yılı ortalama 365.25 gün olarak kabul ediyoruz (ayanamsa'nın çok yavaş
  // değişimi göz önüne alındığında bu basitleştirme hassasiyeti etkilemez).
  const decimalYear = 2000 + (julianDayUT - 2451545.0) / 365.25;

  // N.C. Lahiri'nin J2000.0 referans değeri (~23.85°) ve yıllık presesyon
  // artışı (~0.0139°/yıl) temel alınarak doğrusal olarak hesaplanır.
  const REFERENCE_AYANAMSA_AT_YEAR_2000 = 23.85;
  const ANNUAL_PRECESSION_RATE_DEGREES = 0.0139;

  const ayanamsa =
    REFERENCE_AYANAMSA_AT_YEAR_2000 +
    ANNUAL_PRECESSION_RATE_DEGREES * (decimalYear - 2000);

  return ayanamsa;
}