/**
 * /api/interpret — Yapay Zeka Destekli Detaylı Astrolojik Yorum Uç Noktası
 *
 * Bu uç nokta bir TASLAK (stub) DEĞİLDİR; gerçekten çalışan, üretime hazır bir
 * entegrasyondur. /api/calculate tarafından üretilen tam doğum haritası JSON'unu
 * (Yükselen + gezegen listesi) alır ve Groq'un OpenAI-uyumlu Chat Completions
 * API'sini ("openai/gpt-oss-120b" modeli) kullanarak, yalnızca gönderilen
 * gerçek yerleşimlere dayanan, kişiselleştirilmiş, Türkçe bir Vedik (Jyotish)
 * astroloji yorumu üretir.
 *
 * KİMLİK BİLGİLERİ: Bu uç nokta çalışmak için GROQ_API_KEY_1, GROQ_API_KEY_2,
 * GROQ_API_KEY_3 ve GROQ_API_KEY_4 ortam değişkenlerine ihtiyaç duyar. Bu
 * anahtarlar KESİNLİKLE kod içine yazılmaz; yalnızca Vercel proje ayarlarında
 * (veya yerel geliştirme için .env.local dosyasında, bkz. .env.local.example)
 * tanımlanır ve process.env üzerinden okunur.
 *
 * DAYANIKLILIK (Round-Robin + Fallback): Groq'un ücretsiz katmanı düşük hız
 * sınırlarına (rate limit) sahip olduğundan, dört ayrı ücretsiz anahtar
 * arasında dönüşümlü olarak geçiş yapılır. Her istek, bir önceki isteğin
 * bıraktığı yerden bir sonraki anahtarla başlar (modül düzeyinde basit bir
 * döner sayaç ile); böylece art arda gelen istekler yükü dört anahtara
 * yayar. Bir anahtar hız sınırına takılırsa (HTTP 429), sunucu tarafı bir
 * hataya uğrarsa (5xx) veya ağ hatası oluşursa, sırasıyla diğer anahtarlar
 * denenir. Tüm anahtarlar tükenirse, en son karşılaşılan hatayı özetleyen
 * Türkçe bir hata fırlatılır.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

/** Ardışık isteklerde farklı bir anahtardan başlamak için modül düzeyinde döner sayaç. */
let groqRotationCounter = 0;

function getConfiguredGroqApiKeys(): string[] {
  const rawKeys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
  ];
  return rawKeys.filter(
    (key): key is string => typeof key === "string" && key.trim().length > 0
  );
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Groq Chat Completions API'sini, mevcut anahtarlar arasında dönüşümlü ve
 * hataya dayanıklı bir şekilde çağırır. Başarılı olan ilk yanıtın metin
 * içeriğini döndürür.
 */
async function callGroqWithFallback(messages: ChatMessage[]): Promise<string> {
  const apiKeys = getConfiguredGroqApiKeys();

  if (apiKeys.length === 0) {
    throw new Error(
      "Yapay zeka yorum servisi şu anda yapılandırılmamış (GROQ_API_KEY ortam değişkenleri eksik)."
    );
  }

  const startIndex = groqRotationCounter % apiKeys.length;
  groqRotationCounter += 1;

  let lastError: string = "Bilinmeyen bir hata oluştu.";

  for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
    const key = apiKeys[(startIndex + attempt) % apiKeys.length];

    try {
      const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.8,
          max_tokens: 1200,
        }),
      });

      if (response.status === 429 || response.status >= 500) {
        // Geçici/anahtara özgü sorun (hız sınırı veya sunucu hatası):
        // sıradaki anahtarla devam et.
        lastError = `Groq API bu anahtarla geçici olarak yanıt vermedi (HTTP ${response.status}).`;
        continue;
      }

      if (!response.ok) {
        // Diğer hata kodları da (ör. yanlış yapılandırılmış bir anahtar)
        // aynı şekilde görünebilir; bir sonraki anahtarı denemek neredeyse
        // hiç maliyeti olmadan dayanıklılığı artırır, bu yüzden burada da
        // hemen fırlatmak yerine sıradaki anahtara geçilir.
        const bodyText = await response.text().catch(() => "");
        lastError = `Groq API hata döndürdü (HTTP ${response.status}): ${bodyText}`;
        continue;
      }

      const data = await response.json();
      const content: unknown = data?.choices?.[0]?.message?.content;

      if (typeof content !== "string" || content.trim().length === 0) {
        lastError =
          "Groq API'den beklenmeyen veya boş bir yanıt içeriği alındı.";
        continue;
      }

      return content.trim();
    } catch (error: any) {
      lastError = `Groq API'ye bağlanırken ağ hatası oluştu: ${
        error?.message || error
      }`;
      continue;
    }
  }

  throw new Error(
    `Yapay zeka yorumu alınamadı; denenen tüm Groq API anahtarları başarısız oldu. Son hata: ${lastError}`
  );
}

interface InterpretPlanetLike {
  nameTr?: string;
  signNameTr?: string;
  degreeInSign?: number;
  house?: number;
  retrograde?: boolean;
}

interface InterpretRequestBody {
  ascendant?: {
    signNameTr?: string;
    degreeInSign?: number;
  };
  planets?: InterpretPlanetLike[];
  input?: {
    name?: string;
  };
}

function buildAstrologyPrompt(body: InterpretRequestBody): string {
  const ascendant = body.ascendant;
  const planets = body.planets ?? [];

  const ascendantLine = ascendant
    ? `- Yükselen (Lagna): ${ascendant.signNameTr ?? "?"} burcu, ${(
        ascendant.degreeInSign ?? 0
      ).toFixed(2)}°`
    : "- Yükselen: bilgi yok";

  const planetLines = planets
    .map((planet) => {
      const name = planet.nameTr ?? "Bilinmeyen Gezegen";
      const sign = planet.signNameTr ?? "?";
      const degree = (planet.degreeInSign ?? 0).toFixed(2);
      const house = planet.house ?? "?";
      const retro = planet.retrograde ? " (Retro / Geri Giden)" : "";
      return `- ${name}: ${sign} burcu, ${degree}°, ${house}. ev${retro}`;
    })
    .join("\n");

  const personName = body.input?.name?.trim();
  const personLine = personName
    ? `Yorumu, "${personName}" adlı kişiye doğrudan hitap ederek yazın.`
    : "Yorumu, kişiye doğrudan hitap ederek yazın.";

  return `Aşağıda bir kişinin Lahiri ayanamsa (sidereal) sisteme göre hesaplanmış Vedik (Jyotish) D1 doğum haritası yerleşimleri verilmiştir:

${ascendantLine}
${planetLines}

Deneyimli bir Vedik (Jyotish) astrolog gibi davranarak, YALNIZCA yukarıda verilen gerçek yerleşimlere dayanan, sıcak, akıcı ve kişiselleştirilmiş bir Türkçe yorum yazın. Yorumda kesinlikle burada listelenmeyen ek bir gezegen, ev veya yerleşim uydurmayın.

Yorumunuzu şu temaları doğal bir akış içinde (başlık/madde işareti kullanmadan, sadece paragraflar hâlinde, paragraflar arasında boş satır bırakarak) kapsayacak şekilde yazın:
1) Genel kişilik yapısı ve yaşam teması
2) Aşk ve ilişkiler
3) Kariyer ve maddiyat
4) Kısa ve pratik bir tavsiye

${personLine} Resmi ama sıcak bir "siz" dili kullanın. Yorum yaklaşık 250-400 kelime uzunluğunda olsun. Yanıtınızda markdown başlığı, numaralandırma veya madde işareti kullanmayın; yalnızca doğal paragraflar yazın.`;
}

function isValidInterpretRequestBody(
  body: any
): body is InterpretRequestBody {
  if (!body || typeof body !== "object") return false;
  if (!body.ascendant || typeof body.ascendant !== "object") return false;
  if (!Array.isArray(body.planets) || body.planets.length === 0) return false;
  return true;
}

export async function POST(request: NextRequest) {
  let body: any;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Geçersiz istek gövdesi: geçerli bir JSON gönderilmedi." },
      { status: 400 }
    );
  }

  if (!isValidInterpretRequestBody(body)) {
    return NextResponse.json(
      {
        error:
          "Geçersiz doğum haritası verisi: 'ascendant' ve en az bir gezegen içeren 'planets' alanları zorunludur.",
      },
      { status: 400 }
    );
  }

  try {
    const prompt = buildAstrologyPrompt(body);

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Sen deneyimli, empatik ve profesyonel bir Vedik (Jyotish) astrologsun. Yalnızca sana verilen gerçek gezegen yerleşimlerine dayanarak, akıcı ve doğal Türkçe ile yorum yaparsın. Asla verilmeyen bir yerleşim uydurmazsın, asla markdown biçimlendirmesi (başlık, madde işareti, kalın yazı işaretleri) kullanmazsın; yalnızca düz paragraflar yazarsın.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const interpretation = await callGroqWithFallback(messages);

    return NextResponse.json({ interpretation }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Yapay zeka yorumu alınırken bir hata oluştu." },
      { status: 502 }
    );
  }
}