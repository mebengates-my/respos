/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'espresso': '#5D4037',
        'latte': '#8D6E63',
        'accent': '#FF6F00',
        'success': '#43A047',
        'warning': '#FB8C00',
        'error': '#E53935',
        'cream': '#FFF8F0',
        'dark-roast': '#3E2723',
        'medium-roast': '#6D4C41',
      },
      fontFamily: {
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
        'pill': '24px',
      },
    },
  },
  plugins: [],
}
