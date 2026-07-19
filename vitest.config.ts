import { defineConfig } from "vitest/config";

// Unit tests only — the Playwright e2e specs in e2e/ use their own runner.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**"],
      exclude: ["lib/__tests__/**"],
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
