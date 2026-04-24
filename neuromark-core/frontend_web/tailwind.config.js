/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    { pattern: /text-(cyber-blue|cyber-red|cyber-neon|cyber-purple|gray-500)/ },
    { pattern: /border-(cyber-blue|cyber-red|cyber-neon|cyber-purple|gray-500)/ },
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          900: '#0a0a0f',
          800: '#11111a',
          blue: '#00f0ff',
          purple: '#8a2be2',
          neon: '#39ff14',
          red: '#ff003c'
        }
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #1f2937 1px, transparent 1px), linear-gradient(to bottom, #1f2937 1px, transparent 1px)"
      }
    },
  },
  plugins: [],
}
