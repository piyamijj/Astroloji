import type { Metadata } from "next";
import "./globals.css";

/**
 * Uygulama genelinde kullanılacak meta veriler (SEO ve tarayıcı sekmesi başlığı).
 */
export const metadata: Metadata = {
  title: "Vedik Doğum Haritası | Jyotish D1 Haritası",
  description:
    "Doğum tarihi, saati ve lokasyonunuza göre Lahiri ayanamsa ile astronomik olarak doğru Vedik (Jyotish) D1 Rasi doğum haritanızı Kuzey Hindistan (baklava/elmas) formatında oluşturun.",
};

/**
 * Kök (root) yerleşim bileşeni. Tüm sayfalar bu bileşenin içine render edilir.
 * Koyu (dark) tema, kozmik gradyan arka plan ve temel tipografi burada tanımlanır.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-cosmic-radial bg-cosmic-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}