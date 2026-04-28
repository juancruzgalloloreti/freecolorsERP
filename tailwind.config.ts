import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#06080f',
          secondary: '#0c0f1d',
          card: '#111427',
          hover: '#181c35',
        },
        accent: {
          purple: '#7c3aed',
          'purple-hover': '#6d28d9',
          blue: '#3b82f6',
        },
        border: {
          DEFAULT: '#1e2240',
          light: '#252950',
        },
        fc: {
          text: '#e8e9f3',
          muted: '#8086a8',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
