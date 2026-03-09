import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef9ee',
          100: '#fdf0d4',
          200: '#faddaa',
          300: '#f6c174',
          400: '#f1993a',
          500: '#ed7c18',
          600: '#de600e',
          700: '#b8470e',
          800: '#933712',
          900: '#782f11',
          950: '#411506',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [typography],
};
