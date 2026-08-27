"use client";

import { useState, FormEvent } from "react";
import type { ChartResult } from "@/lib/astro-types";

interface AstroFormProps {
  onSubmitStart: () => void;
  onSuccess: (result: ChartResult) => void;
  onError: (message: string) => void;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-amethyst-500/20 bg-cosmic-800/60 px-3 py-2 text-slate-100 placeholder-slate-500 transition focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500";

/**
 * Doğum bilgilerini (ad, tarih, saat, şehir) alan form bileşeni.
 *
 * Form gönderildiğinde önce basit istemci tarafı doğrulama yapılır, ardından
 * /api/calculate uç noktasına POST isteği gönderilerek doğum haritası
 * hesaplaması sunucu tarafında tetiklenir.
 */
export default function AstroForm({
  onSubmitStart,
  onSuccess,
  onError,
}: AstroFormProps) {
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [time, setTime] = useState("");
  const [city, setCity] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!name.trim()) {
      return "Lütfen adınızı girin.";
    }

    const dayNum = Number(day);
    const monthNum = Number(month);
    const yearNum = Number(year);

    if (!day || !Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31) {
      return "Lütfen geçerli bir gün girin (1-31).";
    }

    if (!month || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      return "Lütfen geçerli bir ay girin (1-12).";
    }

    if (!year || !Number.isInteger(yearNum) || yearNum < 1900 || yearNum > 2100) {
      return "Lütfen geçerli bir yıl girin (1900-2100).";
    }

    if (!time) {
      return "Lütfen doğum saatinizi girin.";
    }

    if (!city.trim()) {
      return "Lütfen doğum yeri şehir adını girin.";
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setFieldError(validationError);
      onError(validationError);
      return;
    }

    setFieldError(null);
    setSubmitting(true);
    onSubmitStart();

    const paddedDay = day.padStart(2, "0");
    const paddedMonth = month.padStart(2, "0");
    const birthDate = `${paddedDay}/${paddedMonth}/${year}`;
    const birthTime = time; // <input type="time"> zaten "SS:DD" (HH:mm) formatında değer üretir.

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          birthDate,
          birthTime,
          city: city.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message =
          data?.error || "Doğum haritası hesaplanırken bir hata oluştu.";
        onError(message);
        return;
      }

      onSuccess(data as ChartResult);
    } catch (error) {
      onError(
        "Sunucuya bağlanırken bir hata oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card-glass rounded-2xl p-6 shadow-card"
    >
      <h2 className="text-lg font-semibold text-slate-100">Doğum Bilgileri</h2>
      <p className="mt-1 text-sm text-slate-400">
        Doğum bilgilerinizi eksiksiz girin; hesaplama Lahiri ayanamsa ile yapılır.
      </p>

      <div className="mt-6 space-y-5">
        {/* Ad */}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-300">
            Ad
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. Ayşe Yılmaz"
            className={INPUT_CLASS}
            required
          />
        </div>

        {/* Doğum Tarihi */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Doğum Tarihi
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="Gün"
                aria-label="Gün"
                className={INPUT_CLASS}
                required
              />
              <span className="mt-1 block text-center text-xs text-slate-500">Gün</span>
            </div>
            <div>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="Ay"
                aria-label="Ay"
                className={INPUT_CLASS}
                required
              />
              <span className="mt-1 block text-center text-xs text-slate-500">Ay</span>
            </div>
            <div>
              <input
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Yıl"
                aria-label="Yıl"
                className={INPUT_CLASS}
                required
              />
              <span className="mt-1 block text-center text-xs text-slate-500">Yıl</span>
            </div>
          </div>
        </div>

        {/* Doğum Saati */}
        <div>
          <label htmlFor="time" className="mb-1.5 block text-sm font-medium text-slate-300">
            Doğum Saati (SS:DD)
          </label>
          <input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={INPUT_CLASS}
            required
          />
        </div>

        {/* Doğum Yeri */}
        <div>
          <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-slate-300">
            Doğum Yeri (Şehir)
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Örn. İstanbul"
            className={INPUT_CLASS}
            required
          />
        </div>

        {/* Alan Hatası */}
        {fieldError && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
            {fieldError}
          </p>
        )}

        {/* Gönder Butonu */}
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 py-2.5 font-semibold text-cosmic-950 shadow-glow transition hover:from-gold-500 hover:to-gold-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cosmic-950/40 border-t-cosmic-950" />
              Hesaplanıyor…
            </>
          ) : (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4L12 2z" />
                <circle cx="19" cy="18" r="2.2" />
              </svg>
              Haritamı Oluştur
            </>
          )}
        </button>
      </div>
    </form>
  );
}