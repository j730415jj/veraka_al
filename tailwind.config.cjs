/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",       // 혹시 몰라 남겨둠
    "./components/**/*.{js,ts,jsx,tsx}", // 👈 [중요] 여기가 진짜 파일들이 있는 곳입니다!
    "./*.{js,ts,jsx,tsx}"                // App.tsx, main.tsx 같은 바깥 파일들
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}