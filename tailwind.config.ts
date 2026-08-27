import type { Config } from "tailwindcss";

// Tailwind yapılandırması: koyu tema (dark theme) destekli, astroloji temalı
// derin lacivert/mor arka plan ve altın vurgu renkleri.
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kozmik / gece gökyüzü arka plan tonları
        cosmic: {
          950: "#05040d",
          900: "#0b0a1a",
          800: "#13112b",
          700: "#1c1940",
          600: "#28234f",
          500: "#3a3266",
        },
        // Altın / güneş vurgu rengi (astrolojik sembol ve vurgular için)
        gold: {
          400: "#f2c879",
          500: "#e8b64f",
          600: "#c9963a",
        },
        // Gezegen/burç etiketleri için ikincil vurgu (ametist)
        amethyst: {
          400: "#b48cf2",
          500: "#9a6bea",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(232, 182, 79, 0.35)",
        card: "0 10px 40px -12px rgba(0, 0, 0, 0.55)",
      },
      backgroundImage: {
        "cosmic-radial":
          "radial-gradient(circle at 50% 0%, #1c1940 0%, #0b0a1a 55%, #05040d 100%)",
      },
    },
  },
  plugins: [],
};

export default config;