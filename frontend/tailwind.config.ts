import path from "node:path";
import type { Config } from "tailwindcss";

// Tailwind resolves relative content globs from the working directory, which
// is the repo root (npm scripts run `next build frontend`) — not from this
// file. Absolute paths keep them correct whatever the cwd. backend/ is scanned
// because its export templates contain class names that would otherwise be
// purged.
const here = __dirname;

const config: Config = {
  content: [
    path.join(here, "app/**/*.{ts,tsx}"),
    path.join(here, "docs/**/*.{ts,tsx}"),
    path.join(here, "editor/**/*.{ts,tsx}"),
    path.join(here, "landing/**/*.{ts,tsx}"),
    path.join(here, "system/**/*.{ts,tsx}"),
    path.join(here, "ui/**/*.{ts,tsx}"),
    path.join(here, "..", "backend/**/*.{ts,tsx}"),
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
