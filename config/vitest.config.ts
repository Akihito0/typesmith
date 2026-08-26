import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests only — they cover backend/ (the framework-free logic layer).
// The Playwright e2e specs in e2e/ use their own runner.
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  // This config lives in config/, so every path below is anchored to the
  // repo root rather than to the config file.
  root: repoRoot,
  // Same `@/*` -> repo root alias as tsconfig, so specs import modules by the
  // exact path the app uses.
  resolve: {
    alias: { "@": repoRoot },
  },
  test: {
    include: ["backend/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Source files only — a stray README in backend/ is not coverage input.
      include: ["backend/**/*.ts"],
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
