import type { Config } from "tailwindcss";

/**
 * Fas-Nav.ch Design-System
 *
 * Sämtliche Farbwerte stehen als CSS-Variablen in src/app/globals.css und
 * werden hier nur noch verknüpft. Dadurch gilt jede Farbe an genau einer
 * Stelle und der dunkle Modus entsteht durch andere Variablenwerte statt
 * durch zusätzliche Klassen in den Komponenten.
 *
 * Die neutralen Stufen sind auch unter dem Namen "slate" erreichbar: Die
 * Anwendung nutzt diese Schreibweise an vielen Stellen für Fliesstext, und so
 * folgt sie automatisch dem Thema, statt in einem festen Grau zu verharren.
 */
const withOpacity = (variable: string) => `hsl(var(${variable}) / <alpha-value>)`;

const neutral = {
  50: withOpacity("--neutral-50"),
  100: withOpacity("--neutral-100"),
  200: withOpacity("--neutral-200"),
  300: withOpacity("--neutral-300"),
  400: withOpacity("--neutral-400"),
  500: withOpacity("--neutral-500"),
  600: withOpacity("--neutral-600"),
  700: withOpacity("--neutral-700"),
  800: withOpacity("--neutral-800"),
  900: withOpacity("--neutral-900"),
  950: withOpacity("--neutral-950"),
};

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
        border: withOpacity("--border"),
        input: withOpacity("--input"),
        ring: withOpacity("--ring"),
        background: withOpacity("--background"),
        foreground: withOpacity("--foreground"),

        surface: {
          DEFAULT: withOpacity("--surface"),
          secondary: withOpacity("--surface-secondary"),
        },

        /** Bewusst dunkle Markenflächen – in beiden Modi dunkel. */
        brand: {
          DEFAULT: withOpacity("--brand-surface"),
          strong: withOpacity("--brand-surface-strong"),
          foreground: withOpacity("--brand-surface-foreground"),
          accent: withOpacity("--brand-accent"),
        },

        primary: {
          DEFAULT: withOpacity("--primary"),
          foreground: withOpacity("--primary-foreground"),
          50: withOpacity("--primary-50"),
          100: withOpacity("--primary-100"),
          200: withOpacity("--primary-200"),
          300: withOpacity("--primary-300"),
          400: withOpacity("--primary-400"),
          500: withOpacity("--primary-500"),
          600: withOpacity("--primary-600"),
          700: withOpacity("--primary-700"),
          800: withOpacity("--primary-800"),
          900: withOpacity("--primary-900"),
          950: withOpacity("--primary-950"),
        },
        accent: {
          DEFAULT: withOpacity("--accent"),
          foreground: withOpacity("--accent-foreground"),
          50: withOpacity("--accent-50"),
          100: withOpacity("--accent-100"),
          200: withOpacity("--accent-200"),
          300: withOpacity("--accent-300"),
          400: withOpacity("--accent-400"),
          500: withOpacity("--accent-500"),
          600: withOpacity("--accent-600"),
          700: withOpacity("--accent-700"),
          800: withOpacity("--accent-800"),
          900: withOpacity("--accent-900"),
        },
        gold: {
          50: withOpacity("--gold-50"),
          100: withOpacity("--gold-100"),
          200: withOpacity("--gold-200"),
          300: withOpacity("--gold-300"),
          400: withOpacity("--gold-400"),
          500: withOpacity("--gold-500"),
          600: withOpacity("--gold-600"),
          700: withOpacity("--gold-700"),
          800: withOpacity("--gold-800"),
          900: withOpacity("--gold-900"),
        },

        secondary: {
          DEFAULT: withOpacity("--secondary"),
          foreground: withOpacity("--secondary-foreground"),
        },
        muted: {
          DEFAULT: withOpacity("--muted"),
          foreground: withOpacity("--muted-foreground"),
        },
        card: {
          DEFAULT: withOpacity("--card"),
          foreground: withOpacity("--card-foreground"),
        },
        popover: {
          DEFAULT: withOpacity("--popover"),
          foreground: withOpacity("--popover-foreground"),
        },
        destructive: {
          DEFAULT: withOpacity("--destructive"),
          foreground: withOpacity("--destructive-foreground"),
        },
        success: {
          DEFAULT: withOpacity("--success"),
          foreground: withOpacity("--success-foreground"),
        },
        warning: {
          DEFAULT: withOpacity("--warning"),
          foreground: withOpacity("--warning-foreground"),
        },
        info: {
          DEFAULT: withOpacity("--info"),
          foreground: withOpacity("--info-foreground"),
        },

        // Neutrale Stufen, zusätzlich unter dem in der Anwendung verbreiteten
        // Namen "slate" erreichbar.
        neutral,
        slate: neutral,

        // Statusfarben als Skala, damit vorhandene Klassen wie
        // "bg-emerald-100" oder "text-red-700" dem Thema folgen.
        // Jede Stufe, die im Code vorkommt, braucht hier einen Eintrag. Fehlt
        // einer, greift Tailwind still auf seine eingebaute Palette zurück –
        // die Farbe bleibt dann im Dunkelmodus hell.
        red: {
          50: withOpacity("--danger-50"),
          100: withOpacity("--danger-100"),
          200: withOpacity("--danger-200"),
          300: withOpacity("--danger-300"),
          400: withOpacity("--danger-400"),
          500: withOpacity("--danger-500"),
          600: withOpacity("--danger-500"),
          700: withOpacity("--danger-700"),
          800: withOpacity("--danger-800"),
          900: withOpacity("--danger-800"),
        },
        emerald: {
          50: withOpacity("--positive-50"),
          100: withOpacity("--positive-100"),
          200: withOpacity("--positive-200"),
          300: withOpacity("--positive-300"),
          400: withOpacity("--positive-400"),
          500: withOpacity("--positive-500"),
          600: withOpacity("--positive-500"),
          700: withOpacity("--positive-700"),
          800: withOpacity("--positive-800"),
          900: withOpacity("--positive-800"),
        },
        amber: {
          50: withOpacity("--gold-50"),
          100: withOpacity("--gold-100"),
          200: withOpacity("--gold-200"),
          300: withOpacity("--gold-300"),
          400: withOpacity("--gold-400"),
          500: withOpacity("--gold-500"),
          600: withOpacity("--gold-600"),
          700: withOpacity("--gold-700"),
          800: withOpacity("--gold-800"),
          900: withOpacity("--gold-900"),
        },
        sky: {
          50: withOpacity("--sky-50"),
          100: withOpacity("--sky-100"),
          200: withOpacity("--sky-200"),
          300: withOpacity("--sky-300"),
          400: withOpacity("--sky-400"),
          500: withOpacity("--sky-500"),
          600: withOpacity("--sky-600"),
          700: withOpacity("--sky-700"),
          800: withOpacity("--sky-800"),
          900: withOpacity("--sky-900"),
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
        subtle:
          "0 1px 2px 0 hsl(var(--shadow-color) / var(--shadow-opacity-subtle)), 0 1px 3px 0 hsl(var(--shadow-color) / var(--shadow-opacity-subtle))",
        card: "0 2px 4px -2px hsl(var(--shadow-color) / var(--shadow-opacity-subtle)), 0 8px 20px -8px hsl(var(--shadow-color) / var(--shadow-opacity-card))",
        lift: "0 8px 16px -8px hsl(var(--shadow-color) / var(--shadow-opacity-card)), 0 20px 40px -16px hsl(var(--shadow-color) / var(--shadow-opacity-card))",
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
