"use client";

import { useState } from "react";
import type { ChartResult } from "@/lib/astro-types";
import {
  getAscendantInterpretation,
  getMoonInterpretation,
  getCareerAndDriveInterpretation,
} from "@/data/astrology-dictionary";

interface InterpretationProps {
  data: ChartResult;
}

/**
 * Detaylı Astrolojik Yorum bileşeni.
 *
 * Üstte, her zaman anında ve ücretsiz çalışan (internet/servis kesintisinden
 * etkilenmeyen) statik sözlük tabanlı üç alt bölüm gösterir: Yükselen, Ay ve
 * Güneş+Mars. Altında ise isteğe bağlı olarak "/api/interpret" uç noktasını
 * çağırıp yapay zeka ile üretilmiş, kişiye özel daha zengin bir yorum
 * gösteren bir buton bulunur.
 */
export default function Interpretation({ data }: InterpretationProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const moon = data.planets.find((p) => p.key === "moon");
  const sun = data.planets.find((p) => p.key === "sun");
  const mars = data.planets.find((p) => p.key === "mars");

  const ascendantText = getAscendantInterpretation(data.ascendant.sign);
  const moonText = moon ? getMoonInterpretation(moon.sign, moon.house) : null;
  const careerText =
    sun && mars
      ? getCareerAndDriveInterpretation(sun.sign, mars.sign)
      : null;

  async function requestAiInterpretation() {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const response = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let message =
          "Yapay zeka yorumu alınırken bir hata oluştu. Lütfen tekrar deneyin.";
        try {
          const errorBody = await response.json();
          if (errorBody && errorBody.error) {
            message = errorBody.error;
          }
        } catch {
          // Yanıt JSON değilse varsayılan mesaj kullanılır.
        }
        setAiError(message);
        return;
      }

      const result = await response.json();
      if (!result || typeof result.interpretation !== "string") {
        setAiError(
          "Yapay zeka servisinden beklenmeyen bir yanıt alındı. Lütfen tekrar deneyin."
        );
        return;
      }

      setAiResult(result.interpretation);
    } catch {
      setAiError(
        "Sunucuya bağlanırken bir sorun oluştu. İnternet bağlantınızı kontrol edip tekrar deneyin."
      );
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <section className="card-glass mt-8 w-full max-w-3xl rounded-2xl border border-amethyst-500/20 p-6 sm:p-8">
      <h2 className="glow-text text-xl font-semibold text-gold-400 sm:text-2xl">
        Detaylı Astrolojik Yorum
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Doğum haritanızdaki temel yerleşimlere göre hazırlanmış kişilik,
        duygusal dünya ve kariyer analizi.
      </p>

      <div className="mt-6 space-y-5">
        {ascendantText && (
          <div className="rounded-xl border border-amethyst-500/15 bg-cosmic-900/40 p-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌅</span>
              <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
                Yükselen (Lagna) — Kişilik ve Dış Görünüş
              </h3>
            </div>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amethyst-400">
              {data.ascendant.signNameTr} · {data.ascendant.degreeInSign.toFixed(2)}°
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              {ascendantText}
            </p>
          </div>
        )}

        {moonText && moon && (
          <div className="rounded-xl border border-amethyst-500/15 bg-cosmic-900/40 p-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌙</span>
              <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
                Ay — Zihinsel Yapı ve Duygusal Dünya
              </h3>
            </div>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amethyst-400">
              {moon.signNameTr} · {moon.house}. Ev
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              {moonText}
            </p>
          </div>
        )}

        {careerText && sun && mars && (
          <div className="rounded-xl border border-amethyst-500/15 bg-cosmic-900/40 p-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚔️</span>
              <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
                Güneş ve Mars — Kariyer, Maddiyat ve Mücadele Gücü
              </h3>
            </div>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amethyst-400">
              Güneş: {sun.signNameTr} · Mars: {mars.signNameTr}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              {careerText}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-amethyst-500/15 pt-6">
        <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
          Yapay Zeka ile Zenginleştirilmiş Yorum
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Haritanızın tamamını dikkate alan, kişiselleştirilmiş ve daha
          kapsamlı bir yorum için yapay zekadan destek alabilirsiniz.
        </p>

        <button
          type="button"
          onClick={requestAiInterpretation}
          disabled={aiLoading}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-sm font-medium text-gold-400 transition hover:bg-gold-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {aiLoading ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-gold-400 border-t-transparent"
                aria-hidden="true"
              />
              Yapay zeka yorumunuz hazırlanıyor…
            </>
          ) : (
            <>
              <span aria-hidden="true">✨</span>
              Yapay Zeka ile Detaylı Yorum Al
            </>
          )}
        </button>

        {aiError && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 sm:flex-row sm:items-center sm:justify-between">
            <span>{aiError}</span>
            <button
              type="button"
              onClick={requestAiInterpretation}
              className="self-start rounded-md border border-rose-400/40 px-3 py-1 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 sm:self-auto"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {aiResult && (
          <div className="mt-5 rounded-xl border border-gold-500/30 bg-gradient-to-br from-amethyst-500/10 via-cosmic-900/60 to-gold-500/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-400">
              Yapay Zeka Yorumu
            </p>
            <div className="mt-3 space-y-3">
              {aiResult
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-sm leading-relaxed text-slate-200 sm:text-base"
                  >
                    {paragraph}
                  </p>
                ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}