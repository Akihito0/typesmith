// PNG export for the presentable surfaces — the style guide poster and the
// social artboards.
//
// Drawn straight onto a canvas rather than rasterising the DOM: html-to-image
// would be a new runtime dependency (CLAUDE.md), and the SVG/foreignObject
// trick can't use webfonts without inlining every face as base64 first. Canvas
// can draw with any font the document has already loaded, so the output uses
// the real project faces at whatever resolution we ask for.
//
// Layout maths (wrapping, fitting) is pure and unit-tested; only the drawing
// touches the DOM.

import { buildScale, toUnit } from "./scale";
import { fontById } from "./fonts";
import { contrastRatio, evaluateContrast, formatRatio } from "./contrast";
import type { ProjectState } from "./store";

export type Artboard = "post" | "story" | "card" | "styleguide";

export const ARTBOARDS: Record<Artboard, { label: string; width: number; height: number }> = {
  post: { label: "Square post", width: 1080, height: 1080 },
  story: { label: "Story", width: 1080, height: 1920 },
  card: { label: "Link card", width: 1200, height: 630 },
  styleguide: { label: "Style guide", width: 1240, height: 1754 }, // A4 at 150dpi
};

// --- Pure helpers ------------------------------------------------------------

/**
 * next/font exposes the bundled Geist faces as CSS variables, which canvas
 * can't resolve — `ctx.font` needs real family names. Swap any var(--x) for
 * its computed value and drop the ones that don't resolve.
 */
export function resolveFontStack(stack: string, lookup: (name: string) => string): string {
  const resolved = stack
    .split(",")
    .map((part) => {
      const m = part.trim().match(/^var\((--[\w-]+)\)$/);
      if (!m) return part.trim();
      return lookup(m[1]).trim();
    })
    .filter(Boolean);
  return resolved.length > 0 ? resolved.join(", ") : "sans-serif";
}

/** Greedy word wrap against a caller-supplied measuring function. */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
  maxLines = Infinity
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);

  if (lines.length === maxLines && words.length > 0) {
    // Ellipsise the last line if we ran out of room mid-sentence.
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length) {
      let last = lines[lines.length - 1];
      while (last && measure(`${last}…`) > maxWidth) {
        last = last.slice(0, -1).trimEnd();
      }
      lines[lines.length - 1] = `${last}…`;
    }
  }
  return lines;
}

/** Black or white, whichever reads better on the given background. */
export function readableInk(bg: string): string {
  const onDark = contrastRatio("#ffffff", bg) ?? 1;
  const onLight = contrastRatio("#111827", bg) ?? 1;
  return onDark >= onLight ? "#ffffff" : "#111827";
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "TS"
  );
}

// --- Drawing -----------------------------------------------------------------
// Everything below needs a real CanvasRenderingContext2D, which jsdom doesn't
// provide without a native dependency. It's excluded from coverage and covered
// by the e2e suite instead — the same call the repo already makes for the
// store and workspace wiring. The layout maths above stays measured.

/* v8 ignore start */

interface Ctx {
  ctx: CanvasRenderingContext2D;
  heading: string;
  body: string;
  p: ProjectState;
}

function cssVarLookup(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name);
}

/**
 * Make sure the faces we're about to draw with are actually loaded — canvas
 * silently falls back to a default face otherwise.
 */
async function ensureFonts(p: ProjectState, heading: string, body: string): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const specs = [
    `${p.headingWeight} 48px ${heading}`,
    `${p.bodyWeight} 16px ${body}`,
    `600 16px ${body}`,
  ];
  await Promise.all(specs.map((spec) => document.fonts.load(spec).catch(() => undefined)));
  await document.fonts.ready;
}

function setFont(c: Ctx, weight: number, px: number, family: "heading" | "body"): void {
  c.ctx.font = `${weight} ${px}px ${family === "heading" ? c.heading : c.body}`;
}

/** Draw wrapped text, returning the y position just past the last line. */
function drawWrapped(
  c: Ctx,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = Infinity
): number {
  const lines = wrapLines(text, maxWidth, (s) => c.ctx.measureText(s).width, maxLines);
  lines.forEach((line, i) => c.ctx.fillText(line, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

/** Canvas has no letter-spacing in every browser we target — space manually. */
function drawTracked(c: Ctx, text: string, x: number, y: number, tracking: number): number {
  let cursor = x;
  for (const ch of text) {
    c.ctx.fillText(ch, cursor, y);
    cursor += c.ctx.measureText(ch).width + tracking;
  }
  return cursor;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPost(c: Ctx, w: number, h: number): void {
  const { ctx, p } = c;
  const ink = readableInk(p.background);
  const pad = w * 0.09;

  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, w, h);

  // Eyebrow — the subhead, tracked out in the body face.
  setFont(c, 600, w * 0.022, "body");
  ctx.fillStyle = p.accent;
  drawTracked(c, p.subhead.toUpperCase(), pad, pad + w * 0.03, w * 0.0035);

  // Headline
  setFont(c, p.headingWeight, w * 0.082, "heading");
  ctx.fillStyle = ink;
  const lineHeight = w * 0.082 * p.headingLeading;
  drawWrapped(c, p.previewText || "Modern Typography", pad, h * 0.42, w - pad * 2, lineHeight, 4);

  // Footer rule + credits
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.moveTo(pad, h - pad - w * 0.06);
  ctx.lineTo(w - pad, h - pad - w * 0.06);
  ctx.stroke();
  ctx.globalAlpha = 1;

  setFont(c, 600, w * 0.02, "body");
  ctx.fillStyle = ink;
  ctx.fillText(p.projectName, pad, h - pad - w * 0.02);
  ctx.globalAlpha = 0.6;
  const authorText = `by ${p.author}`;
  ctx.fillText(authorText, w - pad - ctx.measureText(authorText).width, h - pad - w * 0.02);
  ctx.globalAlpha = 1;
}

function drawStory(c: Ctx, w: number, h: number): void {
  const { ctx, p } = c;
  const ink = readableInk(p.background);
  const pad = w * 0.09;

  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, w, h);

  // Progress bar
  const barW = (w - pad * 2 - 24) / 3;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 0 ? p.accent : ink;
    ctx.globalAlpha = i === 0 ? 1 : 0.2;
    roundRect(ctx, pad + i * (barW + 12), pad, barW, 6, 3);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Account row
  const avatarR = w * 0.038;
  const avatarY = pad + 40 + avatarR;
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(pad + avatarR, avatarY, avatarR, 0, Math.PI * 2);
  ctx.fill();
  setFont(c, 700, avatarR * 0.8, "body");
  ctx.fillStyle = readableInk(p.accent);
  const ini = initials(p.projectName);
  ctx.fillText(ini, pad + avatarR - ctx.measureText(ini).width / 2, avatarY + avatarR * 0.28);

  setFont(c, 600, w * 0.024, "body");
  ctx.fillStyle = ink;
  ctx.fillText(p.projectName, pad + avatarR * 2 + 20, avatarY + w * 0.008);

  // Headline, vertically centred
  setFont(c, p.headingWeight, w * 0.095, "heading");
  ctx.fillStyle = ink;
  drawWrapped(
    c,
    p.previewText || "Modern Typography",
    pad,
    h * 0.42,
    w - pad * 2,
    w * 0.095 * p.headingLeading,
    5
  );

  // Subhead under it
  setFont(c, p.bodyWeight, w * 0.028, "body");
  ctx.globalAlpha = 0.7;
  drawWrapped(
    c,
    p.subhead,
    pad,
    h * 0.42 + w * 0.095 * p.headingLeading * 2.2,
    w - pad * 2,
    w * 0.028 * p.bodyLeading,
    2
  );
  ctx.globalAlpha = 1;

  // Swipe-up CTA
  setFont(c, 600, w * 0.024, "body");
  ctx.fillStyle = p.accent;
  const cta = "Swipe up";
  ctx.fillText(cta, w / 2 - ctx.measureText(cta).width / 2, h - pad - w * 0.02);
}

function drawCard(c: Ctx, w: number, h: number): void {
  const { ctx, p } = c;
  const ink = readableInk(p.background);
  const pad = w * 0.07;

  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, w, h);

  // Accent spine
  ctx.fillStyle = p.accent;
  ctx.fillRect(0, 0, w * 0.012, h);

  setFont(c, 600, w * 0.018, "body");
  ctx.fillStyle = p.accent;
  drawTracked(c, p.subhead.toUpperCase(), pad, pad + w * 0.02, w * 0.003);

  setFont(c, p.headingWeight, w * 0.062, "heading");
  ctx.fillStyle = ink;
  drawWrapped(
    c,
    p.previewText || "Modern Typography",
    pad,
    h * 0.42,
    w - pad * 2,
    w * 0.062 * p.headingLeading,
    3
  );

  setFont(c, p.bodyWeight, w * 0.018, "body");
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = ink;
  ctx.fillText(`typesmith.io/${p.projectName.toLowerCase().replace(/\s+/g, "-")}`, pad, h - pad);
  ctx.globalAlpha = 1;
}

function drawStyleGuide(c: Ctx, w: number, h: number): void {
  const { ctx, p } = c;
  const pad = w * 0.075;
  const inner = w - pad * 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  let y = pad + 28;

  // Masthead
  setFont(c, 600, 15, "body");
  ctx.fillStyle = "#6b7280";
  drawTracked(c, "STYLE GUIDE", pad, y, 1.6);
  y += 46;

  setFont(c, p.headingWeight, 46, "heading");
  ctx.fillStyle = "#111827";
  ctx.fillText(p.projectName, pad, y);
  y += 30;

  setFont(c, p.bodyWeight, 17, "body");
  ctx.fillStyle = "#6b7280";
  ctx.fillText(`by ${p.author}`, pad, y);
  y += 44;

  const rule = (yy: number) => {
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, yy);
    ctx.lineTo(w - pad, yy);
    ctx.stroke();
  };
  rule(y);
  y += 44;

  // Typefaces
  const headingDef = fontById(p.headingFont);
  const bodyDef = fontById(p.bodyFont);
  setFont(c, 600, 13, "body");
  ctx.fillStyle = "#6b7280";
  drawTracked(c, "TYPEFACES", pad, y, 1.4);
  y += 32;

  const colW = inner / 2;
  [
    { label: "Heading", def: headingDef, weight: p.headingWeight, family: "heading" as const },
    { label: "Body", def: bodyDef, weight: p.bodyWeight, family: "body" as const },
  ].forEach((col, i) => {
    const x = pad + i * colW;
    setFont(c, 400, 13, "body");
    ctx.fillStyle = "#6b7280";
    ctx.fillText(col.label, x, y);
    setFont(c, col.weight, 30, col.family);
    ctx.fillStyle = "#111827";
    ctx.fillText(col.def.name, x, y + 40);
    setFont(c, 400, 13, "body");
    ctx.fillStyle = "#6b7280";
    ctx.fillText(`Weight ${col.weight}`, x, y + 66);
  });
  y += 104;
  rule(y);
  y += 44;

  // Scale ramp
  setFont(c, 600, 13, "body");
  ctx.fillStyle = "#6b7280";
  drawTracked(c, "TYPE SCALE", pad, y, 1.4);
  y += 34;

  const steps = buildScale(p.base, p.ratio, p.stepOverrides);
  for (const step of steps) {
    // Leave room for the colour block and the specimen below it; a very tall
    // ramp drops its last steps rather than overflowing the page.
    if (y > h - pad - 640) break;
    setFont(c, 400, 12, "body");
    ctx.fillStyle = "#6b7280";
    ctx.fillText(`${step.label} · ${toUnit(step.px, p.unit)}`, pad, y);

    const sample = Math.min(step.px, 52);
    setFont(c, p.headingWeight, sample, "heading");
    ctx.fillStyle = "#111827";
    ctx.fillText("Ag", pad + 190, y + sample * 0.1);
    y += Math.max(sample * 1.25, 34);
  }

  y += 14;
  rule(y);
  y += 44;

  // Colors
  setFont(c, 600, 13, "body");
  ctx.fillStyle = "#6b7280";
  drawTracked(c, "COLOR", pad, y, 1.4);
  y += 30;

  const swatches: [string, string][] = [
    ["Foreground", p.foreground],
    ["Background", p.background],
    ["Accent", p.accent],
    ["Muted", p.mutedColor],
    ["Surface", p.surfaceColor],
  ];
  const sw = inner / swatches.length;
  swatches.forEach(([label, hex], i) => {
    const x = pad + i * sw;
    ctx.fillStyle = hex;
    roundRect(ctx, x, y, sw - 14, 76, 8);
    ctx.fill();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.stroke();

    setFont(c, 500, 13, "body");
    ctx.fillStyle = "#111827";
    ctx.fillText(label, x, y + 102);
    setFont(c, 400, 12, "body");
    ctx.fillStyle = "#6b7280";
    ctx.fillText(hex.toUpperCase(), x, y + 122);
  });
  y += 156;

  // Contrast verdict
  const verdict = evaluateContrast(p.foreground, p.background);
  if (verdict) {
    setFont(c, 400, 13, "body");
    ctx.fillStyle = "#6b7280";
    ctx.fillText(
      `Foreground on background — ${formatRatio(verdict.ratio)} · ${verdict.grade}`,
      pad,
      y
    );
  }
  y += 40;
  rule(y);
  y += 44;

  // Specimen — the system as running text. A style guide that never shows a
  // paragraph hasn't shown the body face doing its actual job.
  setFont(c, 600, 13, "body");
  ctx.fillStyle = "#6b7280";
  drawTracked(c, "SPECIMEN", pad, y, 1.4);
  y += 40;

  const h2 = steps.find((s) => s.label === "H2")?.px ?? 36;
  setFont(c, p.headingWeight, h2, "heading");
  ctx.fillStyle = "#111827";
  y = drawWrapped(c, p.headline, pad, y + h2 * 0.6, inner, h2 * p.headingLeading, 3);

  y += 22;
  setFont(c, p.bodyWeight, p.base, "body");
  ctx.fillStyle = "#374151";
  // Set to a ~66-character measure, the readable range a specimen should show.
  const measureWidth = Math.min(inner, ctx.measureText("0".repeat(66)).width);
  drawWrapped(c, p.body, pad, y, measureWidth, p.base * p.bodyLeading, 8);

  // Footer
  setFont(c, 400, 12, "body");
  ctx.fillStyle = "#9ca3af";
  ctx.fillText("Generated with TypeSmith", pad, h - pad + 12);
}

const RENDERERS: Record<Artboard, (c: Ctx, w: number, h: number) => void> = {
  post: drawPost,
  story: drawStory,
  card: drawCard,
  styleguide: drawStyleGuide,
};

/**
 * Render an artboard to a PNG blob. `scale` multiplies the artboard's nominal
 * size (2 gives a retina-density file).
 */
export async function renderArtboard(
  state: ProjectState,
  board: Artboard,
  scale = 1
): Promise<Blob> {
  const { width, height } = ARTBOARDS[board];
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser");
  ctx.scale(scale, scale);
  ctx.textBaseline = "alphabetic";

  const heading = resolveFontStack(fontById(state.headingFont).stack, cssVarLookup);
  const body = resolveFontStack(fontById(state.bodyFont).stack, cssVarLookup);
  await ensureFonts(state, heading, body);

  RENDERERS[board]({ ctx, heading, body, p: state }, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))),
      "image/png"
    );
  });
}

/** Render and save an artboard as a .png file. */
export async function downloadArtboard(
  state: ProjectState,
  board: Artboard,
  scale = 2
): Promise<void> {
  const blob = await renderArtboard(state, board, scale);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${state.projectName.toLowerCase().replace(/\s+/g, "-")}-${board}.png`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* v8 ignore stop */
