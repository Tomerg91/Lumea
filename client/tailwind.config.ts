import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import tailwindcssRtl from 'tailwindcss-rtl';

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  prefix: '',
  safelist: [
    'lumea-navy-700/10',
    'lumea-navy-700/20',
    'lumea-navy-700/30',
    'lumea-navy-800/10',
    'lumea-teal-600/20',
    'lumea-teal-600/30',
    'lumea-cream-DEFAULT',
    'lumea-peach-DEFAULT',
    'lumea-golden-300',
    'lumea-coral-400',
    'lumea-teal-600',
    'dark:from-lumea-navy-700/30',
    'dark:to-lumea-navy-800/10',
    'dark:border-lumea-teal-600/20',
    'dark:border-lumea-teal-600/30',
    'dark:focus:border-lumea-teal-600',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          light: 'hsl(var(--primary-light))',
          dark: 'hsl(var(--primary-dark))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          light: 'hsl(var(--secondary-light))',
          dark: 'hsl(var(--secondary-dark))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          light: 'hsl(var(--accent-light))',
          dark: 'hsl(var(--accent-dark))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // New Color Palette
        lumea: {
          cream: {
            DEFAULT: '#FEE6BB',      /* Light cream/beige */
            50: '#FFFAF5',
            100: '#FFF4E8',
            200: '#FEE6BB',
            300: '#FDD89E',
            400: '#FCCA81',
            500: '#FBBC64',
            600: '#F9A837',
            700: '#E6941A',
            800: '#B97414',
            900: '#8C540F',
          },
          peach: {
            DEFAULT: '#EEC492',      /* Light orange/peach */
            50: '#FBF8F2',
            100: '#F6F0E5',
            200: '#EEC492',
            300: '#E5B16F',
            400: '#DC9E4C',
            500: '#D38B29',
            600: '#C07715',
            700: '#9D6011',
            800: '#7A490D',
            900: '#573309',
          },
          golden: {
            DEFAULT: '#F2C864',      /* Golden yellow */
            50: '#FDF9F0',
            100: '#FAF2E1',
            200: '#F2C864',
            300: '#EBB947',
            400: '#E4AA2A',
            500: '#DD9B0D',
            600: '#C7890A',
            700: '#A47108',
            800: '#815906',
            900: '#5E4104',
          },
          coral: {
            DEFAULT: '#F48676',      /* Coral/salmon */
            50: '#FDF6F4',
            100: '#FBEEE9',
            200: '#F48676',
            300: '#EF6A53',
            400: '#EA4E30',
            500: '#E5320D',
            600: '#CE2D0B',
            700: '#AC2509',
            800: '#8A1D07',
            900: '#681605',
          },
          teal: {
            DEFAULT: '#6D9496',      /* Teal/sage green */
            50: '#F2F6F6',
            100: '#E5EDED',
            200: '#6D9496',
            300: '#5A8284',
            400: '#477072',
            500: '#345E60',
            600: '#2F5356',
            700: '#27464B',
            800: '#1F3940',
            900: '#172C35',
          },
          navy: {
            DEFAULT: '#0B4251',      /* Dark teal/navy */
            50: '#E8F2F4',
            100: '#D1E5E9',
            200: '#A3CBD3',
            300: '#75B1BD',
            400: '#4797A7',
            500: '#197D91',
            600: '#14637B',
            700: '#0F4965',
            800: '#0B4251',      /* Main navy color */
            900: '#062F3D',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.16' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'lumea-sm': '0 1px 3px 0 rgba(11, 66, 81, 0.1), 0 1px 2px -1px rgba(11, 66, 81, 0.1)',
        'lumea-md': '0 4px 6px -1px rgba(11, 66, 81, 0.1), 0 2px 4px -2px rgba(11, 66, 81, 0.1)',
        'lumea-lg': '0 8px 24px -4px rgba(11, 66, 81, 0.2)',
        'lumea-xl': '0 12px 32px -4px rgba(11, 66, 81, 0.25)',
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '7.5': '1.875rem',
        '8.5': '2.125rem',
        '9.5': '2.375rem',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'fade-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'fade-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'slide-in-right': {
          '0%': {
            opacity: '0',
            transform: 'translateX(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        'slide-in-left': {
          '0%': {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        bounce: {
          '0%, 100%': {
            transform: 'translateY(-25%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        'bounce-gentle': {
          '0%, 100%': {
            transform: 'translateY(-5%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        'pulse-slow': {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.5',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-up': 'fade-up 0.5s ease-out',
        'fade-down': 'fade-down 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'bounce-gentle': 'bounce-gentle 2s infinite',
        'pulse-slow': 'pulse-slow 3s infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssRtl],
} satisfies Config;

