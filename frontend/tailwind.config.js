/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern Cyber Clean Theme
        primary: {
          DEFAULT: '#8B5CF6', // Lila
          light: '#A78BFA',
          dark: '#7C3AED',
        },
        secondary: {
          DEFAULT: '#06B6D4', // Cyan (gedämpft)
          light: '#22D3EE',
          dark: '#0891B2',
        },
        accent: {
          DEFAULT: '#A78BFA', // Hell Lila
          light: '#C4B5FD',
          dark: '#8B5CF6',
        },
        success: '#10B981', // Grün für Wins
        error: '#EF4444', // Rot für Losses
        warning: '#F59E0B', // Orange
        info: '#64748B', // Slate (Blau-Grau Mix)

        // Backgrounds (weniger dunkel, kein Grün)
        background: {
          DEFAULT: '#1A1F2E', // Dunkelblau-Grau
          light: '#242B3D',
        },
        surface: {
          DEFAULT: '#242B3D', // Blau-Grau
          elevated: '#2D3548', // Heller für Cards
          hover: '#343D52',
        },

        // Text Colors
        text: {
          primary: '#F1F5F9', // Slate 100
          secondary: '#CBD5E1', // Slate 300
          muted: '#94A3B8', // Slate 400
        },

        // Borders
        border: {
          DEFAULT: 'rgba(71, 85, 105, 0.3)', // Subtil
          light: 'rgba(100, 116, 139, 0.2)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        'lg': '8px',
        'md': '6px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-sm': '0 0 10px rgba(139, 92, 246, 0.2)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-down': 'slideDown 0.5s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { maxHeight: '0', opacity: '0' },
          '100%': { maxHeight: '200px', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
