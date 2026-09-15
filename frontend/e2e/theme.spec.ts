import { test, expect, type Page } from "@playwright/test";

const PANELS = [
  "Style Guide",
  "Type Scale",
  "Playground",
  "Colors",
  "Website",
  "Mobile App",
  "Slides",
  "Social",
  "Newsletter",
];

/**
 * Walks every visible text node, resolves the effective background by climbing
 * until something opaque is found, and reports pairs below 3:1.
 *
 * This exists because the theme is driven by CSS variables: a token that flips
 * on a surface that doesn't is invisible in code review and only shows up as
 * unreadable text. Eyeballing nine panels in two themes does not scale.
 */
const SCAN = `(() => {
  const parse = (c) => {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(",").map((v) => parseFloat(v));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.85) return c;
      n = n.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const out = [];
  document.querySelectorAll("body *").forEach((el) => {
    // Playground frames and text are siblings positioned by canvas coordinates
    // rather than nested, so climbing the DOM finds the wrong background. They
    // are the user's artwork and never themed anyway.
    if (el.closest('[data-surface="true"]')) return;
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (!text) return;
    // Decorative markers (bullets, dividers, glyph indicators) carry no
    // information and are exempt from contrast rules — the hero showcase dims
    // its inactive tab markers on purpose.
    if (text.length === 1 && !/[a-z0-9]/i.test(text)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.opacity === "0") return;
    const fg = parse(cs.color);
    if (!fg || fg.a < 0.5) return;
    const cr = ratio(fg, bgOf(el));
    if (cr < 3) out.push({ text: text.slice(0, 40), ratio: Math.round(cr * 100) / 100, color: cs.color, cls: (el.className || "").toString().slice(0, 60) });
  });
  return out;
})()`;

async function scan(page: Page, label: string, failures: Record<string, unknown[]>) {
  const bad = (await page.evaluate(SCAN)) as unknown[];
  if (bad.length) failures[label] = bad;
}

for (const scheme of ["dark", "light"] as const) {
  test(`${scheme} mode keeps every editor panel legible`, async ({ browser }) => {
    const ctx = await browser.newContext({
      colorScheme: scheme,
      viewport: { width: 1600, height: 1000 },
    });
    const page = await ctx.newPage();
    await page.goto("/editor");
    await expect(page.locator("html")).toHaveAttribute("data-app-theme", scheme);

    const failures: Record<string, unknown[]> = {};
    for (const panel of PANELS) {
      await page.getByRole("button", { name: panel }).click();
      await page.waitForTimeout(300);
      await scan(page, panel, failures);
    }
    await ctx.close();

    if (Object.keys(failures).length) console.log(JSON.stringify(failures, null, 2));
    expect(Object.keys(failures)).toEqual([]);
  });

  test(`${scheme} mode keeps the public pages legible`, async ({ browser }) => {
    const ctx = await browser.newContext({
      colorScheme: scheme,
      viewport: { width: 1280, height: 900 },
    });
    const page = await ctx.newPage();
    const failures: Record<string, unknown[]> = {};
    for (const route of ["/", "/privacy", "/terms", "/changelog", "/no-such-page"]) {
      await page.goto(route);
      await page.waitForTimeout(350);
      await scan(page, route, failures);
    }
    await ctx.close();
    if (Object.keys(failures).length) console.log(JSON.stringify(failures, null, 2));
    expect(Object.keys(failures)).toEqual([]);
  });
}

test("the theme follows the OS, then the explicit choice, and it persists", async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.goto("/editor");

  // Nobody has chosen yet, so the OS wins — without a third button for it.
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-app-theme", "dark");

  // The button offers the other theme, and says which.
  const toSwitchToLight = page.getByRole("button", { name: "Switch to light theme" });
  await expect(toSwitchToLight).toBeVisible();
  await toSwitchToLight.click();
  await expect(html).toHaveAttribute("data-app-theme", "light");
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();

  // The choice outlives a reload, and is applied before paint rather than
  // flashing the OS theme first.
  await page.reload();
  await expect(html).toHaveAttribute("data-app-theme", "light");

  // And it flips straight back — two states, no cycle to walk around.
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(html).toHaveAttribute("data-app-theme", "dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(html).toHaveAttribute("data-app-theme", "light");
  await ctx.close();
});

test("the public pages carry no theme toggle", async ({ page }) => {
  // The landing and doc pages are a fixed dark editorial design that doesn't
  // follow the app theme, so a toggle there would do nothing visible.
  for (const route of ["/", "/privacy"]) {
    await page.goto(route);
    await expect(page.getByRole("button", { name: /^Switch to (light|dark) theme$/ })).toHaveCount(
      0
    );
  }
});

test("a stored theme from the retired three-way control still loads", async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.localStorage.setItem("typesmith-theme", "system");
  });
  await page.goto("/editor");

  // "system" is no longer a choice, so it reads as no preference and the OS
  // decides — rather than pinning anyone to a value they can't express.
  await expect(page.locator("html")).toHaveAttribute("data-app-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  await ctx.close();
});
