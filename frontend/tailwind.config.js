/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vichar Vimarsh Brand Design Tokens
        vv: {
          navy: '#1A2F46',
          'navy-deep': '#0D2035',
          'navy-rule': '#364452',
          'navy-text': '#E6ECF2',
          'navy-faint': '#8B97A3',
          'navy-muted': '#7C8793',
          
          signal: '#E65909',
          'signal-lift': '#F96E31',
          'signal-deep': '#C64200',
          'signal-navy': '#F86927',
          'signal-soft': 'rgba(230, 89, 9, 0.12)',
          
          paper: '#F6F3EE',
          'paper-deep': '#ECE9E3',
          band: '#DBE2E9',
          'band-rule': '#C5CBD2',
          
          ink: '#171E25',
          'ink-soft': '#4A545D',
          'ink-faint': '#5D646C',
          rule: '#C9CED4',
        },
        navy: {
          50: '#f6f3ee',
          100: '#dbe2e9',
          200: '#c5cbd2',
          300: '#8b97a3',
          400: '#5d646c',
          500: '#364452',
          600: '#23374d',
          700: '#1a2f46', // Primary Vichar Vimarsh Navy
          800: '#142539',
          900: '#0d2035', // Deep Vichar Vimarsh Navy
          950: '#071727',
        },
        brand: {
          50: '#fff5f0',
          100: '#ffe8dc',
          200: '#ffd0b8',
          300: '#ffb08c',
          400: '#f96e31', // Signal Lift
          500: '#e65909', // Vichar Vimarsh Primary Signal Orange
          600: '#c64200', // Signal Deep
          700: '#a33300',
          800: '#802600',
          900: '#5c1a00',
        },
      },
      fontFamily: {
        display: ['Archivo', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"Spline Sans Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'vv': '3px',
      },
    },
  },
  plugins: [],
}
