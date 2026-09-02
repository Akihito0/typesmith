"use client";

import { useMemo, useState } from "react";
import { useProject } from "@/backend/project/store";
import { fontById } from "@/backend/fonts/catalog";
import { buildScale } from "@/backend/typography/scale";
import { generate, type ExportFormat, FORMAT_LABELS } from "@/backend/export/code";
import { Toggle } from "@/frontend/ui";

// Screen 4: the mockup dashboard. Center is a browser-framed landing page that
// renders *live* from project state — the whole point of TypeSmith is that a
// scale/font/color change shows up here immediately. Right rail holds the
// technical controls (font family, output format, minify, Generate, preview,
// project info) exactly as in the mock.

function useDesign() {
  const p = useProject();
  const scale = useMemo(
    () => buildScale(p.base, p.ratio, p.stepOverrides),
    [p.base, p.ratio, p.stepOverrides]
  );
  return {
    p,
    scale,
    heading: fontById(p.headingFont),
    body: fontById(p.bodyFont),
    px: (label: string, fallback: number) => scale.find((s) => s.label === label)?.px ?? fallback,
  };
}

// ---- Website mockup ---------------------------------------------------------
export function WebsiteMockup() {
  const { p, heading, body, px } = useDesign();
  const [width, setWidth] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const frameWidth = width === "desktop" ? "100%" : width === "tablet" ? 640 : 390;

  // The headline highlights its second word with the accent color, matching
  // "Engineering *precision* for modern typography."
  const words = p.headline.split(" ");

  // Readable colors, always computed against the surface a thing sits on, so
  // solid buttons/chips never become an unreadable blob on light accents or a
  // light page: `ink` is the page's own text color, `onInk` the text that sits
  // on an ink-filled chip, `onAccent` the text on an accent-filled button.
  const ink = readableInk(p.background);
  const onInk = readableInk(ink);
  const onAccent = readableInk(p.accent);

  return (
    <div className="flex h-full flex-col">
      {/* responsive width toggle */}
      <div className="mb-3 flex items-center gap-1 self-center rounded-md border border-line bg-panel p-0.5 text-xs">
        {(["desktop", "tablet", "mobile"] as const).map((w) => (
          <button
            key={w}
            onClick={() => setWidth(w)}
            className={`rounded px-2.5 py-1 capitalize ${
              width === w ? "bg-surface font-medium text-ink" : "text-muted"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-auto ts-scroll">
        {/* Browser card sized to its content and centered (m-auto) — so a short
            page floats in the middle of the canvas instead of stretching to a
            tall frame with a dead band below. Degrades to top-aligned scroll
            when the content is taller than the canvas. */}
        <div
          className="ts-light m-auto flex h-fit flex-col overflow-hidden rounded-lg border border-line bg-white shadow-panel transition-all"
          style={{ width: frameWidth, maxWidth: "100%" }}
        >
          {/* browser chrome */}
          <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
            <span className="flex gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </span>
            <span className="mx-auto flex items-center gap-1.5 rounded bg-white px-3 py-1 text-[11px] text-muted">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
              </svg>
              preview.typesmith.io/{p.projectName.toLowerCase().replace(/\s+/g, "-")}
            </span>
          </div>

          {/* page body — everything below reads live project state. Layout
              responds to the FRAME width (the `width` toggle), not the
              browser viewport — CSS breakpoints don't know how narrow the
              frame is. */}
          <div style={{ background: p.background, color: ink }}>
            {/* nav */}
            <div
              className={`flex items-center justify-between gap-3 py-4 ${
                width === "mobile" ? "px-4" : "px-8"
              }`}
            >
              <span
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ fontFamily: heading.stack }}
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                  style={{ background: ink, color: onInk }}
                >
                  V
                </span>
                <span className="whitespace-nowrap">
                  {width === "mobile" ? "Vantage" : "Vantage Product"}
                </span>
              </span>
              {width !== "mobile" && (
                <span className="flex gap-6 text-xs opacity-70" style={{ fontFamily: body.stack }}>
                  <span>Features</span>
                  <span>Pricing</span>
                </span>
              )}
              <span
                className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium"
                style={{ background: ink, color: onInk, fontFamily: body.stack }}
              >
                Get Started
              </span>
            </div>

            {/* hero */}
            <div className={`pb-14 pt-10 text-center ${width === "mobile" ? "px-5" : "px-8"}`}>
              <p
                className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ fontFamily: body.stack, color: p.accent }}
              >
                {p.subhead}
              </p>
              <h1
                className="mx-auto max-w-xl"
                style={{
                  fontFamily: heading.stack,
                  fontSize: Math.min(px("H1", 48), width === "mobile" ? 34 : 56),
                  fontWeight: p.headingWeight,
                  lineHeight: p.headingLeading,
                  letterSpacing: `${p.headingTracking}em`,
                }}
              >
                {words.map((w, i) => (
                  <span key={i} style={i === 1 ? { color: p.accent } : undefined}>
                    {w}{" "}
                  </span>
                ))}
              </h1>
              <p
                className="mx-auto mt-5 max-w-md opacity-70"
                style={{
                  fontFamily: body.stack,
                  fontSize: p.base,
                  lineHeight: p.bodyLeading,
                  fontWeight: p.bodyWeight,
                }}
              >
                {p.body}
              </p>
              <div
                className="mt-7 flex items-center justify-center gap-3"
                style={{ fontFamily: body.stack }}
              >
                <span
                  className="rounded-md px-4 py-2 text-sm font-medium"
                  style={{ background: p.accent, color: onAccent }}
                >
                  Deploy Now
                </span>
                <span
                  className="rounded-md border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: "currentColor", opacity: 0.75 }}
                >
                  Documentation
                </span>
              </div>
            </div>

            {/* feature strip + footer */}
            <div
              className={`grid gap-3 border-t py-6 ${
                width === "mobile" ? "grid-cols-1 px-4" : "grid-cols-3 px-8"
              }`}
              style={{ borderColor: "rgba(127,127,127,0.2)" }}
            >
              {["Scale", "Contrast", "Export"].map((f) => (
                <div
                  key={f}
                  className="rounded-md border p-3 text-center"
                  style={{ borderColor: "rgba(127,127,127,0.2)" }}
                >
                  <p className="text-xs font-semibold" style={{ fontFamily: heading.stack }}>
                    {f}
                  </p>
                  <p className="mt-1 text-[10px] opacity-60" style={{ fontFamily: body.stack }}>
                    Reads live from your system
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Mobile mockup ----------------------------------------------------------
export function MobileMockup() {
  const { p, heading, body, px } = useDesign();
  const onAccent = readableInk(p.accent);

  return (
    // Centered both ways — the phone is the panel's single object.
    <div className="flex h-full items-center justify-center overflow-auto py-4 ts-scroll">
      <div className="relative shrink-0">
        {/* Hardware side buttons */}
        <span
          aria-hidden="true"
          className="absolute -left-[3px] top-[120px] h-6 w-[3px] rounded-l-md bg-ink"
        />
        <span
          aria-hidden="true"
          className="absolute -left-[3px] top-[160px] h-10 w-[3px] rounded-l-md bg-ink"
        />
        <span
          aria-hidden="true"
          className="absolute -left-[3px] top-[206px] h-10 w-[3px] rounded-l-md bg-ink"
        />
        <span
          aria-hidden="true"
          className="absolute -right-[3px] top-[170px] h-14 w-[3px] rounded-r-md bg-ink"
        />

        {/* Phone shell — 330×715 ≈ the iPhone 15 aspect (1:2.17) */}
        <div
          className="ts-light relative w-[330px] overflow-hidden rounded-[48px] border-[9px] border-ink bg-ink shadow-panel"
          style={{ height: 715 }}
        >
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-2.5 z-20 h-[24px] w-[96px] -translate-x-1/2 rounded-full bg-ink" />

          {/* Screen */}
          <div
            className="h-full overflow-y-auto rounded-[39px] ts-scroll"
            style={{ background: p.background, color: readableInk(p.background) }}
          >
            <div className="flex min-h-full flex-col">
              {/* status bar */}
              <div className="flex items-center justify-between px-7 pb-1 pt-4 text-[10px] font-medium">
                <span>9:41</span>
                <span className="flex items-center gap-1">
                  <i className="block h-2 w-3 rounded-[2px] bg-current opacity-80" />
                  <i className="block h-2 w-4 rounded-[2px] border border-current" />
                </span>
              </div>

              {/* header */}
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-semibold" style={{ fontFamily: heading.stack }}>
                  {p.projectName}
                </span>
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold"
                  style={{ background: p.accent, color: onAccent }}
                >
                  {initials(p.author)}
                </span>
              </div>

              {/* hero card */}
              <div className="px-5 pb-4">
                <h2
                  style={{
                    fontFamily: heading.stack,
                    fontSize: Math.min(px("H2", 30), 30),
                    fontWeight: p.headingWeight,
                    lineHeight: p.headingLeading,
                    letterSpacing: `${p.headingTracking}em`,
                  }}
                >
                  {p.previewText || "Modern Typography"}
                </h2>
                <p
                  className="mt-2 text-[12px] opacity-70"
                  style={{ fontFamily: body.stack, lineHeight: p.bodyLeading }}
                >
                  {p.body}
                </p>
                <span
                  className="mt-3 inline-block rounded-md px-4 py-2 text-xs font-medium"
                  style={{ background: p.accent, color: onAccent, fontFamily: body.stack }}
                >
                  Get Started
                </span>
              </div>

              {/* cards */}
              <div className="space-y-2.5 px-5 pb-5">
                {["Type Scale", "Color Contrast", "Export Tokens"].map((c) => (
                  <div
                    key={c}
                    className="flex items-center justify-between rounded-lg border p-3"
                    style={{ borderColor: "rgba(127,127,127,0.25)" }}
                  >
                    <div>
                      <p
                        className="text-[12px] font-semibold"
                        style={{ fontFamily: heading.stack }}
                      >
                        {c}
                      </p>
                      <p className="text-[10px] opacity-60" style={{ fontFamily: body.stack }}>
                        Synced with project
                      </p>
                    </div>
                    <span className="text-lg opacity-40">›</span>
                  </div>
                ))}
              </div>

              {/* bottom nav — pinned to the bottom of the screen */}
              <div className="mt-auto">
                <div
                  className="flex items-center justify-around border-t py-3 text-[9px]"
                  style={{ borderColor: "rgba(127,127,127,0.2)", fontFamily: body.stack }}
                >
                  {["Home", "Scale", "Colors", "Export"].map((t, i) => (
                    <span
                      key={t}
                      className="flex flex-col items-center gap-0.5"
                      style={i === 0 ? { color: p.accent } : { opacity: 0.55 }}
                    >
                      <i className="block h-4 w-4 rounded bg-current opacity-30" />
                      {t}
                    </span>
                  ))}
                </div>

                {/* Home indicator bar */}
                <div className="flex justify-center pb-2 pt-1">
                  <div className="h-[4px] w-[100px] rounded-full bg-current opacity-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Right rail: technical controls (shared by both mockup views) ----------
export function MockupControls() {
  const p = useProject();
  const [format, setFormat] = useState<ExportFormat>("tailwind");
  const [minify, setMinify] = useState(true);
  const [copied, setCopied] = useState(false);
  const heading = fontById(p.headingFont);

  const code = useMemo(
    () => generate(p, format, minify),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      p.base,
      p.ratio,
      p.stepOverrides,
      p.headingFont,
      p.bodyFont,
      p.foreground,
      p.background,
      p.accent,
      p.mutedColor,
      p.surfaceColor,
      p.projectName,
      p.author,
      p.unit,
      p.headingLeading,
      p.bodyLeading,
      p.headingTracking,
      p.headingWeight,
      p.bodyWeight,
      p.fluidMinVw,
      p.fluidMaxVw,
      p.fluidMinScale,
      format,
      minify,
    ]
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-l border-line bg-panel p-4 ts-scroll">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        Technical Controls
      </p>

      <div>
        <span className="text-[10px] text-muted">Font Family</span>
        <div className="mt-1 flex h-8 items-center rounded-md border border-line px-2.5 text-sm">
          {heading.name}
        </div>
      </div>

      <div>
        <span className="text-[10px] text-muted">Output Format</span>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          className="mt-1 h-8 w-full rounded-md border border-line bg-panel px-2 text-sm"
          aria-label="Output format"
        >
          {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
            <option key={f} value={f}>
              {FORMAT_LABELS[f]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] text-ink">Minify Code</span>
        <Toggle checked={minify} onChange={setMinify} label="Minify code" />
      </div>

      <button
        onClick={async () => {
          await navigator.clipboard?.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="rounded-md bg-brand-600 py-2 text-[13px] font-medium text-white hover:bg-brand-700"
      >
        {copied ? "Copied ✓" : `Generate ${format === "css" ? "CSS" : FORMAT_LABELS[format]}`}
      </button>

      <div>
        <span className="text-[10px] text-muted">Code Preview</span>
        <pre className="mt-1 max-h-44 overflow-auto rounded-md bg-canvas-code p-3 font-mono text-[10px] leading-relaxed text-gray-300 ts-scroll">
          {code}
        </pre>
      </div>

      <div className="border-t border-line pt-3">
        <span className="text-[10px] text-muted">Project Info</span>
        <label className="mt-1 block">
          <span className="text-[10px] text-muted">Project Name</span>
          <input
            value={p.projectName}
            onChange={(e) => p.set("projectName", e.target.value)}
            className="mt-0.5 h-8 w-full rounded-md border border-line px-2 text-sm"
          />
        </label>
        <label className="mt-2 block">
          <span className="text-[10px] text-muted">Author</span>
          <input
            value={p.author}
            onChange={(e) => p.set("author", e.target.value)}
            className="mt-0.5 h-8 w-full rounded-md border border-line px-2 text-sm"
          />
        </label>
      </div>

      {/* The copy rendered inside the mockups (and the contrast preview) */}
      <div className="border-t border-line pt-3">
        <span className="text-[10px] text-muted">Mockup Content</span>
        <label className="mt-1 block">
          <span className="text-[10px] text-muted">Headline</span>
          <input
            value={p.headline}
            onChange={(e) => p.set("headline", e.target.value)}
            className="mt-0.5 h-8 w-full rounded-md border border-line px-2 text-sm"
            aria-label="Mockup headline"
          />
        </label>
        <label className="mt-2 block">
          <span className="text-[10px] text-muted">Subhead</span>
          <input
            value={p.subhead}
            onChange={(e) => p.set("subhead", e.target.value)}
            className="mt-0.5 h-8 w-full rounded-md border border-line px-2 text-sm"
            aria-label="Mockup subhead"
          />
        </label>
        <label className="mt-2 block">
          <span className="text-[10px] text-muted">Body Copy</span>
          <textarea
            value={p.body}
            onChange={(e) => p.set("body", e.target.value)}
            rows={4}
            className="mt-0.5 w-full resize-none rounded-md border border-line px-2 py-1.5 text-sm leading-snug"
            aria-label="Mockup body copy"
          />
        </label>
      </div>
    </aside>
  );
}

// ---- helpers ---------------------------------------------------------------
export function readableInk(bgHex: string): string {
  // quick luminance check to keep mockup text readable on any background
  const h = bgHex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#111827";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55 ? "#111827" : "#f5f5f5";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
