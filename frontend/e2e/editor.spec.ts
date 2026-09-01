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

test.describe("playground", () => {
  test("frames are drawn at whatever size the drag describes", async ({ page }) => {
    await page.getByRole("button", { name: "Playground" }).click();
    const canvas = page.getByTestId("playground-canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("The playground canvas has no layout box.");

    await page.getByRole("button", { name: "Frame tool" }).click();
    await page.mouse.move(box.x + 40, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + 260, box.y + 150, { steps: 12 });
    await page.mouse.up();

    // The new frame is selected, and its size came from the drag rather than
    // from any preset in the list.
    const width = page.getByLabel("Width");
    const height = page.getByLabel("Height");
    await expect(width).toBeVisible();
    const drawnWidth = Number(await width.inputValue());
    const drawnHeight = Number(await height.inputValue());
    expect(drawnWidth).toBeGreaterThan(0);
    expect(drawnHeight).toBeGreaterThan(0);
    expect(drawnWidth).not.toBe(1200);
    expect(drawnHeight).not.toBe(800);
    await expect(page.getByText("3 frames")).toBeVisible();

    // Any width is accepted, including one no preset offers.
    await width.fill("137");
    await width.blur();
    await expect(page.getByLabel("Width")).toHaveValue("137");
  });

  test("a frame can be an ellipse with a corner radius on rectangles", async ({ page }) => {
    await page.getByRole("button", { name: "Playground" }).click();
    const canvas = page.getByTestId("playground-canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("The playground canvas has no layout box.");

    await page.getByRole("button", { name: "Ellipse tool" }).click();
    await page.mouse.move(box.x + 60, box.y + 60);
    await page.mouse.down();
    await page.mouse.move(box.x + 240, box.y + 240, { steps: 12 });
    await page.mouse.up();

    // Corner radius is meaningless for an ellipse, so the field is hidden.
    await expect(page.getByLabel("Corner radius")).toBeHidden();
    // The ellipse exports on its own, shape and all.
    const download = page.waitForEvent("download");
    await page.getByLabel("Export target").selectOption({ label: "Ellipse 3" });
    await page.getByRole("button", { name: "PNG" }).click();
    expect((await download).suggestedFilename()).toContain("ellipse-3");

    await page.getByRole("button", { name: "Rectangle", exact: true }).click();
    const radius = page.getByLabel("Corner radius");
    await radius.fill("24");
    await radius.blur();
    await expect(page.getByLabel("Corner radius")).toHaveValue("24");
  });
});

test.describe("playground objects", () => {
  async function openPlayground(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: "Playground" }).click();
    const canvas = page.getByTestId("playground-canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("The playground canvas has no layout box.");
    return { canvas, box };
  }

  async function drawFrame(
    page: import("@playwright/test").Page,
    box: { x: number; y: number },
    from: [number, number],
    to: [number, number],
    tool = "Frame"
  ) {
    await page.getByRole("button", { name: `${tool} tool` }).click();
    await page.mouse.move(box.x + from[0], box.y + from[1]);
    await page.mouse.down();
    await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 10 });
    await page.mouse.up();
  }

  test("the tool dock arms tools and explains itself", async ({ page }) => {
    await openPlayground(page);

    const move = page.getByRole("button", { name: "Move tool" });
    const text = page.getByRole("button", { name: "Text tool" });
    await expect(move).toHaveAttribute("aria-pressed", "true");

    await text.click();
    await expect(text).toHaveAttribute("aria-pressed", "true");
    await expect(move).toHaveAttribute("aria-pressed", "false");
    // The dock says what the armed tool will do.
    await expect(page.getByText(/Drag to draw a text box at any size/)).toBeVisible();

    // Keyboard picks tools too.
    await page.keyboard.press("f");
    await expect(page.getByRole("button", { name: "Frame tool" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    // Snapping is on by default and toggles from the dock.
    const snap = page.getByRole("button", { name: "Snap to objects" });
    await expect(snap).toHaveAttribute("aria-pressed", "true");
    await snap.click();
    await expect(snap).toHaveAttribute("aria-pressed", "false");

    // Shortcuts sheet opens from the dock and closes on Escape.
    await page.getByRole("button", { name: "Shortcuts" }).click();
    await expect(page.getByRole("heading", { name: "Shortcuts" })).toBeVisible();
    await expect(page.getByText("Zoom to selection")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Shortcuts" })).toBeHidden();
  });

  test("a node can be rotated and faded", async ({ page }) => {
    const { box } = await openPlayground(page);
    await drawFrame(page, box, [60, 60], [260, 200]);

    await page.getByLabel("Rotation (°)").fill("30");
    await page.getByLabel("Rotation (°)").blur();
    await expect(page.getByLabel("Rotation (°)")).toHaveValue("30");

    await page.getByLabel("Opacity (%)").fill("40");
    await page.getByLabel("Opacity (%)").blur();
    await expect(page.getByLabel("Opacity (%)")).toHaveValue("40");

    // Rotation wraps rather than piling up past half a turn.
    await page.getByRole("button", { name: "+90", exact: true }).click();
    await page.getByRole("button", { name: "+90", exact: true }).click();
    await expect(page.getByLabel("Rotation (°)")).toHaveValue("-150");
  });

  test("hiding takes a node off the canvas and locking protects it", async ({ page }) => {
    const { box } = await openPlayground(page);
    await drawFrame(page, box, [60, 60], [260, 200]);
    await expect(page.getByText("3 frames")).toBeVisible();

    await page.getByRole("button", { name: "Hide", exact: true }).click();
    // Hiding clears the selection, so the Object section goes away with it.
    await expect(page.getByLabel("Rotation (°)")).toBeHidden();
    // The node is still in the document, just not rendered.
    await expect(page.getByText("3 frames")).toBeVisible();

    await page.getByRole("button", { name: /^Show Frame 3$/ }).click();
    await page.getByRole("button", { name: /^Lock Frame 3$/ }).click();
    await expect(page.getByRole("button", { name: /^Unlock Frame 3$/ })).toBeVisible();
  });

  test("copy and paste adds a node without touching the original", async ({ page }) => {
    const { box } = await openPlayground(page);
    await drawFrame(page, box, [60, 60], [260, 200]);
    await expect(page.getByText("3 frames")).toBeVisible();

    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+c`);
    await page.keyboard.press(`${modifier}+v`);
    await expect(page.getByText("4 frames")).toBeVisible();
  });

  test("a snap guide appears when a drag lines up with something", async ({ page }) => {
    const { box } = await openPlayground(page);
    await drawFrame(page, box, [520, 120], [660, 260]);
    // Drop a second frame whose left edge is a few px off the first one's.
    await drawFrame(page, box, [524, 320], [640, 430]);

    await expect(page.getByTestId("snap-guide")).toHaveCount(0);
    // Nudge it: the near-aligned left edges should catch.
    await page.mouse.move(box.x + 580, box.y + 375);
    await page.mouse.down();
    await page.mouse.move(box.x + 578, box.y + 372, { steps: 6 });
    await expect(page.getByTestId("snap-guide").first()).toBeVisible();
    await page.mouse.up();
    // Guides are a drag affordance only — they clear on release.
    await expect(page.getByTestId("snap-guide")).toHaveCount(0);
  });

  test("aligning a multi-selection lines the nodes up with each other", async ({ page }) => {
    const { box } = await openPlayground(page);
    await drawFrame(page, box, [520, 120], [640, 220]);
    await drawFrame(page, box, [700, 300], [820, 400]);

    // Select through the layer tree: stable names, and it covers that surface
    // too. Canvas coordinates depend on the current zoom and what sits under
    // the pointer.
    const rowThree = page.getByRole("button", { name: /^▢ Frame 3/ });
    const rowFour = page.getByRole("button", { name: /^▢ Frame 4/ });
    await rowThree.click();
    await rowFour.click({ modifiers: ["Shift"] });
    await expect(page.getByRole("heading", { name: /^Object · 2$/ })).toBeVisible();

    await page.getByRole("button", { name: "Left", exact: true }).click();

    // Prove they share an X now, by reading each one's own inspector.
    const xField = page.getByRole("spinbutton", { name: "X", exact: true });
    await rowFour.click();
    const fourX = await xField.inputValue();
    await rowThree.click();
    const threeX = await xField.inputValue();
    expect(fourX).toBe(threeX);
  });
});
