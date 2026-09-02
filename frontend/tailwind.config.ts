import path from "node:path";
import type { Config } from "tailwindcss";

/** Chrome colours come from CSS variables so one attribute on <html> repaints
 * the app. Channels are stored space-separated ("17 24 39") so Tailwind's
 * opacity modifiers — bg-ink/40, bg-brand-600/10 — keep working. */
function token(name: string) {
  return `rgb(var(--c-${name}) / <alpha-value>)`;
}

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
        // Brand accent — pulled from the Color Contrast screen
        // ("Primary Blue #2563eb"). The numeric scale is fixed in both themes:
        // these are fills that carry white text, so lightening them in dark
        // mode would break the contrast they exist to provide.
        brand: {
          50: token("brand-50"),
          100: token("brand-100"),
          500: "#2563eb",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
        },
        // Brand as *text* on chrome. Separate from the scale above because it
        // has to lighten in dark mode while the fills stay saturated.
        accent: token("accent"),
        // App chrome. Every one of these flips with the theme — see the
        // :root / [data-app-theme="dark"] blocks in styles/globals.css.
        panel: token("panel"),
        surface: token("surface"),
        sidebar: token("sidebar"),
        line: token("line"),
        ink: token("ink"),
        // The playground backdrop the frames sit on — chrome, not artwork.
        plane: token("plane"),
        muted: token("muted"),
        // Editor canvas (deliberately dark in both themes — the landing page
        // and the playground tool dock are built on it).
        canvas: {
          DEFAULT: "#171717",
          panel: "#1f1f1f",
          line: "#2b2b2b",
          code: "#0e0f13",
        },
        pass: { DEFAULT: token("pass"), 50: token("pass-50") },
        fail: { DEFAULT: token("fail"), 50: token("fail-50") },
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
