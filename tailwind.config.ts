import type { Config } from "tailwindcss";

/* Token warna mengikuti CSS variables di src/app/globals.css.
   Nama class yang dipakai di komponen: bg-canvas, bg-panel, bg-panel-raised,
   text-ink, text-muted, text-primary, border-border, bg-accent, bg-accent-soft,
   bg-accent-mid, bg-accent-strong, bg-success, bg-danger, font-body, font-display. */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        panel: {
          DEFAULT: "var(--color-panel)",
          raised: "var(--color-panel-raised)",
        },
        border: "var(--color-border)",
        ink: "var(--color-text-primary)",
        primary: "var(--color-text-primary)",
        muted: "var(--color-text-muted)",
        accent: {
          DEFAULT: "var(--color-accent)",
          strong: "var(--color-accent-strong)",
          soft: "var(--color-accent-soft)",
          mid: "var(--color-accent-mid)",
        },
        success: "var(--color-success)",
        danger: "var(--color-danger)",
      },
      fontFamily: {
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
