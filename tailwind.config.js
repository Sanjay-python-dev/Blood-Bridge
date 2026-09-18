/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          dark: "#050508",
          charcoal: "#0e0e13",
          card: "rgba(22, 22, 28, 0.62)",
          cardHover: "rgba(28, 28, 36, 0.70)",
        },
        brand: {
          red: "#E50914",
          bright: "#FF2B2B",
          darkRed: "#990000",
          glow: "rgba(229, 9, 20, 0.35)",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#B0B0B8",
          muted: "#737380",
        },
        glass: {
          lvl1: "rgba(14, 14, 18, 0.72)",
          lvl2: "rgba(22, 22, 28, 0.62)",
          lvl3: "rgba(30, 30, 40, 0.68)",
          lvl4: "rgba(18, 18, 24, 0.88)",
          border: "rgba(255, 255, 255, 0.12)",
          borderLight: "rgba(255, 255, 255, 0.18)",
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'Outfit',
          'system-ui',
          'sans-serif'
        ],
      },
      boxShadow: {
        'red-glow': '0 0 25px rgba(229, 9, 20, 0.45)',
        'red-glow-lg': '0 0 45px rgba(229, 9, 20, 0.65)',
        'red-glow-sm': '0 0 15px rgba(229, 9, 20, 0.3)',
        'ios-card': '0 16px 40px -8px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.14)',
        'ios-elevated': '0 24px 50px -10px rgba(0, 0, 0, 0.6), inset 0 1px 1.5px rgba(255, 255, 255, 0.28)',
        'ios-floating': '0 32px 80px -12px rgba(0, 0, 0, 0.85), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.10)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.06)' },
          '70%': { transform: 'scale(1)' },
        },
      }
    },
  },
  plugins: [],
}
