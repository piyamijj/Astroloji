"use client";

import { useState } from "react";
import AstroForm from "@/components/AstroForm";
import ChartSvg from "@/components/ChartSvg";
import type { ChartResult } from "@/lib/astro-types";

/**
 * Ana sayfa - Vedik Doğum Haritası uygulamasının tek sayfalık arayüzü.
 *
 * Sol tarafta doğum bilgilerini alan form, sağ tarafta ise hesaplanan
 * doğum haritasının özeti, Kuzey Hindistan stili SVG haritası ve gezegen
 * konumları tablosu gösterilir.
 */
export default function HomePage() {
  const [chartResult, setChartResult] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmitStart = () => {
    setLoading(true);
    setErrorMessage(null);
    setChartResult(null);
  };

  const handleSuccess = (result: ChartResult) => {
    setChartResult(result);
    setLoading(false);
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
    setLoading(false);
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Başlık Bölümü */}
      <header className="mb-10 text-center">
        <h1 className="glow-text text-3xl font-bold tracking-tight text-gold-400 sm:text-4xl">
          Vedik Doğum Haritası
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
          Doğum tarihi, saati ve yerinize göre <span className="text-amethyst-400">Lahiri Ayanamsa</span>{" "}
          (sidereal zodyak) esas alınarak hesaplanan, Kuzey Hindistan (baklava/elmas)
          formatında D1 Rasi doğum haritanızı görüntüleyin.
        </p>
      </header>

      {/* İçerik: Form + Sonuç */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">
        {/* Sol Sütun: Form */}
        <div>
          <AstroForm
            onSubmitStart={handleSubmitStart}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>

        {/* Sağ Sütun: Sonuçlar */}
        <div className="min-h-[400px]">
          {/* Boş Durum (henüz sonuç yok, yükleme de yok) */}
          {!chartResult && !loading && !errorMessage && (
            <div className="card-glass flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl p-10 text-center shadow-card">
              <svg
                width="64"
                height="64"
                viewBox="0 0 400 400"
                className="mb-4 opacity-30"
                aria-hidden="true"
              >
                <rect x="1" y="1" width="398" height="398" fill="none" stroke="#9a6bea" strokeWidth="6" />
                <line x1="0" y1="0" x2="400" y2="400" stroke="#9a6bea" strokeWidth="4" />
                <line x1="400" y1="0" x2="0" y2="400" stroke="#9a6bea" strokeWidth="4" />
                <polygon points="200,0 400,200 200,400 0,200" fill="none" stroke="#9a6bea" strokeWidth="4" />
              </svg>
              <p className="text-base font-medium text-slate-200">
                Haritanızı görmek için forma bilgilerinizi girin
              </p>
              <p className="mt-2 max-w-sm text-sm text-slate-400">
                Adınızı, doğum tarihinizi, saatinizi ve doğduğunuz şehri girip
                haritanızı oluşturduğunuzda sonuçlar burada görüntülenecek.
              </p>
            </div>
          )}

          {/* Yükleme Durumu */}
          {loading && (
            <div className="card-glass flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl p-10 text-center shadow-card">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-amethyst-500/30 border-t-gold-500" />
              <p className="text-base font-medium text-slate-200">
                Gök cisimlerinin konumları hesaplanıyor…
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Şehir konumu çözümleniyor ve Swiss Ephemeris ile gezegen dereceleri hesaplanıyor.
              </p>
            </div>
          )}

          {/* Hata Durumu */}
          {errorMessage && !loading && (
            <div className="card-glass relative rounded-2xl border border-rose-500/40 bg-rose-950/30 p-6 shadow-card">
              <button
                onClick={() => setErrorMessage(null)}
                aria-label="Hatayı kapat"
                className="absolute right-4 top-4 text-rose-300 transition hover:text-rose-100"
              >
                ✕
              </button>
              <h2 className="mb-2 text-lg font-semibold text-rose-300">
                Bir sorun oluştu
              </h2>
              <p className="text-sm text-rose-100/90">{errorMessage}</p>
            </div>
          )}

          {/* Sonuç Durumu */}
          {chartResult && !loading && (
            <div className="space-y-6">
              {/* Özet Bilgi Kartı */}
              <div className="card-glass rounded-2xl p-6 shadow-card">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Ad</p>
                    <p className="mt-1 text-base font-medium text-slate-100">
                      {chartResult.input.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Doğum Tarihi ve Saati
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-100">
                      {chartResult.input.birthDate} — {chartResult.input.birthTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Doğum Yeri</p>
                    <p className="mt-1 text-base font-medium text-slate-100">
                      {chartResult.location.resolvedName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Enlem / Boylam
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-100">
                      {chartResult.location.latitude.toFixed(4)}°, {chartResult.location.longitude.toFixed(4)}°
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Yükselen (Lagna)
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-100">
                      {chartResult.ascendant.signNameTr} —{" "}
                      {chartResult.ascendant.degreeInSign.toFixed(2)}°
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Ayanamsa (Lahiri)
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-base font-medium text-slate-100">
                      {chartResult.ayanamsa.toFixed(4)}°
                      <span className="rounded-full bg-amethyst-500/20 px-2 py-0.5 text-xs font-normal text-amethyst-400">
                        {chartResult.calculationMode === "swisseph-file"
                          ? "Swiss Ephemeris (dosya)"
                          : "Moshier (yerleşik)"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* SVG Doğum Haritası */}
              <div className="card-glass flex justify-center rounded-2xl p-6 shadow-card">
                <ChartSvg data={chartResult} />
              </div>

              {/* Gezegen Konumları Tablosu */}
              <div className="card-glass overflow-x-auto rounded-2xl p-6 shadow-card">
                <h2 className="mb-4 text-lg font-semibold text-slate-100">
                  Gezegen Konumları
                </h2>
                <table className="w-full min-w-[480px] table-auto border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-amethyst-500/20 text-slate-400">
                      <th className="py-2 pr-4 font-medium">Gezegen</th>
                      <th className="py-2 pr-4 font-medium">Burç</th>
                      <th className="py-2 pr-4 font-medium">Derece</th>
                      <th className="py-2 pr-4 font-medium">Ev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartResult.planets.map((planet) => (
                      <tr
                        key={planet.key}
                        className="border-b border-amethyst-500/10 last:border-0"
                      >
                        <td className="py-2 pr-4 text-slate-100">
                          {planet.nameTr}{" "}
                          <span className="text-slate-500">({planet.abbr})</span>
                        </td>
                        <td className="py-2 pr-4 text-slate-200">{planet.signNameTr}</td>
                        <td className="py-2 pr-4 text-slate-200">
                          {planet.degreeInSign.toFixed(2)}°
                          {planet.retrograde && (
                            <span className="ml-2 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-xs font-semibold text-rose-300">
                              R
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-slate-200">{planet.house}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-center text-xs text-slate-500">
                Hesaplamalar Lahiri Ayanamsa (Sidereal Zodyak) ile Swiss Ephemeris kullanılarak yapılmıştır.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}