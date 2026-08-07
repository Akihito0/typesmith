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

test("new asset starts a fresh project and keeps the old one in the workspace", async ({
  page,
}) => {
  await page.getByLabel("Project name").fill("Temp Name");
  // The debounced workspace sync needs a beat before we create the new project.
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "+ New Asset" }).click();
  await expect(page.getByLabel("Project name")).toHaveValue("TypeSmith Mobile");

  // The previous project is preserved and switchable.
  await page.getByRole("button", { name: "Switch project" }).click();
  await page.getByText("Temp Name").click();
  await expect(page.getByLabel("Project name")).toHaveValue("Temp Name");
});

test("contrast matrix grades every text/surface pair", async ({ page }) => {
  await page.getByRole("button", { name: "Colors" }).click();
  await expect(page.getByText("Contrast Matrix")).toBeVisible();
  await expect(page.getByLabel("Muted hex value")).toHaveValue("#6b7280");
});

test("design tokens export uses the W3C format", async ({ page }) => {
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("button", { name: "Design Tokens" }).click();
  await expect(page.getByText('"$type": "color"').first()).toBeVisible();
});

test("heading weight flows into the style guide", async ({ page }) => {
  await page.getByLabel("Heading weight").selectOption("400");
  await page.getByRole("button", { name: "Style Guide" }).click();
  await expect(page.getByText("weights 400/400")).toBeVisible();
});

test("per-step override edits one size and resets to the formula", async ({ page }) => {
  await page.getByRole("button", { name: "16px" }).click();
  await page.getByLabel("Step size override in px").fill("18");
  await page.getByLabel("Step size override in px").press("Enter");
  await expect(page.getByRole("button", { name: /18px/ })).toBeVisible();
  // Other steps keep the formula (H1 stays 49px at 16/1.25).
  await expect(page.getByRole("button", { name: "49px" })).toBeVisible();
  await page.getByRole("button", { name: "Reset override" }).click();
  await expect(page.getByRole("button", { name: "16px" })).toBeVisible();
});

test("apca mode reports an Lc value", async ({ page }) => {
  await page.getByRole("button", { name: "Colors" }).click();
  await page.getByRole("button", { name: "APCA" }).click();
  await expect(page.getByText(/Lc -?\d/)).toBeVisible();
});

test("workspace supports duplicate and backup export", async ({ page }) => {
  await page.getByRole("button", { name: "Switch project" }).click();
  await expect(page.getByText("Export backup")).toBeVisible();
  const row = page.locator(".group", { hasText: "TypeSmith Mobile" }).first();
  await row.hover();
  await row.getByRole("button", { name: /Duplicate/ }).click();
  await expect(page.getByLabel("Project name")).toHaveValue("TypeSmith Mobile Copy");
});

test("social panel includes the 9:16 story artboard", async ({ page }) => {
  await page.getByRole("button", { name: "Social" }).click();
  await expect(page.getByText("Swipe up ->")).toBeVisible();
});

test("slides offer a present button and newsletter a html download", async ({ page }) => {
  await page.getByRole("button", { name: "Slides" }).click();
  await expect(page.getByRole("button", { name: "Present" })).toBeVisible();
  await page.getByRole("button", { name: "Newsletter" }).click();
  await expect(page.getByRole("button", { name: "Download email HTML" })).toBeVisible();
});

test("share opens a sheet with a scannable QR and the link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Share" }).click();

  const dialog = page.getByRole("dialog", { name: "Share this project" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img", { name: /QR code/i })).toBeVisible();
  await expect(dialog.getByLabel("Share link")).toHaveValue(/\/editor\?s=/);
  await expect(dialog.getByRole("button", { name: "Download QR" })).toBeEnabled();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("style guide exports a PNG", async ({ page }) => {
  await page.getByRole("button", { name: "Style Guide" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/-styleguide\.png$/);
});

test("social artboards export PNGs at full resolution", async ({ page }) => {
  await page.getByRole("button", { name: "Social" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: /Square post/ }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/-post\.png$/);
});

// Regression guard: the toolbar used to run ~1044px wide, which scrolled the
// whole editor sideways on a phone and put Share / Export out of reach.
test.describe("phone-sized editor", () => {
  test("does not scroll sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/editor");
    await expect(page.getByText("Type Scale Generator")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("keeps every core action reachable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/editor");

    for (const name of ["Share", "Export", "Undo", "Redo", "Type settings"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeInViewport();
    }

    // Presets moved into the "Aa" menu at this width. With the menu open the
    // toolbar's own select is also in the DOM (display:none below lg), so take
    // the later one — the menu renders after the toolbar group.
    await page.getByRole("button", { name: "Type settings" }).click();
    await expect(page.getByLabel("Pairing preset").last()).toBeInViewport();

    // Upgrade moved into the sidebar drawer.
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toBeInViewport();
  });
});
