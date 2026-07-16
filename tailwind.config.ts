import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:   '#2D3875',
          teal:   '#2C6E6A',
          orange: '#C85A1E',
          cream:  '#EAE4D8',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['var(--font-barlow)', 'system-ui', 'sans-serif'],
        condensed: ['var(--font-barlow-condensed)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse413: {
          '0%, 100%': { opacity: '0.04' },
          '50%':      { opacity: '0.08' },
        },
      },
      animation: {
        'marquee':   'marquee 28s linear infinite',
        'fade-up':   'fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-up-d1': 'fadeUp 0.9s 0.15s cubic-bezier(0.16,1,0.3,1) both',
        'fade-up-d2': 'fadeUp 0.9s 0.30s cubic-bezier(0.16,1,0.3,1) both',
        'fade-up-d3': 'fadeUp 0.9s 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'pulse-bg':  'pulse413 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
