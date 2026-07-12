import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand accent — pulled from the Color Contrast screen ("Primary Blue #2563eb")
        brand: {
          50: "#eff4ff",
          100: "#dbe6ff",
          500: "#2563eb",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
        },
        // App chrome (light)
        surface: "#f8f9fb",
        sidebar: "#fbfbfd",
        line: "#e6e8ec",
        ink: "#111827",
        muted: "#6b7280",
        // Editor canvas (dark)
        canvas: {
          DEFAULT: "#171717",
          panel: "#1f1f1f",
          line: "#2b2b2b",
          code: "#0e0f13",
        },
        pass: "#16a34a",
        fail: "#dc2626",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        display: ["Space Grotesk", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.06)",
        modal: "0 24px 64px rgba(16,24,40,0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
