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
      // Paleta de la marca (rediseño 2026): azul petróleo + verde menta, sin degradés.
      // OJO: la escala `teal` se REDEFINE como azul petróleo para retematizar
      // todo el sistema sin tocar cada clase (teal-700 = #25496d, el azul del flyer).
      colors: {
        teal: {
          50:  '#f0f5fa',
          100: '#dfe9f3',
          200: '#c4d6e4',
          300: '#9bb8d0',
          400: '#6c92b4',
          500: '#47709a',
          600: '#345c86',
          700: '#25496d',
          800: '#1e3c5a',
          900: '#172e46',
          950: '#0e1e30',
        },
        // Acento de acción: verde menta vivo (#1ee5a3 = menta-500).
        menta: {
          50:  '#e8fdf4',
          100: '#ccfae6',
          200: '#9df3cf',
          300: '#66ecb9',
          400: '#3ce6a9',
          500: '#1ee5a3',
          600: '#10c489',
          700: '#0d9c6e',
          800: '#0f7a58',
          900: '#0f6249',
          950: '#073d2d',
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
