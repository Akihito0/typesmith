import { test, expect, type Page } from "@playwright/test";

// Visual regression baselines.
//
// Baselines are Linux PNGs produced by .github/workflows/visual-baselines.yml
// (they cannot be generated from macOS — the rasterisation differs enough to
// fail every comparison). Workflow: make your UI change, merge it, then run
// that workflow to refresh e2e/__screenshots__/ and review the diff in the PR.
//
// This project is excluded from the default run — see playwright.config.ts.

/** Webfonts and the reveal animations both settle before we shoot. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

test.describe("landing", () => {
  test("hero", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    // The hero showcase cycles through screenshots on a timer; mask it so the
    // frame it happens to be on doesn't fail the run.
    await expect(page).toHaveScreenshot("landing-hero.png", {
      mask: [page.locator("[data-showcase]")],
    });
  });

  test("editions", async ({ page }) => {
    await page.goto("/#editions");
    await settle(page);
    await expect(page.locator("#editions")).toHaveScreenshot("landing-editions.png");
  });
});

test.describe("editor", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Deterministic starting state: no restored session, no share param.
      window.localStorage.clear();
    });
  });

  test("type scale panel", async ({ page }) => {
    await page.goto("/editor");
    await settle(page);
    await expect(page).toHaveScreenshot("editor-type-scale.png");
  });

  test("style guide panel", async ({ page }) => {
    await page.goto("/editor");
    await page.getByRole("button", { name: "Style Guide" }).click();
    await settle(page);
    await expect(page).toHaveScreenshot("editor-style-guide.png");
  });

  test("colors panel", async ({ page }) => {
    await page.goto("/editor");
    await page.getByRole("button", { name: "Colors" }).click();
    await settle(page);
    await expect(page).toHaveScreenshot("editor-colors.png");
  });

  test("website mockup", async ({ page }) => {
    await page.goto("/editor");
    await page.getByRole("button", { name: "Website" }).click();
    await settle(page);
    await expect(page).toHaveScreenshot("editor-website.png");
  });
});
