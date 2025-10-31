const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#edf5ff",
          100: "#d7e8ff",
          200: "#b3d2ff",
          300: "#84b3ff",
          400: "#4d89ff",
          500: "#1f5dff",
          600: "#0d3fe6",
          700: "#0a32b4",
          800: "#0f2b87",
          900: "#122666",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
