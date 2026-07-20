/** @type {import('tailwindcss').Config} */
// Theme tokens mirror docs/graphics.md §3–§5 (color, type, spacing/radius/shadow).
// Keep this file as the single source of truth for the design system in code.
import animate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand (deep liturgical blue) — graphics §3.1
        brand: {
          100: '#E6EEF9',
          500: '#3B72C4',
          700: '#1E4A8A',
          900: '#0B2B5C',
        },
        // Reserved gold accent — graphics §3.1
        accent: {
          100: '#FBF3DD',
          600: '#B98A2C',
          // shadcn semantic mapping (used by base components)
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        // Neutrals — graphics §3.2
        ink: {
          500: '#64748B',
          700: '#334155',
          900: '#0F172A',
        },
        line: {
          200: '#E2E8F0',
        },
        surface: {
          0: '#FFFFFF',
          50: '#F8FAFC',
        },
        // Semantic / status — graphics §3.3
        success: '#15803D',
        warning: '#B45309',
        danger: '#B91C1C',
        info: '#1D4ED8',
        // shadcn semantic tokens (CSS-var backed; see src/index.css)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        // Typography — graphics §4
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        serif: ['"Source Serif 4"', 'Source Serif Pro', 'Georgia', 'serif'],
        display: ['"Source Serif 4"', 'Source Serif Pro', 'Georgia', 'serif'],
      },
      fontSize: {
        // Type scale — graphics §4.1 (mobile-first; md: scales applied per-usage)
        caption: ['12px', { lineHeight: '16px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        body: ['16px', { lineHeight: '24px' }],
        h2: ['18px', { lineHeight: '26px' }],
        h1: ['20px', { lineHeight: '28px' }],
        display: ['24px', { lineHeight: '32px' }],
        'display-xl': ['32px', { lineHeight: '40px' }],
        mono: ['14px', { lineHeight: '20px' }],
      },
      maxWidth: {
        // 12-column responsive grid, max content width — graphics §5.1
        content: '1200px',
      },
      borderRadius: {
        // Corner radius scale — graphics §5.3
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        // Elevation — graphics §5.3 (only two levels)
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
        pop: '0 8px 24px rgba(15,23,42,0.10)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
};
