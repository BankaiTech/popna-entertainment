/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
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
        card: {
          DEFAULT: '#ffffff',
          foreground: '#181c32',
        },
        destructive: {
          DEFAULT: '#f1416c',
          foreground: '#ffffff',
        },
      },
    },
  },
  plugins: [],
}
