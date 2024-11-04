module.exports = {
  // ... 기존 설정 ...
  theme: {
    extend: {
      animation: {
        gradient: 'gradient 8s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
      },
    },
  },
  // ... 기존 설정 ...
} 