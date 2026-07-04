import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F2933',
        mist: '#F4F7F8',
        coral: '#E86D5A',
        sea: '#1F9D8A',
        saffron: '#D99A25',
      },
    },
  },
  plugins: [],
} satisfies Config;
