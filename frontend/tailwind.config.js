/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Legacy dark theme (giữ nguyên, không xóa) ──
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
        // ── New Viway light theme ──
        forest: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Semantic aliases cho new theme
        brand:   '#16a34a', // primary green
        'brand-light': '#f0fdf4',
        'brand-mid':   '#22c55e',
        // New backgrounds
        'bg-page':    '#f9fafb',
        'bg-card':    '#ffffff',
        'bg-muted':   '#f3f4f6',
        // New text
        'ink':        '#111827',
        'ink-2':      '#374151',
        'ink-3':      '#6b7280',
        'ink-4':      '#9ca3af',
        // New borders
        'line':       '#e5e7eb',
        'line-2':     '#d1d5db',
        // Status colors (new)
        'ok':         '#16a34a',
        'warn-new':   '#d97706',
        'err-new':    '#dc2626',
        'info':       '#2563eb',
        // Coin / reward
        'coin':       '#f59e0b',
        'xp':         '#8b5cf6',
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
