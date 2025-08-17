/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        teak: {
          dark: '#4b371c',
          light: '#a67843',
          cream: '#f7f2e8',
          olive: '#6d8c6a',
          graphite: '#2a2a2a'
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'serif'],
        sans: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
};