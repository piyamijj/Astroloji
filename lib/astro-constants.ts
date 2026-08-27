/**
 * Vedik Doğum Haritası - Paylaşılan Sabitler
 *
 * Bu dosya hem sunucu tarafı hesaplama (lib/vedic-calc.ts) hem de istemci
 * tarafı harita çizimi (components/ChartSvg.tsx) tarafından kullanılır.
 * Böylece burç adları, gezegen kısaltmaları ve derece->burç dönüşüm mantığı
 * tek bir yerden yönetilir; sunucu ile arayüz asla birbirinden farklı
 * etiket/kısaltma kullanmaz.
 */

import type { PlanetKey } from "./astro-types";

/** 12 burcun Türkçe adları, Koç (1) - Balık (12) sırasıyla. */
export const ZODIAC_SIGNS_TR: string[] = [
  "Koç",
  "Boğa",
  "İkizler",
  "Yengeç",
  "Aslan",
  "Başak",
  "Terazi",
  "Akrep",
  "Yay",
  "Oğlak",
  "Kova",
  "Balık",
];

/**
 * Her gezegen/gölge gezegen için görünen ad, harita üzerindeki kısaltma ve
 * ilgili Swiss Ephemeris sabitinin ADI (gerçek sayısal değer değil; sayısal
 * değer sunucu tarafında `swisseph` modülü yüklendikten sonra bu isim
 * üzerinden okunur, örn. `swisseph["SE_SUN"]`). Bu sayede bu dosya swisseph'e
 * bağımlı olmadan hem sunucuda hem istemcide sorunsuz import edilebilir.
 */
export const PLANET_META: Record<
  PlanetKey,
  { nameTr: string; abbr: string; sweConstantName: string }
> = {
  sun: { nameTr: "Güneş", abbr: "Gü", sweConstantName: "SE_SUN" },
  moon: { nameTr: "Ay", abbr: "Ay", sweConstantName: "SE_MOON" },
  mars: { nameTr: "Mars", abbr: "Ma", sweConstantName: "SE_MARS" },
  mercury: { nameTr: "Merkür", abbr: "Me", sweConstantName: "SE_MERCURY" },
  jupiter: { nameTr: "Jüpiter", abbr: "Ju", sweConstantName: "SE_JUPITER" },
  venus: { nameTr: "Venüs", abbr: "Ve", sweConstantName: "SE_VENUS" },
  saturn: { nameTr: "Satürn", abbr: "Sa", sweConstantName: "SE_SATURN" },
  // Rahu, ortalama Ay Düğümü (Mean Node) üzerinden hesaplanır - Vedik astrolojide yaygın kabul.
  rahu: { nameTr: "Rahu", abbr: "Ra", sweConstantName: "SE_MEAN_NODE" },
  // Ketu, Swiss Ephemeris'te doğrudan bir gövde değildir; Rahu + 180° olarak türetilir.
  ketu: { nameTr: "Ketu", abbr: "Ke", sweConstantName: "SE_MEAN_NODE" },
};

/** Gezegenlerin harita/tablo üzerinde gösterilme sırası. */
export const PLANET_ORDER: PlanetKey[] = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
  "ketu",
];

/**
 * 0-360 arası bir sidereal boylam değerini burç numarasına (1-12) ve
 * burç içindeki dereceye (0-30) çevirir.
 */
export function degreesToSignAndSubdegree(longitude: number): {
  sign: number;
  degreeInSign: number;
} {
  const normalized = ((longitude % 360) + 360) % 360;
  const signIndex0 = Math.floor(normalized / 30); // 0-11
  const degreeInSign = normalized - signIndex0 * 30;
  return { sign: signIndex0 + 1, degreeInSign };
}

/** Verilen burç numarasının (1-12) Türkçe adını döndürür. */
export function signNameTr(sign: number): string {
  const idx = ((sign - 1) % 12 + 12) % 12;
  return ZODIAC_SIGNS_TR[idx];
}