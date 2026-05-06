/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0B1C2C",   // main dark background
        secondary: "#112B3C", // cards
        accent: "#00C2FF",    // highlights
      },
    },
  },
  plugins: [],
};