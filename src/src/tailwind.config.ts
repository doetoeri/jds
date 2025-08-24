
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['"Gowun Dodum"', 'sans-serif'],
        headline: ['"Gowun Batang"', 'serif'],
        code: ['monospace'],
        batang: ['"Gowun Batang"', 'serif'],
      },
      boxShadow: {
        'soft-lg': '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05)',
        'soft-xl': '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
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
      },
      borderRadius: {
        lg: "1rem",
        md: "calc(1rem - 4px)",
        sm: "calc(1rem - 8px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "collapsible-down": { from: { height: "0" }, to: { height: "var(--radix-collapsible-content-height)" } },
        "collapsible-up": { from: { height: "var(--radix-collapsible-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        "slide-in-from-top": { from: { transform: "translateY(-100%)" }, to: { transform: "translateY(0)" } },
        "slide-out-to-top": { from: { transform: "translateY(0)" }, to: { transform: "translateY(-100%)" } },
        "slide-in-from-bottom": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "slide-out-to-bottom": { from: { transform: "translateY(0)" }, to: { transform: "translateY(100%)" } },
        "slide-in-from-left": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        "slide-out-to-left": { from: { transform: "translateX(0)" }, to: { transform: "translateX(-100%)" } },
        "slide-in-from-right": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "slide-out-to-right": { from: { transform: "translateX(0)" }, to: { transform: "translateX(100%)" } },
        "zoom-in": { from: { transform: "scale(0.95)" }, to: { transform: "scale(1)" } },
        "zoom-out": { from: { transform: "scale(1)" }, to: { transform: "scale(0.95)" } },
        'highlight-pulse': {
          '0%': { 'box-shadow': '0 0 0 0px hsl(var(--primary) / 0.5)' },
          '100%': { 'box-shadow': '0 0 0 10px hsl(var(--primary) / 0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'collapsible-down': 'collapsible-down 0.2s ease-out',
        'collapsible-up': 'collapsible-up 0.2s ease-out',
        'highlight-pulse': 'highlight-pulse 2s ease-out infinite',
        "in": "fade-in 200ms ease-out, zoom-in 200ms ease-out",
        "out": "fade-out 200ms ease-in, zoom-out 200ms ease-in",
        "in-from-top": "slide-in-from-top 200ms ease-out, fade-in 200ms ease-out",
        "out-to-top": "slide-out-to-top 200ms ease-in, fade-out 200ms ease-in",
        "in-from-bottom": "slide-in-from-bottom 200ms ease-out, fade-in 200ms ease-out",
        "out-to-bottom": "slide-out-to-bottom 200ms ease-in, fade-out 200ms ease-in",
        "in-from-left": "slide-in-from-left 200ms ease-out, fade-in 200ms ease-out",
        "out-to-left": "slide-out-to-left 200ms ease-in, fade-out 200ms ease-in",
        "in-from-right": "slide-in-from-right 200ms ease-out, fade-in 200ms ease-out",
        "out-to-right": "slide-out-to-right 200ms ease-in, fade-out 200ms ease-in",
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
