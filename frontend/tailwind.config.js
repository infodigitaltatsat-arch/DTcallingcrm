/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        royal: {
          950: '#000511',
          900: '#01103a',
          800: '#0c235c',
          700: '#17367e',
          600: '#1d4ed8',
          500: '#3b82f6',
          400: '#60a5fa',
        },
        dark: {
          950: '#030712',
          900: '#0b0f19',
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-royal': '0 0 15px rgba(59, 130, 246, 0.15)',
        'glow-royal-lg': '0 0 25px rgba(59, 130, 246, 0.25)',
      }
    },
  },
  plugins: [],
}
