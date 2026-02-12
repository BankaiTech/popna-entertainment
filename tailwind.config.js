/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#009ef7',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#7239ea',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#f5f8fa',
          foreground: '#a1a5b7',
        },
        border: '#e4e6ef',
        background: '#ffffff',
        foreground: '#181c32',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#181c32',
        },
        accent: {
          DEFAULT: '#f5f8fa',
          foreground: '#181c32',
        },
        destructive: {
          DEFAULT: '#f1416c',
          foreground: '#ffffff',
        },
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.08)',
        'soft-xl': '0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'card': '0.75rem',
        'modal': '1rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}
