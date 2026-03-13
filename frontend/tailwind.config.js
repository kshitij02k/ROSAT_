/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563eb', dark: '#1d4ed8', light: '#eff6ff' },
        danger: { DEFAULT: '#ef4444', light: '#fee2e2' },
        warning: { DEFAULT: '#f59e0b', light: '#fef3c7' },
        success: { DEFAULT: '#10b981', light: '#d1fae5' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
