/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          50:  'rgb(var(--ca-50)  / <alpha-value>)',
          100: 'rgb(var(--ca-100) / <alpha-value>)',
          300: 'rgb(var(--ca-300) / <alpha-value>)',
          400: 'rgb(var(--ca-400) / <alpha-value>)',
          500: 'rgb(var(--ca-500) / <alpha-value>)',
          600: 'rgb(var(--ca-600) / <alpha-value>)',
          700: 'rgb(var(--ca-700) / <alpha-value>)',
          900: 'rgb(var(--ca-900) / <alpha-value>)',
        },
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'snack-up': {
          from: { opacity: '0', transform: 'translate(-50%, 12px)' },
          to:   { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.18s ease-out both',
        'snack-up': 'snack-up 0.2s ease-out both',
      },
    },
  },
  plugins: [],
}
