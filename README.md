# Vedik Doğum Haritası (Jyotish D1 Rasi Haritası)

Bu proje, kullanıcıdan **ad, doğum tarihi, doğum saati ve doğum yeri (şehir)**
bilgilerini alarak, **Lahiri Ayanamsa** (sidereal/yıldızcıl zodyak) esas
alınmış, astronomik olarak doğru bir **Vedik (Jyotish) D1 Rasi doğum
haritasını** klasik **Kuzey Hindistan (North Indian / baklava-elmas)**
formatında SVG olarak çizen tam kapsamlı bir Next.js web uygulamasıdır.
Yükselen (Ascendant/Lagna) ve dokuz gezegenin (Güneş, Ay, Mars, Merkür,
Jüpiter, Venüs, Satürn, Rahu, Ketu) konumları sunucu tarafında Swiss
Ephemeris kütüphanesi ile hesaplanır ve sonuç hem görsel harita hem de
tablo halinde kullanıcıya sunulur.

## Teknoloji Yığını

- **Framework:** Next.js 14 (App Router)
- **Arayüz:** React 18 + Tailwind CSS (koyu/dark tema, modern ve sade tasarım)
- **Backend / API:** Next.js Route Handlers (sunucu taraflı hesaplama)
- **Astrolojik Hesaplama Motoru:** `swisseph` (Swiss Ephemeris Node.js sarmalayıcısı, opsiyonel native bağımlılık) — mevcutsa birincil motor; mevcut değilse (ör. Vercel) otomatik olarak saf JavaScript yedek motoru (`circular-natal-horoscope-js`) devreye girer. Ayanamsa her iki motorda da Lahiri'dir.
- **Tarih/Saat Dilimi İşlemleri:** `luxon`
- **Geocoding (Şehir → Enlem/Boylam/Saat Dilimi):** Open-Meteo Geocoding API (ücretsiz, API anahtarı gerektirmez)

## Proje Klasör ve Dosya Yapısı

```
vedik-dogum-haritasi/
├── app/
│   ├── api/
│   │   └── calculate/
│   │       └── route.ts        # POST /api/calculate - sunucu taraflı hesaplama uç noktası
│   ├── globals.css             # Genel stil, koyu tema, kart/parıltı yardımcı sınıfları
│   ├── layout.tsx              # Kök yerleşim (root layout), metadata, koyu tema
│   └── page.tsx                # Ana sayfa: form + sonuç (harita, tablo, özet) düzeni
├── components/
│   ├── AstroForm.tsx           # Doğum bilgilerini alan form bileşeni (Client Component)
│   └── ChartSvg.tsx            # Kuzey Hindistan stili SVG doğum haritası bileşeni
├── lib/
│   ├── astro-constants.ts      # Burç adları, gezegen meta verileri, derece→burç yardımcıları
│   ├── astro-types.ts          # Paylaşılan TypeScript tipleri (ChartResult, PlanetPosition, vb.)
│   ├── ayanamsa.ts             # Saf JS yedek motor için yaklaşık Lahiri ayanamsa formülü
│   ├── chart-geometry.ts       # Kuzey Hindistan haritasının saf SVG geometri hesaplamaları
│   ├── ephemeris-fallback-notu.md  # swisseph/Vercel uyumluluk notu ve saf JS alternatif planı
│   └── vedic-calc.ts           # Geocoding + hesaplama (native swisseph veya otomatik saf JS yedek motoru)
├── types/
│   └── swisseph.d.ts           # 'swisseph' native modülü için TypeScript tip bildirimi
├── .env.local.example          # Örnek ortam değişkeni dosyası (SWISSEPH_EPHE_PATH opsiyonel)
├── .gitignore
├── next.config.mjs             # swisseph'i sunucu-harici paket olarak işaretleyen Next.js config
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Önemli Dosyaların İçeriği (Özet)

- **`package.json`** — Tüm bağımlılıkları (Next.js 14.2.5, React 18.3.1,
  `luxon`, `circular-natal-horoscope-js`) tanımlar. `swisseph`, native
  derleme bazı ortamlarda başarısız olabildiği için bilinçli olarak
  `optionalDependencies` altındadır (kurulamazsa `npm install` yine de
  başarıyla tamamlanır). Geliştirme bağımlılıkları (TypeScript, Tailwind,
  PostCSS, ESLint) sabit sürümlerle tanımlıdır; `dev`, `build`, `start`,
  `lint` komut betiklerini içerir.
- **`tsconfig.json`** — Next.js App Router için standart, strict modda
  TypeScript yapılandırması; `@/*` yol takma adı proje köküne işaret eder.
- **`next.config.mjs`** — `swisseph` native eklentisinin webpack tarafından
  paketlenmeye çalışılmaması için `experimental.serverComponentsExternalPackages`
  ayarını içerir (Next.js 15+'ta bu alan `serverExternalPackages` olarak
  yeniden adlandırılmıştır; dosya içinde ayrıntılı not vardır).
- **`tailwind.config.ts`** — Koyu/kozmik temaya özel renk paleti (lacivert/mor
  arka plan tonları, altın ve ametist vurgu renkleri) ve `app/`, `components/`
  klasörlerini tarayan `content` yapılandırması.
- **`app/layout.tsx`** — Kök yerleşim; `html lang="tr"`, koyu tema sınıfı,
  kozmik gradyan arka plan ve sayfa `metadata` (başlık/açıklama) tanımlıdır.
- **`app/page.tsx`** — Uygulamanın tek sayfası (Client Component). Sol
  sütunda `AstroForm`, sağ sütunda; boş durum, yükleme durumu, hata durumu
  veya hesaplanmış sonuç (özet kart + `ChartSvg` + gezegen tablosu) gösterilir.
- **`app/api/calculate/route.ts`** — `POST /api/calculate` uç noktası.
  Gelen `{ name, birthDate, birthTime, city }` verisini doğrular, ardından
  `lib/vedic-calc.ts` içindeki `calculateVedicChart()` fonksiyonunu çağırıp
  sonucu veya hatayı JSON olarak döndürür. `runtime = "nodejs"` olarak
  sabitlenmiştir çünkü `swisseph` Edge Runtime'da çalışamaz.
- **`lib/vedic-calc.ts`** — Projenin kalbi. Şehri Open-Meteo Geocoding API
  ile enlem/boylam/saat dilimine çevirir (`geocodeCity`), doğum anını
  `luxon` ile doğru saat dilimine göre çözümler. Ardından `require('swisseph')`
  dener: başarılı olursa `swisseph.swe_calc_ut`/`swe_houses_ex` ile TAM
  HASSASİYETLİ native hesaplama yapar (`calculateWithSwisseph`); başarısız
  olursa (ör. Vercel) otomatik olarak `circular-natal-horoscope-js` +
  yaklaşık Lahiri ayanamsa (`lib/ayanamsa.ts`) kullanan saf JS motoruna
  geçer (`calculateWithPureJsFallback`). Her iki motor da Ketu'yu
  Rahu + 180° olarak türetir ve whole-sign (tüm burç) ev sistemine göre
  her gezegenin evini birebir aynı mantıkla belirler
  (`calculateVedicChart` bu iki motoru seçip çağıran ana giriş noktasıdır).
- **`lib/astro-constants.ts`** — 12 burcun Türkçe adları (`ZODIAC_SIGNS_TR`),
  her gezegen için görünen ad/kısaltma/Swiss Ephemeris sabit adı
  (`PLANET_META`), gezegen sırası (`PLANET_ORDER`) ve derece→burç dönüşüm
  yardımcıları (`degreesToSignAndSubdegree`, `signNameTr`).
- **`lib/astro-types.ts`** — Sunucu ve istemci arasında paylaşılan
  TypeScript arayüzleri: `BirthFormInput`, `PlanetPosition`,
  `AscendantPosition`, `ResolvedLocation`, `ChartResult`, `ApiErrorResponse`.
- **`lib/chart-geometry.ts`** — Kuzey Hindistan haritasının 400x400'lük SVG
  düzleminde 12 evin köşe koordinatlarını (`HOUSE_POLYGONS`), dış çerçeve ve
  referans çizgilerini, burç numarası/gezegen etiketlerinin konumlandırma
  matematiğini (`getHouseLabelAnchors`) içeren, hiçbir astrolojik mantık
  barındırmayan saf geometri modülüdür.
- **`components/AstroForm.tsx`** — Ad, gün/ay/yıl, saat (native `time`
  input'u ile `SS:DD` formatında) ve şehir alanlarını içeren form; istemci
  taraflı doğrulama yapar, `/api/calculate`'e `POST` isteği gönderir ve
  sonucu/hatayı üst bileşene (`app/page.tsx`) callback'ler ile iletir.
- **`components/ChartSvg.tsx`** — `ChartResult` verisini alıp
  `lib/chart-geometry.ts`'teki koordinatları kullanarak Kuzey Hindistan
  stili baklava/elmas haritayı SVG olarak çizen, saf sunum bileşenidir; her
  evin burç numarasını ve o evdeki gezegenleri (dereceleriyle birlikte)
  render eder.

## Kurulum (Local Development)

Aşağıdaki komutları proje klasörü içinde sırasıyla çalıştırın:

```bash
# 1) Proje klasörüne girin
cd vedik-dogum-haritasi

# 2) Bağımlılıkları kurun
npm install

# 3) Örnek ortam değişkeni dosyasını kopyalayın
cp .env.local.example .env.local

# 4) Geliştirme sunucusunu başlatın
npm run dev

# 5) Tarayıcıda açın
# http://localhost:3000
```

Not: `.env.local` içindeki `SWISSEPH_EPHE_PATH` değişkeni **opsiyoneldir**.
Boş bırakırsanız uygulama otomatik olarak `swisseph` kütüphanesinin gömülü
"Moshier" yarı-analitik efemeris moduna düşer; bu mod hiçbir ek veri dosyası
gerektirmez ve doğum haritası hesaplamaları için yeterli hassasiyeti
(yay saniyesi mertebesinde) sağlar. Daha yüksek hassasiyet isterseniz Swiss
Ephemeris `.se1` veri dosyalarını indirip yolunu bu değişkene yazabilirsiniz.

## swisseph ve Vercel Uyumluluğu — ÖNEMLİ UYARI (GERÇEK DENEYİMLE DOĞRULANDI)

`swisseph`, native (C/C++ tabanlı) bir Node.js eklentisidir. Bu proje
gerçekten Vercel'e deploy edilerek test edilmiş ve **Vercel'in build
ortamında `swisseph`'in native derlemesi gerçekten başarısız olmuştur**:
Vercel'in Node 24 build imajında Python 3.12+ kullanılmakta, ancak
`node-gyp`'in dayandığı Python `distutils` modülü Python 3.12'de
kaldırıldığından `npm install` adımı `ModuleNotFoundError: No module
named 'distutils'` hatasıyla tamamen başarısız olmaktadır.

**Bu proje bu sorunu otomatik olarak çözecek şekilde tasarlanmıştır:**

1. `swisseph`, `package.json` içinde `dependencies` yerine
   **`optionalDependencies`** altında tanımlıdır. Bu sayede native derleme
   başarısız olsa bile `npm install` bütün olarak BAŞARISIZ OLMAZ; npm
   sadece bu paketi atlar ve kuruluma devam eder.
2. `lib/vedic-calc.ts`, çalışma zamanında `require('swisseph')`'i dener.
   Başarılı olursa (örn. yerel bilgisayarınızda, bir VPS'de veya Docker
   içinde) **tam hassasiyetli native Swiss Ephemeris motoru** kullanılır.
   Başarısız olursa (`swisseph` kurulu değilse/derlenemediyse, tıpkı
   Vercel'de olduğu gibi) uygulama **otomatik olarak** saf JavaScript
   tabanlı yedek motora (`circular-natal-horoscope-js` + yaklaşık Lahiri
   ayanamsa düzeltmesi, bkz. `lib/ayanamsa.ts`) geçer — herhangi bir manuel
   müdahale veya ayrı deploy adımı gerekmez.
3. Hangi motorun kullanıldığı, API yanıtındaki `calculationMode` alanında
   (`"moshier"`, `"swisseph-file"` veya `"pure-js"`) ve arayüzdeki özet
   kartında bir rozet olarak şeffafça gösterilir.

Yerel geliştirmede `swisseph` genelde sorunsuz derlenir (bu yüzden yerel
`npm run dev` sırasında tam hassasiyetli motoru göreceksiniz); Vercel'de
ise otomatik olarak saf JS motoru devreye girer. İsterseniz
`FORCE_NATIVE_SWISSEPH=true` ortam değişkeniyle native motoru zorunlu
kılıp (kurulu değilse net bir hata almayı) tercih edebilirsiniz.

**Doğruluk notu:** Saf JS yedek motorunda gezegenlerin tropikal
konumları hâlâ gerçek efemeris hesaplamasından gelir ve hassastır; tek
yaklaşıklık, Lahiri ayanamsa değerinin doğrusal bir formülle (gerçek
presesyon teorisi yerine) hesaplanmasıdır — bu da ~1 yay dakikası
mertebesinde bir sapmaya yol açabilir. Ayrıntılı teknik açıklama için
**`lib/ephemeris-fallback-notu.md`** ve **`lib/ayanamsa.ts`** dosyalarına
bakın.

## GitHub'a Push Etme

Proje klasöründe, sırasıyla:

```bash
# 1) Git deposunu başlatın (eğer daha önce başlatılmadıysa)
git init

# 2) Tüm dosyaları hazırlayın
git add .

# 3) İlk commit'i oluşturun
git commit -m "Vedik Doğum Haritası uygulaması - ilk sürüm"

# 4) GitHub'da yeni bir depo oluşturun
# (GitHub CLI kullanıyorsanız):
gh repo create vedik-dogum-haritasi --private --source=. --remote=origin
# (Veya github.com üzerinden manuel olarak boş bir depo oluşturup
#  aşağıdaki adımda kendi depo adresinizi kullanın)

# 5) Uzak (remote) depoyu bağlayın (gh repo create zaten bunu yapar;
#    manuel oluşturduysanız kendi depo URL'nizi kullanın)
git remote add origin https://github.com/<kullanici-adiniz>/vedik-dogum-haritasi.git

# 6) Ana dalı 'main' olarak ayarlayın
git branch -M main

# 7) Kodu GitHub'a gönderin (push)
git push -u origin main
```

## Vercel'de Yayına Alma (Deploy)

1. [vercel.com](https://vercel.com) hesabınıza giriş yapın.
2. **"Add New… → Project"** seçeneğiyle az önce push ettiğiniz GitHub
   deposunu (`vedik-dogum-haritasi`) içeri aktarın (import).
3. Vercel, `package.json` ve proje yapısından **Next.js** framework'ünü
   otomatik olarak algılayacaktır; ek bir yapılandırma gerekmez (build
   komutu `next build`, çıktı otomatik olarak yönetilir).
4. **Ortam Değişkenleri (Environment Variables)** adımında bu proje için
   **zorunlu hiçbir değişken yoktur**. İsteğe bağlı olarak ekleyebilirsiniz:
   - `SWISSEPH_EPHE_PATH` — daha yüksek hassasiyetli Swiss Ephemeris veri
     dosyalarını kullanmak isterseniz (dosyaları repo içine gömüp yolunu
     buraya yazmanız gerekir; ayrıntı için `.env.local.example`'a bakın).
     Not: `swisseph` zaten Vercel'de derlenemediği için bu değişkenin
     Vercel'de bir etkisi olmaz; saf JS yedek motor otomatik devreye girer.
   - `FORCE_NATIVE_SWISSEPH` — `true` olarak eklerseniz, `swisseph` bu
     ortamda yüklenemediğinde sessizce yedek motora geçmek yerine net bir
     hata döner (yalnızca native motorun kesin olarak kullanıldığını
     doğrulamak istediğiniz ortamlarda kullanın; Vercel'de önerilmez).
5. **"Deploy"** butonuna tıklayın ve dağıtımın tamamlanmasını bekleyin.
6. Dağıtım tamamlandığında verilen `https://<proje-adi>.vercel.app`
   adresini açıp formu doldurarak canlı ortamda test edin.
7. Eğer harita hesaplanırken bir hata alırsanız, Vercel proje panelindeki
   **"Deployments" → ilgili dağıtım → "Functions" / "Logs"** bölümünden
   `/api/calculate` fonksiyonunun sunucu loglarını inceleyin; hata mesajı
   "swisseph yüklenemedi" içeriyorsa yukarıdaki **swisseph ve Vercel
   Uyumluluğu** bölümünde anlatılan alternatif motora geçiş adımlarını
   uygulayın.

## Detaylı Astrolojik Yorum Özelliği

Sonuç sayfasında, gezegen tablosunun altında iki katmanlı bir yorum bölümü
bulunur:

1. **Statik sözlük tabanlı yorum** (`data/astrology-dictionary.ts` +
   `components/Interpretation.tsx`) — internet/servis kesintisinden
   etkilenmez, anında ve ücretsiz çalışır. Yükselen burcu, Ay burcu x Ay evi
   ve Güneş burcu x Mars burcu kombinasyonlarına göre bileşimsel (iki temel
   metnin birleştirilmesiyle) Türkçe yorum üretir.
2. **Yapay zeka destekli zengin yorum** (`app/api/interpret/route.ts`) —
   "Yapay Zeka ile Detaylı Yorum Al" butonuna tıklandığında, tüm harita
   Groq'un (`openai/gpt-oss-120b` modeli) OpenAI-uyumlu Chat Completions
   API'sine gönderilir ve kişiselleştirilmiş, daha kapsamlı bir Türkçe yorum
   üretilir. Bu özellik `GROQ_API_KEY_1` .. `GROQ_API_KEY_4` ortam
   değişkenlerinin tanımlı olmasını gerektirir (bkz. `.env.local.example`);
   dört ücretsiz anahtar arasında dönüşümlü/otomatik yedekli geçiş yaparak
   hız sınırlarına karşı dayanıklıdır. Bu anahtarlar tanımlı değilse yalnızca
   AI butonu Türkçe bir hata mesajı gösterir, uygulamanın geri kalanı
   etkilenmez.

## Vedik Astroloji Hesaplama Notları

- **Ayanamsa:** Kesinlikle **Lahiri (Chitra Paksha)** ayanamsa kullanılır;
  tüm gezegen ve Yükselen konumları **sidereal (yıldızcıl)** zodyaka göre
  hesaplanır (`swisseph.SE_SIDM_LAHIRI` ve `SEFLG_SIDEREAL` bayrağı).
- **Ev Sistemi:** Kuzey Hindistan haritası geleneğine uygun olarak
  **whole-sign (tüm burç) ev sistemi** kullanılır: Yükselenin bulunduğu
  burç 1. ev kabul edilir, sonraki burçlar sırasıyla 2., 3., … 12. evlerdir.
- **Rahu / Ketu:** Rahu, **Ortalama Ay Düğümü (Mean Node)** üzerinden
  hesaplanır; Ketu, Rahu'nun tam 180° karşısındaki nokta olarak türetilir.
  Her ikisi de gelenek gereği daima retrograd (geri giden) kabul edilir.
- **Daha yüksek hassasiyet için:** Varsayılan "Moshier" modu yeterli
  doğruluk sağlasa da, JPL efemerislerine dayalı maksimum hassasiyet
  isterseniz resmi Swiss Ephemeris veri dosyalarını
  [astro.com/ftp/swisseph/ephe](https://www.astro.com/ftp/swisseph/ephe/)
  adresinden indirip `SWISSEPH_EPHE_PATH` ile projeye tanıtabilirsiniz.

## Lisans / Sorumluluk Reddi

Bu proje kişisel ve eğitim amaçlı astrolojik kullanım için hazırlanmıştır;
ticari veya profesyonel danışmanlık amacıyla kullanılmadan önce sonuçların
bağımsız kaynaklarla doğrulanması önerilir.