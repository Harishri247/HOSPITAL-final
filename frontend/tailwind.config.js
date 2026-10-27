/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        palette: {
          blue: '#2563EB',
          sky: '#38BDF8',
          royal: '#1D4ED8',
          navy: '#1E40AF',
          ice: '#93C5FD',
          cyan: '#38BDF8',
          purple: '#1E40AF',
          pink: '#60A5FA',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2563EB',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
        },
        navy: {
          800: '#0f172a',
          900: '#020617',
        }
      }
    },
  },
  plugins: [],
}
