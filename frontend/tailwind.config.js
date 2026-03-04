/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00498C",
        "background-dark": "#0f1923",
        "surface-dark": "#1a2b3c",
        "surface-dark-border": "#2a3b4c",
        "text-muted": "#8daece",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
      },
      keyframes: {
        entrance: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        entrance: 'entrance 0.6s ease-out forwards',
        float: 'float 3s ease-in-out infinite',
        shine: 'shine 3s ease-in-out infinite',
        fadeInUp: 'fadeInUp 0.5s ease-out',
      },
    },
  },
  plugins: [],
}
