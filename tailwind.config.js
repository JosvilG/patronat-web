/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin')

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      sans: ['Poppins', 'sans-serif'],
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      // Define your custom font utilities
      const sizes = [12, 16, 20, 24, 36, 40, 64, 96]
      const weights = {
        l: 300,
        r: 400,
        s: 600,
        b: 700,
        bl: 900,
        xl: 100, // for .t64xl and .t96xl
      }
      const newUtils = {}

      sizes.forEach((size) => {
        Object.entries(weights).forEach(([suffix, weight]) => {
          // Only create xl variants for 64 and 96
          if (suffix === 'xl' && ![64, 96].includes(size)) return
          // Skip non-xl for sizes where xl is defined
          if (
            suffix !== 'xl' &&
            [64, 96].includes(size) &&
            ['xl'].includes(suffix) === false &&
            suffix === 'xl'
          )
            return

          const className = `.t${size}${suffix}`
          newUtils[className] = {
            fontSize: `${size}px`,
            fontWeight: weight,
            fontFamily: `'Poppins', sans-serif`,
          }
        })
      })

      // Register utilities with responsive variants
      addUtilities(newUtils, ['responsive'])
    }),
  ],
}
