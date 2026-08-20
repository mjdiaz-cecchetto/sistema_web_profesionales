/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Paleta de la marca: verde pastel fijo (sin degradés).
      colors: {
        teal: {
          50:  '#f2faf6',
          100: '#e4f4eb',
          200: '#c9e9d8',
          300: '#a9dabf',
          400: '#83c7a4',
          500: '#62b28b',
          600: '#4a9974',
          700: '#3b7d5f',
          800: '#315f4b',
          900: '#2a4d3e',
          950: '#1b3229',
        },
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgb(28 25 23 / 0.05)',
        'lift': '0 6px 20px -6px rgb(28 25 23 / 0.10)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.25s ease-out both',
      },
    },
  },
  plugins: [],
}
