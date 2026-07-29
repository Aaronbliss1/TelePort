import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // TelePort palette — a dark ledger with a single USDC-blue accent.
        ink: {
          950: '#07090c',
          900: '#0d1117',
          800: '#151b23',
          700: '#1e2733',
          600: '#2a3542',
        },
        paper: {
          100: '#f5f7fa',
          300: '#c7d0dc',
          500: '#8b96a5',
        },
        signal: {
          DEFAULT: '#3d8bff', // USDC-esque blue, the one accent color
          dim: '#2a5db3',
          glow: '#6fa8ff',
        },
        gain: '#3ecf8e',
        loss: '#ef5350',
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
