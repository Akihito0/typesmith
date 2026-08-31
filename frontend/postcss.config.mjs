import path from "node:path";
import { fileURLToPath } from "node:url";

// Tailwind auto-discovers its config from the working directory, which is the
// repo root (`next build frontend`) — so point at it explicitly, or Tailwind
// silently falls back to its default config and emits preflight only.
const here = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    tailwindcss: { config: path.join(here, "tailwind.config.ts") },
    autoprefixer: {},
  },
};
