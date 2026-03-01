/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        earth: {
          50:  "#fdf8f0",
          100: "#faefd8",
          200: "#f4d9a0",
          300: "#ebbf5e",
          400: "#e0a030",
          500: "#c97f1a",
          600: "#a66015",
          700: "#854813",
          800: "#6e3a15",
          900: "#5c3113",
        },
      },
      fontFamily: {
        display: ["'Nunito'", "sans-serif"],
        body:    ["'Nunito Sans'", "sans-serif"],
      },
      animation: {
        "slide-up":   "slideUp 0.3s ease-out",
        "fade-in":    "fadeIn 0.25s ease-out",
        "bounce-in":  "bounceIn 0.4s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        slideUp:   { from: { transform: "translateY(20px)", opacity: 0 }, to: { transform: "translateY(0)", opacity: 1 } },
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        bounceIn:  { "0%": { transform: "scale(0.8)", opacity: 0 }, "70%": { transform: "scale(1.05)" }, "100%": { transform: "scale(1)", opacity: 1 } },
        pulseSoft: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
};
