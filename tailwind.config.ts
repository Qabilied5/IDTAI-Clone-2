import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        panel: "var(--color-panel)",
        "panel-raised": "var(--color-panel-raised)",
        border: "var(--color-border)",
        ink: "var(--color-text-primary)",
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
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        sm: "2px",
      },
    },
  },
  plugins: [],
};

export default config;