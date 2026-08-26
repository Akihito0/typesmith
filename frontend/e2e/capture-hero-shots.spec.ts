import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

// The capture script for the hero showcase (components/landing/HeroShowcase.tsx).
// TASK.md has referred to "the capture script" since round 8 — this is it.
//
//   NEXT_DIST_DIR=.next-ci npm run build
//   CAPTURE_SHOTS=1 npx playwright test capture-hero-shots
//
// It drives the editor through the same eight-beat workflow the showcase
// narrates and writes public/shots/01–08. Re-run it after any editor UI change,
// then re-check the `target` percentages in HeroShowcase.tsx — those point the
// demo cursor at a control *inside* the image, so a moved toolbar control makes
// the cursor press empty space.
//
// Skipped unless CAPTURE_SHOTS=1 so it never runs as part of the normal suite.

const OUT = path.join(process.cwd(), "public", "shots");

test.skip(process.env.CAPTURE_SHOTS !== "1", "set CAPTURE_SHOTS=1 to regenerate hero shots");

test.use({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

async function shoot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, name) });
}

test("capture the eight hero showcase frames", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/editor");
  await page.evaluate(() => document.fonts.ready);

  // 01 — defaults
  await shoot(page, "01-type-scale.png");

  // 02 — ratio tuned to 1.414
  await page.getByLabel("Ratio", { exact: true }).fill("1.414");
  await expect(page.getByLabel("Ratio", { exact: true })).toHaveValue("1.414");
  await shoot(page, "02-ratio.png");

  // 03 — heading paired with Playfair Display
  await page.getByRole("button", { name: /heading font/i }).click();
  await page.getByPlaceholder(/search/i).fill("Playfair");
  await page
    .getByRole("option", { name: /playfair display/i })
    .first()
    .click();
  await shoot(page, "03-font.png");

  // 04 — contrast checker
  await page.getByRole("button", { name: "Colors" }).click();
  await shoot(page, "04-colors.png");

  // 05 — accent recolored
  await page
    .getByLabel(/accent/i)
    .first()
    .fill("#16a34a");
  await shoot(page, "05-accent.png");

  // 06 — website mockup
  await page.getByRole("button", { name: "Website" }).click();
  await shoot(page, "06-website.png");

  // 07 — mobile width
  await page
    .getByRole("button", { name: /mobile/i })
    .first()
    .click();
  await shoot(page, "07-mobile.png");

  // 08 — assembled style guide
  await page.getByRole("button", { name: "Style Guide" }).click();
  await shoot(page, "08-style-guide.png");
});
