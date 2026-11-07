/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07090d",
          900: "#0c1118",
          800: "#121925",
          700: "#1a2433",
        },
        signal: {
          DEFAULT: "#34d399",
          dim: "#059669",
          glow: "#6ee7b7",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(52,211,153,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(52,211,153,0.06) 1px, transparent 1px)",
        aurora:
          "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(52,211,153,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(56,189,248,0.12), transparent 50%), radial-gradient(ellipse 50% 30% at 50% 100%, rgba(16,185,129,0.08), transparent 60%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(52,211,153,0.35)" },
          "50%": { boxShadow: "0 0 0 10px rgba(52,211,153,0)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
        "fade-up-delayed": "fade-up 0.8s ease-out 0.15s both",
        "fade-up-late": "fade-up 0.9s ease-out 0.3s both",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        scan: "scan 4s linear infinite",
      },
    },
  },
  plugins: [],
};
