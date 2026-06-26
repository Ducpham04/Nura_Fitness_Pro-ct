/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#050505',
        charcoal: '#121216',
        surface: '#18181c',
        lime: {
          DEFAULT: '#CCFF00',
          dark: '#99CC00',
          muted: 'rgba(204,255,0,0.12)',
        },
        electric: {
          DEFAULT: '#007AFF',
          dark: '#0055CC',
          muted: 'rgba(0,122,255,0.12)',
        },
        danger: '#FF3B30',
        warning: '#FF9500',
        success: '#30D158',
        neutral: {
          50: '#f8f8f8',
          100: '#e8e8e8',
          200: '#c8c8c8',
          300: '#a0a0a0',
          400: '#707070',
          500: '#505050',
          600: '#383838',
          700: '#282828',
          800: '#1e1e1e',
          900: '#141414',
        },
      },
      fontFamily: {
        grotesk: ['Space Grotesk', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      backdropBlur: {
        xs: '4px',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'scan': 'scan 2.5s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'particle': 'particle 8s linear infinite',
        'ring-pulse': 'ringPulse 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(204,255,0,0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(204,255,0,0.35)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        particle: {
          '0%': { transform: 'translateY(100vh) translateX(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-100px) translateX(50px)', opacity: '0' },
        },
        ringPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(204,255,0,0.4))' },
          '50%': { filter: 'drop-shadow(0 0 20px rgba(204,255,0,0.8))' },
        },
      },
    },
  },
  plugins: [],
};
