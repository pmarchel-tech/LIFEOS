/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          'system-ui',
          'sans-serif',
        ],
        display: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        apple: {
          blue: '#0071e3',
          blueHover: '#0077ed',
          indigo: '#5856D6',
          purple: '#AF52DE',
          pink: '#FF2D55',
          red: '#FF3B30',
          orange: '#FF9500',
          yellow: '#FFCC00',
          green: '#34C759',
          mint: '#00C7BE',
          teal: '#30B0C7',
          cyan: '#32ADE6',
          grayBg: '#F5F5F7',
          darkBg: '#161618',
          cardDark: '#1C1C1E',
          cardDarkHover: '#2C2C2E',
        },
        brand: {
          dark: '#0B1120',
          navy: '#0F172A',
          card: '#1E293B',
          gold: '#F59E0B',
          goldLight: '#FEF3C7',
          teal: '#0D9488',
          purple: '#8B5CF6',
          emerald: '#10B981',
          rose: '#F43F5E',
          sky: '#0EA5E9'
        }
      }
    },
  },
  plugins: [],
}
