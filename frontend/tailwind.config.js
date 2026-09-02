/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: '#080810',
          card: '#0f0f1e',
          border: '#1e1e3a',
          orange: '#f97316',
          'orange-dim': '#c2601a',
          purple: '#7c3aed',
          cyan: '#06b6d4',
          gold: '#eab308',
          green: '#22c55e',
          red: '#ef4444',
        }
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #f97316, 0 0 10px #f97316' },
          '100%': { boxShadow: '0 0 20px #f97316, 0 0 40px #f97316' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      backgroundImage: {
        'arena-gradient': 'linear-gradient(135deg, #080810 0%, #0f0a1e 50%, #080810 100%)',
        'card-gradient': 'linear-gradient(145deg, #0f0f1e 0%, #14142a 100%)',
        'orange-glow': 'radial-gradient(ellipse at center, rgba(249,115,22,0.15) 0%, transparent 70%)',
      }
    }
  },
  plugins: []
}
