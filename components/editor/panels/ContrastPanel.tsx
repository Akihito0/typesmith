"use client";

import { useMemo, useState } from "react";
import { useProject } from "@/lib/store";
import { evaluateContrast, formatRatio, simulateCvd, hexToRgb } from "@/lib/contrast";
import { fontById } from "@/lib/fonts";

// Screen 5: Color Contrast Checker.
//   header: title + AA PASS badge + Get Code
//   two swatch cards: FOREGROUND / BACKGROUND with hex inputs
//   ratio bar: CONTRAST RATIO n.nn:1 · NORMAL TEXT PASS (AA) · LARGE TEXT PASS (AAA)
//   preview card rendering real project copy in the chosen colors
//   bottom feature cards: WCAG Standards · Color Blindness · Auto-Fixer
export function ContrastPanel({ onGetCode }: { onGetCode: () => void }) {
  const p = useProject();
  const [cvd, setCvd] = useState<"none" | "protanopia" | "deuteranopia" | "tritanopia">("none");

  const fg = cvd === "none" ? p.foreground : simulateCvd(p.foreground, cvd);
  const bg = cvd === "none" ? p.background : simulateCvd(p.background, cvd);

  const result = useMemo(() => evaluateContrast(fg, bg), [fg, bg]);
  const heading = fontById(p.headingFont);
  const body = fontById(p.bodyFont);

  // Auto-fixer: darken/lighten the foreground toward AA if it fails.
  const autoFix = () => {
    const rgb = hexToRgb(p.foreground);
    const bgRgb = hexToRgb(p.background);
    if (!rgb || !bgRgb) return;
    const bgLum = (0.2126 * bgRgb[0] + 0.7152 * bgRgb[1] + 0.0722 * bgRgb[2]) / 255;
    const towardDark = bgLum > 0.5;
    let [r, g, b] = rgb;
    for (let i = 0; i < 24; i++) {
      const check = evaluateContrast(rgbHex(r, g, b), p.background);
      if (check && check.normalAA) break;
      const f = towardDark ? 0.88 : 1.14;
      r = clamp(r * f + (towardDark ? 0 : 6));
      g = clamp(g * f + (towardDark ? 0 : 6));
      b = clamp(b * f + (towardDark ? 0 : 6));
    }
    p.set("foreground", rgbHex(r, g, b));
    p.set("accent", rgbHex(r, g, b));
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto ts-scroll">
      {/* header card */}
      <section className="rounded-card border border-line bg-white p-5 shadow-panel">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Color Contrast Checker</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Verify WCAG accessibility standards for your brand colors.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <span
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                  result.grade === "Fail"
                    ? "border-fail/30 bg-red-50 text-fail"
                    : "border-pass/30 bg-green-50 text-pass"
                }`}
              >
                {result.grade === "Fail" ? "✕ FAIL" : `✓ ${result.grade} PASS`}
              </span>
            )}
            <button
              onClick={onGetCode}
              className="rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-surface"
            >
              Get Code
            </button>
          </div>
        </div>

        {/* swatch inputs */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SwatchInput
            label="Foreground"
            value={p.foreground}
            display={fg}
            onChange={(v) => p.set("foreground", v)}
          />
          <SwatchInput
            label="Background"
            value={p.background}
            display={bg}
            onChange={(v) => p.set("background", v)}
          />
        </div>

        {/* ratio bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Contrast Ratio{" "}
            <b className="ml-1 font-mono text-sm normal-case tracking-normal text-ink">
              {result ? formatRatio(result.ratio) : "—"}
            </b>
          </span>
          {result && (
            <span className="flex gap-5 text-[11px] font-medium">
              <Badge ok={result.normalAA} label={`Normal text ${result.normalAAA ? "(AAA)" : "(AA)"}`} pass={result.normalAA} />
              <Badge ok={result.largeAA} label={`Large text ${result.largeAAA ? "(AAA)" : "(AA)"}`} pass={result.largeAA} />
            </span>
          )}
        </div>

        {/* live preview in project copy + fonts */}
        <div
          className="mt-4 rounded-md border border-line p-6"
          style={{ background: bg }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: fg, opacity: 0.7 }}>
            Preview
          </p>
          <h3
            className="mt-2 text-lg font-semibold"
            style={{ color: fg, fontFamily: heading.stack }}
          >
            {p.subhead}
          </h3>
          <p
            className="mt-2 max-w-lg text-sm leading-relaxed"
            style={{ color: fg, fontFamily: body.stack }}
          >
            The quick brown fox jumps over the lazy dog. {p.projectName} provides an
            integrated suite of tools for design-engineers to craft pixel-perfect
            interfaces with technical rigor.
          </p>
          <div className="mt-4 flex gap-2.5" style={{ fontFamily: body.stack }}>
            <span className="rounded-md px-4 py-2 text-xs font-medium" style={{ background: fg, color: bg }}>
              Primary Action
            </span>
            <span className="rounded-md border px-4 py-2 text-xs font-medium" style={{ borderColor: fg, color: fg }}>
              Secondary Action
            </span>
          </div>
        </div>
      </section>

      {/* bottom feature cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureCard
          title="WCAG Standards"
          body="Level AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text."
        />
        <div className="rounded-card border border-line bg-white p-4 shadow-panel">
          <p className="text-[13px] font-semibold text-ink">Color Blindness</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Simulate protanopia, deuteranopia, and tritanopia.
          </p>
          <select
            value={cvd}
            onChange={(e) => setCvd(e.target.value as typeof cvd)}
            className="mt-2.5 h-8 w-full rounded-md border border-line bg-white px-2 text-xs"
            aria-label="Color blindness simulation"
          >
            <option value="none">Off</option>
            <option value="protanopia">Protanopia</option>
            <option value="deuteranopia">Deuteranopia</option>
            <option value="tritanopia">Tritanopia</option>
          </select>
        </div>
        <div className="rounded-card border border-line bg-white p-4 shadow-panel">
          <p className="text-[13px] font-semibold text-ink">Auto-Fixer</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Adjust your current foreground to the nearest AA-passing shade.
          </p>
          <button
            onClick={autoFix}
            className="mt-2.5 w-full rounded-md bg-brand-600 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            Fix Contrast
          </button>
        </div>
      </section>
    </div>
  );
}

function SwatchInput({
  label,
  value,
  display,
  onChange,
}: {
  label: string;
  value: string;
  display: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1.5 flex items-center gap-3 rounded-md border border-line p-2.5">
        <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line">
          <span className="absolute inset-0" style={{ background: display }} />
          <input
            type="color"
            value={safeHex(value)}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} color picker`}
          />
        </label>
        <div className="min-w-0 flex-1">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent font-mono text-sm text-ink outline-none"
            aria-label={`${label} hex value`}
            spellCheck={false}
          />
          <p className="text-[10px] text-muted">{label === "Foreground" ? "Text & UI color" : "Surface color"}</p>
        </div>
      </div>
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string; pass?: boolean }) {
  return (
    <span className={ok ? "text-pass" : "text-fail"}>
      {ok ? "PASS" : "FAIL"} <span className="text-muted">{label}</span>
    </span>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-panel">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function safeHex(v: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("");
}
