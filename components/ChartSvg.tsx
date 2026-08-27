"use client";

import type { ChartResult, PlanetPosition } from "@/lib/astro-types";
import { ZODIAC_SIGNS_TR } from "@/lib/astro-constants";
import {
  HOUSE_POLYGONS,
  OUTER_SQUARE_PATH_D,
  REFERENCE_LINES,
  CHART_VIEWBOX_SIZE,
  getHousePathD,
  getHouseLabelAnchors,
} from "@/lib/chart-geometry";

interface ChartSvgProps {
  data: ChartResult;
}

/** Bir burç numarasının (1-12) Türkçe adını döndürür. */
function getSignNameTr(sign: number): string {
  const idx = (((sign - 1) % 12) + 12) % 12;
  return ZODIAC_SIGNS_TR[idx];
}

/** Kendra (köşe / 1., 4., 7., 10. evler) evleri mi kontrol eder. */
function isKendraHouse(house: number): boolean {
  return house === 1 || house === 4 || house === 7 || house === 10;
}

/**
 * ChartSvg - Kuzey Hindistan (North Indian / Diamond) stili D1 Rasi doğum
 * haritasını SVG olarak çizen, saf sunum (presentation) bileşeni.
 *
 * Bu bileşen HİÇBİR astrolojik ya da geometrik hesaplama YAPMAZ:
 * - Ev köşe koordinatları ve etiket konumları lib/chart-geometry.ts'ten,
 * - Ev/burç/derece/gezegen eşlemeleri ise doğrudan `data` prop'undan
 *   (sunucudan gelen ChartResult) okunur.
 */
export default function ChartSvg({ data }: ChartSvgProps) {
  const ascendantSign = data.ascendant.sign;

  // Gezegenleri ev numarasına (1-12) göre grupla.
  const planetsByHouse = new Map<number, PlanetPosition[]>();
  for (const planet of data.planets) {
    const list = planetsByHouse.get(planet.house) ?? [];
    list.push(planet);
    planetsByHouse.set(planet.house, list);
  }

  const LINE_HEIGHT = 13.5;

  return (
    <svg
      viewBox={`0 0 ${CHART_VIEWBOX_SIZE} ${CHART_VIEWBOX_SIZE}`}
      className="aspect-square w-full max-w-[480px]"
      role="img"
    >
      <title>
        {`${data.input.name} için Kuzey Hindistan stili Vedik (Jyotish) D1 Rasi doğum haritası`}
      </title>

      {/* Koyu tema grafik arka planı */}
      <rect
        x={0}
        y={0}
        width={CHART_VIEWBOX_SIZE}
        height={CHART_VIEWBOX_SIZE}
        fill="#0b0a1a"
      />

      {/* Dış kare çerçeve */}
      <path
        d={OUTER_SQUARE_PATH_D}
        fill="none"
        stroke="#9a6bea"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {/* İç köşegen ve elmas referans çizgileri */}
      {REFERENCE_LINES.map((line, idx) => (
        <line
          key={`ref-line-${idx}`}
          x1={line.from[0]}
          y1={line.from[1]}
          x2={line.to[0]}
          y2={line.to[1]}
          stroke="#9a6bea"
          strokeWidth={1.4}
          strokeOpacity={0.55}
        />
      ))}

      {/* 12 Ev */}
      {HOUSE_POLYGONS.map(({ house, points }) => {
        const signNumber = ((ascendantSign - 1 + (house - 1)) % 12) + 1;
        const signName = getSignNameTr(signNumber);
        const { signLabelPos, planetLabelPos } = getHouseLabelAnchors(points);
        const housePlanets = planetsByHouse.get(house) ?? [];
        const kendra = isKendraHouse(house);

        // Ev 1 (Lagna) için ekstra "Lg" (Yükselen) etiketi listenin başına eklenir.
        const contentLines: {
          key: string;
          text: string;
          color: string;
          weight: string;
        }[] = [];

        if (house === 1) {
          contentLines.push({
            key: "lagna",
            text: `Lg ${data.ascendant.degreeInSign.toFixed(1)}°`,
            color: "#e8b64f",
            weight: "700",
          });
        }

        for (const planet of housePlanets) {
          contentLines.push({
            key: planet.key,
            text: `${planet.abbr} ${planet.degreeInSign.toFixed(1)}°${
              planet.retrograde ? " R" : ""
            }`,
            color: "#d8d3f2",
            weight: "500",
          });
        }

        const totalLines = contentLines.length;
        const startOffset = -((totalLines - 1) * LINE_HEIGHT) / 2;

        return (
          <g key={`house-${house}`}>
            <path
              d={getHousePathD(points)}
              fill={kendra ? "rgba(154, 107, 234, 0.08)" : "rgba(232, 182, 79, 0.03)"}
              stroke="#4a4270"
              strokeWidth={1}
            />

            {/* Burç numarası etiketi */}
            <text
              x={signLabelPos[0]}
              y={signLabelPos[1]}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight={700}
              fill="#e8b64f"
              opacity={0.85}
            >
              {signNumber}
            </text>

            {/* Gezegen / Lagna listesi */}
            {contentLines.map((line, lineIdx) => (
              <text
                key={line.key}
                x={planetLabelPos[0]}
                y={planetLabelPos[1] + startOffset + lineIdx * LINE_HEIGHT}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11.5}
                fontWeight={line.weight}
                fill={line.color}
              >
                {line.text}
              </text>
            ))}

            {/* Erişilebilirlik için görünmez burç adı etiketi */}
            <title>{`${house}. Ev — ${signName}`}</title>
          </g>
        );
      })}
    </svg>
  );
}