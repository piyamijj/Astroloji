# swisseph ve Vercel Uyumluluğu — Teknik Not ve Alternatif (Fallback) Yaklaşım

Bu not, `swisseph` kütüphanesinin Vercel gibi serverless ortamlarda neden bazen
çalışmayabileceğini açıklar ve gerektiğinde geçilebilecek saf JavaScript
tabanlı bir alternatif efemeris motoru için yol haritası sunar.

## 1. Neden swisseph Vercel'de sorun çıkarabilir?

`swisseph`, Swiss Ephemeris kütüphanesinin C/C++ ile yazılmış çekirdeğini
Node.js'e bağlayan bir **native addon**'dur (`node-gyp` ile derlenen bir
`.node` binary dosyası üretir). Bu durum birkaç yapısal riski beraberinde
getirir:

- **Mimari / glibc uyumsuzluğu**: `npm install` sırasında paket, kurulumun
  yapıldığı makinenin işlemci mimarisine ve C kütüphanesi (glibc) sürümüne
  göre derlenir. Vercel'in build makinesi ile gerçek çalışma zamanı ortamı
  (AWS Lambda tabanlı) çoğunlukla aynı temel imajı kullansa da, native
  modüllerin derleme adımı (`node-gyp rebuild`) build önbelleği, Lambda
  katmanı (layer) sürümü veya Node.js sürüm güncellemeleri nedeniyle bazen
  çalışma zamanında yüklenemeyen bir binary üretebilir.
- **Build önbelleği native modülleri atlayabilir**: Vercel, dağıtımlar
  arasında `node_modules`'ı hızlandırmak için önbellekler; bu önbellekleme
  bazen önceden derlenmiş ama hedef ortamla artık tam uyumlu olmayan bir
  `.node` dosyasının yeniden derlenmeden kullanılmasına yol açabilir.
- **Salt okunur (read-only) dosya sistemi**: Lambda tabanlı serverless
  fonksiyonlar çalışma anında yalnızca `/tmp` dizinine yazabilir; kalıcı,
  yazılabilir bir dosya sistemi yoktur. Bu, çalışma zamanında herhangi bir
  yeniden derleme veya native bağımlılığı kendi kendine onarma girişimini
  imkânsız kılar — sorun oluşursa fonksiyon çağrısı doğrudan hata verir.
- **Soğuk başlangıç (cold start) ek yükü**: Native modüllerin yüklenmesi,
  saf JavaScript modüllere kıyasla soğuk başlangıç sürelerini uzatabilir.

Bu risklerin **kesin olarak gerçekleşeceği** anlamına gelmez — birçok
projede `swisseph` Vercel üzerinde sorunsuz çalışır. Ancak olası bir
"Cannot find module" veya "invalid ELF header" türü çalışma zamanı
hatasına karşı hazırlıklı olunmalıdır. Bu depodaki `lib/vedic-calc.ts`
dosyası, `require('swisseph')` başarısız olduğunda kullanıcıya Türkçe,
anlaşılır bir hata mesajı döndürecek şekilde `try/catch` ile korunmuştur.

## 2. Önerilen alternatif: `circular-natal-horoscope-js`

Eğer Vercel dağıtımında `swisseph` çalışma zamanında yüklenemezse, saf
JavaScript ile yazılmış (native derleme gerektirmeyen) bir efemeris
motoruna geçilebilir. Bu iş için önerilen paket:

- **`circular-natal-horoscope-js`** — İçeride `astronomia` kütüphanesini
  kullanarak gezegen konumlarını ve ev sistemlerini hesaplayan, tamamen
  JavaScript ile yazılmış, derleme gerektirmeyen bir doğum haritası
  kütüphanesidir. `npm install circular-natal-horoscope-js` ile kurulur ve
  hiçbir native bağımlılığı yoktur; bu yüzden Vercel'in serverless
  fonksiyonlarında derleme/uyumluluk riski taşımaz.

### Önemli fark: Tropikal vs. Sidereal

`circular-natal-horoscope-js` (ve alttaki `astronomia`), varsayılan olarak
**tropikal (Batı astrolojisi) zodyak** konumlarını döndürür. Bu proje ise
Vedik (Jyotish) astrolojiye göre **sidereal (yıldızcıl) Lahiri ayanamsa**
tabanlı konumlar gerektirir. Bu yüzden doğrudan bir birebir değişim
(drop-in replacement) mümkün değildir; dönen tropikal boylamdan Lahiri
ayanamsa değerinin çıkarılması gerekir:

```
sidereal_boylam = (tropikal_boylam - lahiri_ayanamsa + 360) % 360
```

Lahiri ayanamsa değeri için iki yol izlenebilir:

1. `astronomia` paketinin sidereal/nutasyon modüllerinden yararlanarak
   ayanamsayı doğrudan hesaplamak (daha karmaşık, ancak bağımsız).
2. Yaygın olarak kullanılan **N.C. Lahiri (Chitra Paksha) polinom
   yaklaşımını** kullanmak — birçok açık kaynak Vedik astroloji projesinde
   kullanılan, yılın ondalık değerine (`year + (dayOfYear / 365.25)`)
   dayalı basit bir yaklaşık formüldür. Bu yaklaşım `swisseph`'in
   sağladığı hassasiyete (yay saniyesi mertebesinde) tam olarak eşit
   değildir, ancak doğum haritası yorumlaması için yeterli doğruluktadır.

### Önerilen kod organizasyonu

Bu depoda tek bir hesaplama motoru (`swisseph` + Moshier/gerçek efemeris)
uygulanmıştır çünkü kapsam ve netlik açısından en doğru sonucu verir.
Vercel'de gerçek bir uyumluluk sorunu yaşanırsa, aşağıdaki yapı izlenerek
`lib/vedic-calc.ts` içine ikinci bir yol eklenebilir:

```ts
// lib/vedic-calc.ts içine eklenecek taslak (henüz uygulanmadı):

async function calculateVedicChartFallback(
  input: BirthFormInput
): Promise<ChartResult> {
  // 1. circular-natal-horoscope-js ile tropikal gezegen/ev konumlarını hesapla.
  // 2. Aynı doğum anı (UTC) için Lahiri ayanamsa değerini hesapla
  //    (yukarıdaki polinom yaklaşımı veya astronomia sidereal modülü ile).
  // 3. Her tropikal boylamdan ayanamsayı çıkararak sidereal boylama çevir.
  // 4. degreesToSignAndSubdegree() ve whole-sign ev mantığını (mevcut
  //    calculateVedicChart() içindeki ile birebir aynı) uygulayarak
  //    ChartResult şeklinde döndür — böylece API ve arayüz hiçbir
  //    değişiklik gerektirmez.
}

export async function calculateVedicChart(
  input: BirthFormInput
): Promise<ChartResult> {
  if (process.env.USE_PURE_JS_EPHEMERIS === "true") {
    return calculateVedicChartFallback(input);
  }
  // ... mevcut swisseph tabanlı uygulama ...
}
```

Bu şekilde, `USE_PURE_JS_EPHEMERIS=true` ortam değişkeni Vercel proje
ayarlarına eklenerek tek satırlık bir değişiklikle native bağımlılık
tamamen devre dışı bırakılabilir; API sözleşmesi (`ChartResult` şekli) ve
arayüz kodu (`ChartSvg.tsx`, `AstroForm.tsx`, `app/page.tsx`) hiç
değişmeden çalışmaya devam eder.

## 3. Özet tavsiye

- Önce mevcut `swisseph` tabanlı uygulamayı Vercel'e deploy edin ve gerçek
  bir istekle test edin.
- Eğer `/api/calculate` çağrısı sunucu tarafında "swisseph yüklenemedi"
  türü bir hata döndürürse, bu belgede anlatılan `circular-natal-horoscope-js`
  + Lahiri ayanamsa düzeltmesi yaklaşımını uygulayın.
- Alternatif olarak Vercel yerine native modülleri daha esnek destekleyen
  bir Node.js sunucusu (ör. Railway, Render, kendi VPS'iniz) üzerinde
  dağıtım yapmayı da değerlendirebilirsiniz.