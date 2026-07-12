"use client";

import { useMemo, useState } from "react";
import { useProject } from "@/lib/store";
import { buildScale, toUnit, RATIO_PRESETS, type Unit } from "@/lib/scale";
import { fontById } from "@/lib/fonts";
import { generate } from "@/lib/export";
import { Logo, Select, Toggle } from "@/components/ui";

// Screen 3: the dark editor canvas. Three columns —
//   left: TYPE SCALE GENERATOR (base/size controls + scale rows with sliders)
//   center: FONT PAIRING PREVIEW (custom preview text at heading sizes + body)
//   right: TECHNICAL CONTROLS (export settings, Generate CSS, code snippet, project info)
export function TypeScalePanel() {
  const p = useProject();
  const [showCode, setShowCode] = useState(false);
  const [liveExport, setLiveExport] = useState(true);
  const [manualCss, setManualCss] = useState("");

  const scale = useMemo(() => buildScale(p.base, p.ratio), [p.base, p.ratio]);
  // Show the mid-range rows in the rail (like 12→96px in the mock).
  const railRows = scale.filter((s) => s.step >= -1);

  const heading = fontById(p.headingFont);
  const body = fontById(p.bodyFont);

  const css = useMemo(
    () => generate(p, "css"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.base, p.ratio, p.headingFont, p.bodyFont, p.foreground, p.background, p.accent, p.projectName, p.author, p.unit]
  );

  const isView = p.mode === "view";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-canvas-line bg-canvas text-white">
      {/* canvas title bar */}
      <div className="flex items-center justify-between border-b border-canvas-line px-4 py-2.5">
        <Logo className="text-[13px] text-white" />
        <span className="rounded bg-brand-600 px-2.5 py-1 text-[11px] font-medium">TypeSmith</span>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[230px_1fr_240px]">
        {/* LEFT — scale rows */}
        <div className="overflow-y-auto border-b border-canvas-line p-4 lg:border-b-0 lg:border-r ts-scroll">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Type Scale Generator
          </p>

          {!isView && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] text-gray-500">Base size</span>
                <input
                  type="number"
                  min={10}
                  max={28}
                  value={p.base}
                  onChange={(e) => p.set("base", Number(e.target.value) || 16)}
                  className="mt-1 h-8 w-full rounded border border-canvas-line bg-canvas-panel px-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-gray-500">Ratio</span>
                <select
                  value={p.ratio}
                  onChange={(e) => p.set("ratio", Number(e.target.value))}
                  className="mt-1 h-8 w-full rounded border border-canvas-line bg-canvas-panel px-1.5 text-sm text-white"
                >
                  {RATIO_PRESETS.map((r) => (
                    <option key={r.name} value={r.value}>
                      {r.value} — {r.name}
                    </option>
                  ))}
                  {!RATIO_PRESETS.some((r) => r.value === p.ratio) && (
                    <option value={p.ratio}>{p.ratio} — Custom</option>
                  )}
                </select>
              </label>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {railRows.map((row) => (
              <div key={row.step}>
                <div className="flex items-baseline justify-between">
                  <span
                    className="font-medium text-gray-200"
                    style={{ fontSize: Math.min(row.px, 34) }}
                  >
                    {Math.round(row.px)}px
                  </span>
                  <span className="text-[10px] text-gray-500">{row.label}</span>
                </div>
                {/* slider maps this row's px against the scale's max for a visual weight bar */}
                <input
                  type="range"
                  className="ts-range mt-1.5 w-full"
                  min={0}
                  max={100}
                  value={Math.min(100, (row.px / scale[scale.length - 1].px) * 100)}
                  readOnly
                  aria-label={`${row.label} size ${Math.round(row.px)}px`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* CENTER — pairing preview */}
        <div className="overflow-y-auto p-6 lg:p-10 ts-scroll">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Font Pairing Preview
            </p>
            {!isView && (
              <span className="rounded border border-canvas-line px-2 py-0.5 text-[10px] text-gray-400">
                View setting
              </span>
            )}
          </div>

          {/* Custom preview text — proposal: one field that live-updates everything */}
          {!isView && (
            <input
              value={p.previewText}
              onChange={(e) => p.set("previewText", e.target.value)}
              placeholder="Type your preview text…"
              className="mt-4 w-full rounded border border-canvas-line bg-canvas-panel px-3 h-9 text-sm text-white placeholder:text-gray-600"
              aria-label="Custom preview text"
            />
          )}

          <h2
            className="mt-8 leading-[1.05] tracking-tight"
            style={{
              fontFamily: heading.stack,
              fontSize: Math.min(scale[scale.length - 2].px, 84),
              fontWeight: 700,
            }}
          >
            {p.previewText || "Modern Typography"}
          </h2>

          <p
            className="mt-6 max-w-md leading-relaxed text-gray-400"
            style={{ fontFamily: body.stack, fontSize: p.base }}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
            veniam, quis nostrud exercitation ullamco nisi ut aliquip ex ea commodo
            consequat.
          </p>

          {/* full ramp under the hero preview */}
          <div className="mt-10 space-y-3 border-t border-canvas-line pt-6">
            {[...scale].reverse().map((row) => (
              <div key={row.step} className="flex items-baseline gap-4">
                <span className="w-16 shrink-0 text-right font-mono text-[11px] text-gray-500">
                  {toUnit(row.px, p.unit)}
                </span>
                <span
                  className="truncate text-gray-200"
                  style={{ fontFamily: heading.stack, fontSize: Math.min(row.px, 56) }}
                >
                  {p.previewText || "Modern Typography"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — technical controls */}
        <div className="overflow-y-auto border-t border-canvas-line p-4 lg:border-l lg:border-t-0 ts-scroll">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Technical Controls
          </p>

          <div className="mt-3 space-y-3 text-sm">
            <div>
              <span className="text-[10px] text-gray-500">Export Settings</span>
              <select
                value={p.unit}
                onChange={(e) => p.set("unit", e.target.value as Unit)}
                className="mt-1 h-8 w-full rounded border border-canvas-line bg-canvas-panel px-2 text-sm text-white"
                aria-label="Output unit"
              >
                <option value="rem">rem</option>
                <option value="px">px</option>
                <option value="em">em</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[12px] text-gray-300">Live export</span>
              <Toggle
                checked={liveExport}
                onChange={(val) => {
                  setLiveExport(val);
                  if (!val) {
                    setManualCss(css);
                  }
                }}
                label="Live export"
              />
            </div>

            <button
              onClick={() => {
                setShowCode(true);
                setManualCss(css);
              }}
              className="w-full rounded bg-brand-600 py-2 text-[13px] font-medium hover:bg-brand-700"
            >
              Generate CSS
            </button>

            {(showCode || liveExport) && (
              <div>
                <span className="text-[10px] text-gray-500">Code Snippet</span>
                <pre className="mt-1 max-h-56 overflow-auto rounded border border-canvas-line bg-canvas-code p-3 font-mono text-[10.5px] leading-relaxed text-gray-300 ts-scroll">
                  {liveExport ? css : manualCss}
                </pre>
              </div>
            )}

            <div className="border-t border-canvas-line pt-3">
              <span className="text-[10px] text-gray-500">Project Info</span>
              <input
                value={p.projectName}
                onChange={(e) => p.set("projectName", e.target.value)}
                className="mt-1 h-8 w-full rounded border border-canvas-line bg-canvas-panel px-2 text-sm text-white"
                aria-label="Project name"
              />
              <input
                value={p.author}
                onChange={(e) => p.set("author", e.target.value)}
                className="mt-2 h-8 w-full rounded border border-canvas-line bg-canvas-panel px-2 text-sm text-white"
                aria-label="Author"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
