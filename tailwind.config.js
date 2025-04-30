/** @type {import('tailwindcss').Config} */
const animate = require('tailwindcss-animate');
const extendTheme = require('./themeExtend'); // 경로 맞게

module.exports = {
  darkMode: ['class'],
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}', './src/renderer/**/*.html'],
  theme: {
    extend: extendTheme,
  },
  plugins: [animate],
};
