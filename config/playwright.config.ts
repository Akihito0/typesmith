import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// E2E suite. Runs against a production server on port 3100 so a local
// `npm run dev` on 3000 is never disturbed. Run `npm run build` first —
// the webServer step only starts, it doesn't build.
// This config lives in config/, and Playwright resolves testDir, outputDir,
// reporter folders and webServer.cwd relative to the config file — so anchor
// everything that leaves this folder to the repo root. CI uploads
// playwright-report/ from the root; it must not land in config/.
// Playwright loads this config as CommonJS, so __dirname rather than
// import.meta.url.
const repoRoot = path.resolve(__dirname, "..");

export default defineConfig({
  testDir: "../e2e",
  outputDir: "../test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "../playwright-report" }]]
    : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  // Screenshot baselines are platform-specific and are generated on Linux by
  // the visual-baselines workflow — never from a developer's macOS machine.
  // Dropping the platform suffix keeps that explicit: there is exactly one set
  // of baselines and it belongs to CI.
  snapshotPathTemplate: "../e2e/__screenshots__/{testFileName}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      // Font rasterisation and webfont timing move a few pixels around even on
      // a fixed platform; this catches layout regressions, not sub-pixel noise.
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
      caret: "hide",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /visual\.spec\.ts/,
    },
    {
      // Opt-in via `npm run test:visual` — `npm run test:e2e` pins itself to
      // the chromium project so a missing or stale baseline can never block
      // the functional suite.
      name: "visual",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      testMatch: /visual\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npx next start -p 3100",
    cwd: repoRoot,
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
