/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"   // 👈 이 줄이 없어서 디자인이 안 먹었던 겁니다!
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}