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
    'lumea-stone-700/10',
    'lumea-stone-700/20',
    'lumea-stone-700/30',
    'lumea-stone-800/10',
    'lumea-stone-600/20',
    'lumea-stone-600/30',
    'lumea-beige-DEFAULT',
    'lumea-bone-DEFAULT',
    'lumea-taupe-300',
    'lumea-sage-400',
    'lumea-sage-600',
    'dark:from-lumea-stone-700/30',
    'dark:to-lumea-stone-800/10',
    'dark:border-lumea-stone-600/20',
    'dark:border-lumea-stone-600/30',
    'dark:focus:border-lumea-sage-600',
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
        // Enhanced Lumea color palette
        lumea: {
          stone: {
            DEFAULT: '#60574D',
            50: '#F6F4F2',
            100: '#E8E4DF',
            200: '#D1C9C0',
            300: '#B9ADA0',
            400: '#8E8073',
            500: '#60574D',
            600: '#4D463E',
            700: '#39342E',
            800: '#26231F',
            900: '#13110F',
          },
          beige: {
            DEFAULT: '#F1EDE4',
            50: '#FFFFFF',
            100: '#F9F8F4',
            200: '#F1EDE4',
            300: '#E0D7C5',
            400: '#CFC1A6',
            500: '#BEAA86',
            600: '#AC9465',
            700: '#8E784C',
            800: '#6B5A39',
            900: '#493D27',
          },
          sage: {
            DEFAULT: '#8FAAA5',
            50: '#F4F7F6',
            100: '#E8EFED',
            200: '#D2DEDB',
            300: '#BCCDCA',
            400: '#A5BCB7',
            500: '#8FAAA5',
            600: '#728D87',
            700: '#5A6F6B',
            800: '#41504D',
            900: '#293230',
          },
          taupe: {
            DEFAULT: '#C8B6A6',
            50: '#FAFAF9',
            100: '#F5F1ED',
            200: '#EAE2DA',
            300: '#DFD2C7',
            400: '#D4C3B5',
            500: '#C8B6A6',
            600: '#B39883',
            700: '#9E7B61',
            800: '#7D6249',
            900: '#5C4837',
          },
          bone: {
            DEFAULT: '#DAD3C8',
            50: '#FFFFFF',
            100: '#F9F8F7',
            200: '#EEECE8',
            300: '#E4E0D9',
            400: '#DAD3C8',
            500: '#C5B9A6',
            600: '#AF9F83',
            700: '#93815E',
            800: '#706247',
            900: '#4D432F',
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
        'lumea-sm': '0 1px 3px 0 rgba(99, 102, 241, 0.1), 0 1px 2px -1px rgba(99, 102, 241, 0.1)',
        'lumea-md':
          '0 4px 6px -1px rgba(99, 102, 241, 0.1), 0 2px 4px -2px rgba(99, 102, 241, 0.1)',
        'lumea-lg': '0 8px 24px -4px rgba(96, 87, 77, 0.2)',
        'lumea-xl': '0 12px 32px -4px rgba(96, 87, 77, 0.25)',
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
        flow: {
          '0%, 100%': {
            backgroundPosition: '0% 50%',
            transform: 'translateY(0)',
          },
          '50%': {
            backgroundPosition: '100% 50%',
            transform: 'translateY(-5px)',
          },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1.0)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        flow: 'flow 15s ease infinite',
        breathe: 'breathe 8s ease-in-out infinite',
        'fade-in': 'fade-in 0.7s ease-out forwards',
        shimmer: 'shimmer 2s infinite linear',
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssRtl],
} satisfies Config;
