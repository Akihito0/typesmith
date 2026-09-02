"use client";

import { useMemo, useState } from "react";
import { useProject } from "@/backend/project/store";
import { buildScale, toUnit } from "@/backend/typography/scale";
import { fontById } from "@/backend/fonts/catalog";
import { evaluateContrast, formatRatio } from "@/backend/color/contrast";
import { downloadArtboard } from "@/backend/export/image";

// "Style Guide" in the sidebar: the presentable, client-facing summary of the
// whole system — fonts, scale ramp, colors, contrast verdict. This is the
// screen the Edit/View toggle is really for.
export function StyleGuidePanel() {
  const p = useProject();
  const scale = useMemo(
    () => buildScale(p.base, p.ratio, p.stepOverrides),
    [p.base, p.ratio, p.stepOverrides]
  );
  const heading = fontById(p.headingFont);
  const body = fontById(p.bodyFont);
  const contrast = evaluateContrast(p.foreground, p.background);

  // PNG is drawn on a canvas (lib/imageExport.ts) rather than rasterising this
  // DOM — no html-to-image dependency, and the real webfonts come through.
  const [busy, setBusy] = useState(false);
  const downloadPng = async () => {
    setBusy(true);
    try {
      await downloadArtboard(p, "styleguide");
    } finally {
      setBusy(false);
    }
  };

  return (
    // h-full is load-bearing: the parent <main> is overflow-hidden, so without
    // a height this panel just gets clipped instead of scrolling.
    <div className="mx-auto h-full max-w-3xl space-y-4 overflow-y-auto pb-2 ts-scroll print:h-auto print:overflow-visible">
      {/* header */}
      <section className="ts-light rounded-card border border-line bg-white p-6 shadow-panel">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Style Guide
            </p>
            <h2
              className="mt-1 text-2xl text-ink"
              style={{ fontFamily: heading.stack, fontWeight: p.headingWeight }}
            >
              {p.projectName}
            </h2>
            <p className="mt-1 text-sm text-muted">by {p.author}</p>
          </div>
          <div className="flex shrink-0 gap-1.5 print:hidden">
            <button
              onClick={() => window.print()}
              className="rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-surface"
            >
              Download PDF
            </button>
            <button
              onClick={downloadPng}
              disabled={busy}
              className="rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-surface disabled:opacity-50"
            >
              {busy ? "Rendering…" : "Download PNG"}
            </button>
          </div>
        </div>
      </section>

      {/* typography */}
      <section className="ts-light rounded-card border border-line bg-white p-6 shadow-panel">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Typography</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="rounded-md border border-line p-4">
            <p className="text-[10px] text-muted">Heading</p>
            <p
              className="mt-1 text-xl font-semibold text-ink"
              style={{ fontFamily: heading.stack }}
            >
              {heading.name}
            </p>
          </div>
          <div className="rounded-md border border-line p-4">
            <p className="text-[10px] text-muted">Body</p>
            <p className="mt-1 text-xl text-ink" style={{ fontFamily: body.stack }}>
              {body.name}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2 border-t border-line pt-4">
          {[...scale].reverse().map((s) => (
            <div key={s.step} className="flex items-baseline gap-4">
              <span className="w-32 shrink-0 whitespace-nowrap text-right font-mono text-[11px] text-muted">
                {s.label} · {toUnit(s.px, p.unit)}
              </span>
              <span
                className="truncate text-ink"
                style={{
                  fontFamily: heading.stack,
                  fontSize: Math.min(s.px, 44),
                  fontWeight: p.headingWeight,
                  letterSpacing: `${p.headingTracking}em`,
                }}
              >
                {p.previewText || "Modern Typography"}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Base {p.base}px · ratio {p.ratio} · weights {p.headingWeight}/{p.bodyWeight} · leading{" "}
          {p.headingLeading}/{p.bodyLeading} · tracking {p.headingTracking}em
        </p>
      </section>

      {/* color */}
      <section className="ts-light rounded-card border border-line bg-white p-6 shadow-panel">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Color</p>
        <div className="mt-3 grid grid-cols-3 gap-4">
          {(
            [
              ["Foreground", p.foreground],
              ["Background", p.background],
              ["Accent", p.accent],
              ["Muted", p.mutedColor],
              ["Surface", p.surfaceColor],
            ] as const
          ).map(([label, hex]) => (
            <div key={label} className="overflow-hidden rounded-md border border-line">
              <div className="h-14" style={{ background: hex }} />
              <div className="p-2.5">
                <p className="text-[11px] font-medium text-ink">{label}</p>
                <p className="font-mono text-[11px] text-muted">{hex}</p>
              </div>
            </div>
          ))}
        </div>
        {contrast && (
          <p className="mt-3 text-[12px] text-muted">
            Foreground on background:{" "}
            <b className={contrast.grade === "Fail" ? "text-fail" : "text-pass"}>
              {formatRatio(contrast.ratio)} ·{" "}
              {contrast.grade === "Fail" ? "Fails AA" : `${contrast.grade} pass`}
            </b>
          </p>
        )}
      </section>
    </div>
  );
}
