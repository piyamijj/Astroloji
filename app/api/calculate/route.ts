/**
 * POST /api/calculate
 *
 * Bu API rotası (Route Handler), Vedik (Jyotish) doğum haritası hesaplamasının
 * SUNUCU tarafındaki tek giriş noktasıdır. Sorumlulukları:
 *
 * 1. İstemciden gelen ham doğum bilgilerini (ad, tarih, saat, şehir) doğrulamak.
 * 2. Şehir adını (Geocoding) enlem/boylam/saat dilimine çevirmek.
 * 3. Swiss Ephemeris (swisseph) kütüphanesi ile, Ayanamsa olarak kesinlikle
 *    'Lahiri' (Chitra Paksha, sidereal/yıldızcıl) kullanarak Yükselen (Ascendant)
 *    ve gezegen (Güneş, Ay, Mars, Merkür, Jüpiter, Venüs, Satürn, Rahu, Ketu)
 *    konumlarını derece cinsinden hesaplamak.
 * 4. Sonucu JSON olarak istemciye döndürmek.
 *
 * ÖNEMLİ: Bu rota MUTLAKA sunucu tarafında (Node.js runtime) çalışmalıdır.
 * 'swisseph' native bir C/C++ eklentisi olduğu için Edge Runtime'da veya
 * tarayıcıda ÇALIŞMAZ. Bu yüzden aşağıda `runtime = 'nodejs'` zorunlu kılınmıştır.
 */

import { NextRequest, NextResponse } from "next/server";
import { calculateVedicChart } from "@/lib/vedic-calc";
import type { BirthFormInput, ApiErrorResponse } from "@/lib/astro-types";

// swisseph native bir addon olduğu için Edge Runtime'da çalışamaz; Node.js runtime zorunlu.
export const runtime = "nodejs";
// Her istek benzersiz bir doğum haritası hesaplaması olduğundan statik önbellekleme kapatılır.
export const dynamic = "force-dynamic";

const BIRTH_DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;
const BIRTH_TIME_REGEX = /^\d{2}:\d{2}$/;

export async function POST(request: NextRequest) {
  let body: Partial<BirthFormInput>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Geçersiz istek gövdesi. Lütfen form verilerini kontrol edin." },
      { status: 400 }
    );
  }

  const { name, birthDate, birthTime, city } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Lütfen adınızı girin." },
      { status: 400 }
    );
  }

  if (
    !birthDate ||
    typeof birthDate !== "string" ||
    !BIRTH_DATE_REGEX.test(birthDate)
  ) {
    return NextResponse.json<ApiErrorResponse>(
      {
        error:
          "Doğum tarihi GG/AA/YYYY formatında olmalıdır (örn. 24/03/1995).",
      },
      { status: 400 }
    );
  }

  if (
    !birthTime ||
    typeof birthTime !== "string" ||
    !BIRTH_TIME_REGEX.test(birthTime)
  ) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Doğum saati SS:DD formatında olmalıdır (örn. 14:30)." },
      { status: 400 }
    );
  }

  if (!city || typeof city !== "string" || city.trim().length === 0) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Lütfen doğum yeri şehir adını girin." },
      { status: 400 }
    );
  }

  const input: BirthFormInput = {
    name: name.trim(),
    birthDate: birthDate.trim(),
    birthTime: birthTime.trim(),
    city: city.trim(),
  };

  try {
    const result = await calculateVedicChart(input);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    // vedic-calc.ts içindeki hatalar zaten kullanıcıya gösterilebilir Türkçe mesajlardır.
    const message =
      error?.message ||
      "Doğum haritası hesaplanırken beklenmeyen bir hata oluştu.";
    return NextResponse.json<ApiErrorResponse>(
      { error: message },
      { status: 500 }
    );
  }
}