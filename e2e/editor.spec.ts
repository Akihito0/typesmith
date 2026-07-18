import { test, expect } from "@playwright/test";

// End-to-end coverage of the editor: every panel renders, the core flows
// (scale editing, undo/redo, share links, export, autosave, contrast fixer,
// font picking, pro layouts) actually work in a real browser.

test.beforeEach(async ({ page }) => {
  await page.goto("/editor");
});

test("editor loads with the type scale panel", async ({ page }) => {
  await expect(page.getByText("Type Scale Generator")).toBeVisible();
  await expect(page.getByLabel("Pairing preset")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
});

test("changing the base size updates the scale rail", async ({ page }) => {
  const base = page.getByLabel("Base size", { exact: true });
  await base.fill("20");
  await expect(page.getByText("20px").first()).toBeVisible();
});

test("every sidebar panel renders", async ({ page }) => {
  await page.getByRole("button", { name: "Style Guide" }).click();
  await expect(page.getByText("Typography", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Colors" }).click();
  await expect(page.getByText("Color Contrast Checker")).toBeVisible();

  await page.getByRole("button", { name: "Website" }).click();
  await expect(page.getByText("Vantage Product")).toBeVisible();

  await page.getByRole("button", { name: "Mobile App" }).click();
  await expect(page.getByText("9:41")).toBeVisible();

  await page.getByRole("button", { name: "Slides" }).click();
  await expect(page.getByRole("button", { name: "Next →" })).toBeVisible();

  await page.getByRole("button", { name: "Social" }).click();
  await expect(page.getByText("Sponsored")).toBeVisible();

  await page.getByRole("button", { name: "Newsletter" }).click();
  await expect(page.getByText("Read the full story")).toBeVisible();
});

test("style guide is scrollable down to the color section", async ({ page }) => {
  await page.getByRole("button", { name: "Style Guide" }).click();
  const color = page.getByText("Color", { exact: true });
  await color.scrollIntoViewIfNeeded();
  await expect(color).toBeVisible();
});

test("export modal generates css and fluid clamp output", async ({ page }) => {
  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByText("--font-heading:").first()).toBeVisible();
  await page.getByRole("button", { name: "Fluid CSS" }).click();
  await expect(page.getByText("clamp(").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Export design tokens")).toHaveCount(0);
});

test("share link recreates the project", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByLabel("Project name").fill("E2E Project");
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();

  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain("/editor?s=");

  await page.goto(url);
  await expect(page.getByLabel("Project name")).toHaveValue("E2E Project");
});

test("undo and redo from the toolbar", async ({ page }) => {
  const base = page.getByLabel("Base size", { exact: true });
  await base.fill("22");
  await expect(base).toHaveValue("22");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(base).toHaveValue("16");

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(base).toHaveValue("22");
});

test("autosave restores the project after a reload", async ({ page }) => {
  const base = page.getByLabel("Base size", { exact: true });
  await base.fill("21");
  // Give the store's localStorage write a beat before reloading.
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByLabel("Base size", { exact: true })).toHaveValue("21");
});

test("contrast auto-fixer turns a failing pair into a pass", async ({ page }) => {
  await page.getByRole("button", { name: "Colors" }).click();
  await page.getByLabel("Foreground hex value").fill("#cccccc");
  await expect(page.getByText("✕ FAIL")).toBeVisible();
  await page.getByRole("button", { name: "Fix Contrast" }).click();
  await expect(page.getByText("PASS", { exact: false }).first()).toBeVisible();
});

test("font picker searches the google fonts catalog", async ({ page }) => {
  await page.getByRole("button", { name: "Heading font" }).click();
  await page.getByLabel("Search heading font").fill("Lobster");
  await page.getByRole("button", { name: "Lobster handwriting" }).click();
  await expect(page.getByRole("button", { name: "Heading font" })).toContainText("Lobster");
});

test("upgrade to pro shows the honest beta modal", async ({ page }) => {
  await page.getByRole("button", { name: "Upgrade to Pro" }).click();
  await expect(page.getByText("nothing to buy", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByText("nothing to buy", { exact: false })).toHaveCount(0);
});

test("new asset resets the project after confirmation", async ({ page }) => {
  await page.getByLabel("Project name").fill("Temp Name");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "+ New Asset" }).click();
  await expect(page.getByLabel("Project name")).toHaveValue("TypeSmith Mobile");
});
