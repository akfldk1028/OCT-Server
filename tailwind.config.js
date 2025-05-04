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
  safelist: [ // safelist 추가
    {
      pattern: /^bg-(red|green|blue|purple|indigo|yellow|pink|gray)-(400|500|600)$/, // 필요한 색상/명암 패턴 정의
      // 예시: red, green, ..., gray 색상의 400, 500, 600 명암을 안전목록에 추가
    },
    // 또는 특정 클래스 직접 지정:
    // 'bg-purple-500',
    // 'bg-red-600',
  ]
};
