import { test, expect } from "@playwright/test";

// Landing page: the renamed nav, the eased in-page scroll, and the secondary
// "Elsewhere" pages (changelog, privacy, terms) all resolve and render.

test("nav shows the renamed sections", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Preview" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Features" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Editions" })).toBeVisible();
});

test("clicking a nav section scrolls down and updates the hash", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.getByRole("navigation").getByRole("link", { name: "Features" }).click();

  // The eased scroll settles asynchronously; wait for it to move off the top.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await expect(page).toHaveURL(/#features$/);
});

test("clicking Preview returns to a clean first screen (no bleed)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Editions" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

  await page.getByRole("navigation").getByRole("link", { name: "Preview" }).click();
  // Preview resolves to the very top — the first screen with nothing above it.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("footer links reach the Elsewhere pages", async ({ page }) => {
  await page.goto("/changelog");
  await expect(page.getByRole("heading", { name: "Changelog", level: 1 })).toBeVisible();
  await expect(page.getByText("First beta")).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy", level: 1 })).toBeVisible();
  await expect(page.getByText("The short version")).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of use", level: 1 })).toBeVisible();
  await expect(page.getByText("No warranty")).toBeVisible();
});

test("a doc page can navigate home through the nav", async ({ page }) => {
  await page.goto("/privacy");
  await page.getByRole("navigation").getByRole("link", { name: "Preview" }).click();
  await expect(page).toHaveURL(/\/(#preview)?$/);
  await expect(page.getByRole("heading", { level: 1, name: /Precision/ })).toBeVisible();
});
