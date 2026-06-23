import type { Config } from "tailwindcss";

/**
 * Tailwind is the layout/sizing layer used by @atlys/design-system.
 * Colors/radii below mirror Atlys tokens via CSS variables defined in
 * app/globals.css. Replace the fallback values with the exact token values
 * from @atlys/design-system once the package is wired.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "var(--atlys-brand-blue, #1F6FFF)",
          black: "var(--atlys-black, #0B0B0F)",
          red: "var(--atlys-red, #E5484D)",
        },
        surface: "var(--atlys-surface, #F6F7F9)",
        line: "var(--atlys-border, #E6E8EC)",
        muted: "var(--atlys-muted, #5B6470)",
      },
      borderRadius: {
        atlys: "var(--atlys-radius, 12px)",
      },
      boxShadow: {
        atlys: "var(--atlys-shadow, 0 1px 2px rgba(11,11,15,.06), 0 8px 24px rgba(11,11,15,.06))",
      },
    },
  },
  plugins: [],
};

export default config;
