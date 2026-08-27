/**
 * Vedik Doğum Haritası - Kuzey Hindistan (North Indian / Diamond) Harita Geometrisi
 *
 * Bu modül, D1 (Rasi) haritasının klasik "baklava/elmas" (diamond) çiziminin
 * saf geometrisini içerir. Sadece components/ChartSvg.tsx tarafından kullanılır
 * ve herhangi bir astrolojik hesaplama YAPMAZ - sadece sabit, 400x400'lük bir
 * SVG viewBox içinde 12 evin köşe koordinatlarını ve etiket konumlarını üretir.
 *
 * Geometri mantığı:
 * - 400x400 bir kare çizilir (köşeler A, B, C, D).
 * - Karenin iki köşegeni (A-C ve B-D) çizilir; bu köşegenler merkezde (O) kesişir.
 * - Kenar orta noktalarını birleştiren bir iç elmas (M1-M2-M3-M4) çizilir.
 * - Köşegenler bu iç elmasın kenarlarını 4 noktada (P1-P4) keser.
 * - Bu çizgilerin birleşimi, 4 "kendra" (köşe) evi olan baklava/elmas uçlarını
 *   (1, 4, 7, 10. evler) ve her köşede kalan alanı ikiye bölen 8 üçgen evi
 *   (2, 3, 5, 6, 8, 9, 11, 12. evler) oluşturur - toplam 12 ev.
 *
 * Ev numaralandırması, geleneksel Kuzey Hindistan haritasında olduğu gibi
 * 1. evden (üst orta baklava dilimi = Yükselen) başlayıp SAAT YÖNÜNDE ilerler.
 */

export const CHART_VIEWBOX_SIZE = 400;

export type Point = [number, number];

// --- Temel referans noktaları -------------------------------------------------

/** Kare köşeleri. */
const A: Point = [0, 0]; // sol üst
const B: Point = [400, 0]; // sağ üst
const C: Point = [400, 400]; // sağ alt
const D: Point = [0, 400]; // sol alt

/** Kenar orta noktaları (iç elmasın köşeleri). */
const M1: Point = [200, 0]; // üst orta
const M2: Point = [400, 200]; // sağ orta
const M3: Point = [200, 400]; // alt orta
const M4: Point = [0, 200]; // sol orta

/** Merkez (her iki köşegenin de kesişim noktası). */
const O: Point = [200, 200];

/**
 * Köşegenlerin iç elmasın kenarlarını kestiği 4 nokta.
 * P1: köşegen B-D ile kenar M1-M2'nin kesişimi.
 * P2: köşegen A-C ile kenar M2-M3'ün kesişimi.
 * P3: köşegen B-D ile kenar M3-M4'ün kesişimi.
 * P4: köşegen A-C ile kenar M4-M1'in kesişimi.
 */
const P1: Point = [300, 100];
const P2: Point = [300, 300];
const P3: Point = [100, 300];
const P4: Point = [100, 100];

/**
 * 12 evin köşe noktaları. points[0] her zaman "dış referans köşesi"dir:
 * - Kendra evleri (1, 4, 7, 10) için bu, baklavanın dış ucudur (M1/M2/M3/M4).
 * - Üçgen evler için bu, bitişik olduğu karenin köşesidir (A/B/C/D).
 * Sıralama, 1. evden başlayıp saat yönünde 12. eve kadar devam eder.
 */
export interface HousePolygon {
  /** Ev numarası, 1-12. */
  house: number;
  /** Poligonun köşe noktaları; points[0] = dış referans köşesi. */
  points: Point[];
}

export const HOUSE_POLYGONS: HousePolygon[] = [
  { house: 1, points: [M1, P1, O, P4] }, // üst baklava (kendra)
  { house: 2, points: [B, P1, M1] }, // sağ üst köşenin üst üçgeni
  { house: 3, points: [B, M2, P1] }, // sağ üst köşenin alt üçgeni
  { house: 4, points: [M2, P2, O, P1] }, // sağ baklava (kendra)
  { house: 5, points: [C, P2, M2] }, // sağ alt köşenin üst üçgeni
  { house: 6, points: [C, M3, P2] }, // sağ alt köşenin alt üçgeni
  { house: 7, points: [M3, P3, O, P2] }, // alt baklava (kendra)
  { house: 8, points: [D, P3, M3] }, // sol alt köşenin üst üçgeni
  { house: 9, points: [D, M4, P3] }, // sol alt köşenin alt üçgeni
  { house: 10, points: [M4, P4, O, P3] }, // sol baklava (kendra)
  { house: 11, points: [A, M4, P4] }, // sol üst köşenin alt üçgeni
  { house: 12, points: [A, P4, M1] }, // sol üst köşenin üst üçgeni
];

/** Dış kare çerçevesinin SVG path 'd' değeri. */
export const OUTER_SQUARE_PATH_D = `M ${A[0]} ${A[1]} L ${B[0]} ${B[1]} L ${C[0]} ${C[1]} L ${D[0]} ${D[1]} Z`;

/** İç köşegenlerin ve elmasın referans çizgileri (görsel zemin çizgileri için). */
export const REFERENCE_LINES: { from: Point; to: Point }[] = [
  { from: A, to: C }, // köşegen
  { from: B, to: D }, // köşegen
  { from: M1, to: M2 }, // iç elmas kenarı
  { from: M2, to: M3 }, // iç elmas kenarı
  { from: M3, to: M4 }, // iç elmas kenarı
  { from: M4, to: M1 }, // iç elmas kenarı
];

// --- Yardımcı fonksiyonlar -----------------------------------------------------

/** Bir poligonun köşe noktalarının aritmetik ortalamasını (centroid) döndürür. */
export function getHouseCentroid(points: Point[]): Point {
  const sum = points.reduce<Point>(
    (acc, [x, y]) => [acc[0] + x, acc[1] + y],
    [0, 0]
  );
  return [sum[0] / points.length, sum[1] / points.length];
}

/** İki nokta arasında verilen orana (t: 0-1) göre ara nokta bulur. */
function lerp(p1: Point, p2: Point, t: number): Point {
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
}

export interface HouseLabelAnchors {
  /** Burç numarası etiketinin konumu (dış köşeye yakın). */
  signLabelPos: Point;
  /** Gezegen listesi bloğunun başlangıç (ilk satır) konumu (merkeze yakın). */
  planetLabelPos: Point;
}

/**
 * Bir evin köşe noktalarına göre burç-numarası etiketi ve gezegen listesi
 * için sabit, çakışmayan iki referans noktası üretir.
 *
 * Mantık: dış köşe (points[0]) ile poligonun merkezi (centroid) arasında bir
 * doğru düşünülür. Burç numarası bu doğru üzerinde dış köşeye yakın (%28),
 * gezegen bloğu ise merkezin biraz daha ilerisinde (dış köşeden uzakta)
 * konumlandırılır - böylece iki etiket asla üst üste binmez.
 */
export function getHouseLabelAnchors(points: Point[]): HouseLabelAnchors {
  const outer = points[0];
  const centroid = getHouseCentroid(points);
  const signLabelPos = lerp(outer, centroid, 0.3);
  const planetLabelPos = lerp(outer, centroid, 1.18);
  return { signLabelPos, planetLabelPos };
}

/** Bir evin köşe noktalarından kapalı bir SVG path 'd' değeri üretir. */
export function getHousePathD(points: Point[]): string {
  const [first, ...rest] = points;
  const restPath = rest.map(([x, y]) => `L ${x} ${y}`).join(" ");
  return `M ${first[0]} ${first[1]} ${restPath} Z`;
}