/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '{{PrimaryColor}}',
        secondary: '{{SecondaryColor}}',
        accent: '{{AccentColor}}',
        surface: '#1e293b',
        background: '#0f172a',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
