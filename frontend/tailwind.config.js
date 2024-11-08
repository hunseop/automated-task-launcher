/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // src 폴더 안의 모든 js, jsx 파일을 대상으로 합니다.
  ],
  theme: {
    extend: {
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(8px)',
      },
    },
  },
  plugins: [
    require('tailwindcss-filters'),  // backdrop-filter 지원을 위한 플러그인
  ],
}

