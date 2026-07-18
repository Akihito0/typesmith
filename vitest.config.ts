import { defineConfig } from "vitest/config";

// Unit tests only — the Playwright e2e specs in e2e/ use their own runner.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
