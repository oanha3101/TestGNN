/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sentry: {
          purple: {
            DEFAULT: '#6a5fc1',
            deep: '#1f1633',
            darker: '#150f23',
            border: '#362d59',
            muted: '#79628c',
            violet: '#422082',
          },
          lime: '#c2ef4e',
          coral: '#ffb287',
          pink: '#fa7faa',
        }
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        sans: ['Rubik', '-apple-system', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      },
      boxShadow: {
        inset: 'rgba(0, 0, 0, 0.1) 0px 1px 3px 0px inset',
        ambient: 'rgba(22, 15, 36, 0.9) 0px 4px 4px 9px',
        card: 'rgba(0, 0, 0, 0.1) 0px 10px 15px -3px',
        prominent: 'rgba(0, 0, 0, 0.18) 0px 0.5rem 1.5rem',
      }
    },
  },
  plugins: [],
}
