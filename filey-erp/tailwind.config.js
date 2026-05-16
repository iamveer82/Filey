/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary — Montek blue
        primary: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        // `brand-*` is used app-wide as the neutral utility ramp (Slate)
        brand: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        // emerald-* kept as an alias so existing usages render success-green
        emerald: {
          400: "#34D399",
          500: "#16C784",
          600: "#0FA968",
        },
        success: "#16C784",
        info: "#0EA5E9",
        warning: "#F59E0B",
        danger: "#EF4444",
        accentpurple: "#7C3AED",
        ink: "#0F172A",
        canvas: "#F8FAFC",
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        lg: "12px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        bento: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        "bento-hover":
          "0 10px 24px rgba(37,99,235,0.10), 0 4px 8px rgba(15,23,42,0.06)",
      },
    },
  },
  plugins: [],
};
