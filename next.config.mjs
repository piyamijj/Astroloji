/**
 * Next.js yapılandırma dosyası.
 *
 * Önemli not: 'swisseph' bir NATIVE (C tabanlı) Node.js eklentisidir (.node binary).
 * Next.js, sunucu tarafı (server) kodunu derlerken bağımlılıkları webpack ile paketlemeye
 * çalışır; ancak native eklentiler webpack ile paketlenemez. Bu yüzden 'swisseph' paketini
 * "sunucu harici paket" (server external package) olarak işaretliyoruz ki Next.js bu paketi
 * paketlemeye çalışmadan doğrudan Node.js'in kendi require() mekanizmasıyla yüklesin.
 *
 * Next.js 14.2 ve öncesinde bu ayar `experimental.serverComponentsExternalPackages` altında
 * tanımlanır. Next.js 15+ sürümlerinde bu alan kararlı hale gelmiş ve üst seviyeye taşınarak
 * `serverExternalPackages` adını almıştır. Projeyi Next.js 15'e yükseltirseniz aşağıdaki
 * bloğu şu şekilde güncelleyin:
 *
 *   const nextConfig = {
 *     serverExternalPackages: ['swisseph'],
 *   };
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['swisseph'],
  },
};

export default nextConfig;