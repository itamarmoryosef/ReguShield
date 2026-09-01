import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        ink: {
          950: "#0b1220",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: [
          "Heebo",
          "Assistant",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16, 24, 40, 0.04), 0 1px 3px 0 rgba(16, 24, 40, 0.06)",
        "card-hover": "0 4px 12px -2px rgba(16, 24, 40, 0.08), 0 2px 6px -2px rgba(16, 24, 40, 0.06)",
        panel: "0 24px 48px -12px rgba(16, 24, 40, 0.18)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.4)" },
          "60%": { opacity: "1", transform: "scale(1.12)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        confetti: {
          "0%": { opacity: "1", transform: "translate3d(0, -10px, 0) rotate(0deg)" },
          "100%": { opacity: "0", transform: "translate3d(0, 420px, 0) rotate(540deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "fade-in-up": "fade-in-up 280ms ease-out both",
        "scale-in": "scale-in 200ms ease-out both",
        "pop-in": "pop-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        confetti: "confetti 2.4s linear forwards",
      },
    },
  },
  plugins: [],
};

export default config;
