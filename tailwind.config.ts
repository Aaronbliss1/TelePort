import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // TelePort palette — a dark ledger with a single USDC-blue accent.
        // Values reference CSS variables (see globals.css) so the whole app
        // flips between dark/light via a single `.light` class on <html>.
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
        },
        paper: {
          100: 'rgb(var(--paper-100) / <alpha-value>)',
          300: 'rgb(var(--paper-300) / <alpha-value>)',
          500: 'rgb(var(--paper-500) / <alpha-value>)',
        },
        signal: {
          DEFAULT: 'rgb(var(--signal) / <alpha-value>)',
          dim: 'rgb(var(--signal-dim) / <alpha-value>)',
          glow: 'rgb(var(--signal-glow) / <alpha-value>)',
        },
        gain: 'rgb(var(--gain) / <alpha-value>)',
        loss: 'rgb(var(--loss) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        sm: '4px',
      },
    },
  },
  plugins: [],
};

export default config;
