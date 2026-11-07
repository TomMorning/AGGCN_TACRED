/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F6F2",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#14161A",
          soft: "#3A3D44",
        },
        muted: "#6E6F6B",
        line: "#E6E3DC",
        brand: {
          DEFAULT: "#0E7A61",
          deep: "#0A5C49",
          soft: "#E3F2EC",
          tint: "#F1F8F5",
        },
        warn: { DEFAULT: "#B45309", soft: "#FDF3E3" },
        danger: { DEFAULT: "#B91C1C", soft: "#FCEDED" },
        night: { DEFAULT: "#101215", 2: "#171A1F", 3: "#1F232A" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,22,26,0.04), 0 4px 16px rgba(20,22,26,0.05)",
        lift: "0 2px 4px rgba(20,22,26,0.05), 0 18px 48px rgba(20,22,26,0.10)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(.2,.7,.2,1) both",
        "fade-up-2": "fade-up 0.6s cubic-bezier(.2,.7,.2,1) 0.08s both",
        "fade-up-3": "fade-up 0.6s cubic-bezier(.2,.7,.2,1) 0.16s both",
        shimmer: "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};
