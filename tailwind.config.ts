import type { Config } from "tailwindcss";

/**
 * Fas-Nav.ch Design-System
 * Farbwelt: tiefes Nachtblau (Seriosität, Schweizer Zurückhaltung) mit
 * einem warmen Fasnachts-Akzent. Bewusst reduziert, nicht plakativ.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "hsl(215 60% 97%)",
          100: "hsl(215 55% 93%)",
          200: "hsl(215 50% 85%)",
          300: "hsl(215 45% 72%)",
          400: "hsl(215 42% 55%)",
          500: "hsl(215 48% 40%)",
          600: "hsl(216 55% 31%)",
          700: "hsl(217 60% 24%)",
          800: "hsl(218 62% 18%)",
          900: "hsl(219 65% 13%)",
          950: "hsl(220 70% 8%)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          50: "hsl(20 100% 97%)",
          100: "hsl(20 96% 92%)",
          200: "hsl(19 95% 84%)",
          300: "hsl(18 94% 73%)",
          400: "hsl(16 92% 62%)",
          500: "hsl(14 88% 52%)",
          600: "hsl(12 84% 45%)",
          700: "hsl(11 80% 37%)",
          800: "hsl(10 74% 31%)",
          900: "hsl(10 70% 26%)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        card: "0 2px 4px -2px rgb(15 23 42 / 0.06), 0 8px 20px -8px rgb(15 23 42 / 0.12)",
        lift: "0 8px 16px -8px rgb(15 23 42 / 0.14), 0 20px 40px -16px rgb(15 23 42 / 0.18)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
