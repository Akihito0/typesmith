import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests only — they cover backend/ (the framework-free logic layer).
// The Playwright e2e specs in e2e/ use their own runner.
export default defineConfig({
  // Same `@/*` -> repo root alias as tsconfig, so specs import modules by the
  // exact path the app uses.
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["backend/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["backend/**"],
      exclude: ["backend/**/__tests__/**"],
      // Floors sit just under current coverage (the pure math is ~100%;
      // store/workspace wiring is exercised by the e2e suite instead).
      thresholds: {
        statements: 60,
        branches: 55,
        functions: 50,
        lines: 60,
      },
    },
  },
});
