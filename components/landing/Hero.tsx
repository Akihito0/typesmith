"use client";

import { useState } from "react";
import Link from "next/link";
import { SpecimenRail } from "./EditorPreview";
import { RATIO_PRESETS } from "@/lib/scale";

const DEFAULT_RATIO_INDEX = Math.max(
  0,
  RATIO_PRESETS.findIndex((r) => r.name === "Major Third")
);

// 01 — SPECIMEN. The dark control-surface hero: this is the editor's own
// canvas color (#171717) with a faint blueprint grid, so the landing page
// opens on the product's real identity instead of a light editorial skin.
// Headline + marginalia sit above THE INTERACTIVE SPECIMEN — a working ratio
// slider and live sample-text input that re-tune buildScale() in real time.
// Local useState only; no store, no server state.
export function Hero() {
  const [ratioIndex, setRatioIndex] = useState(DEFAULT_RATIO_INDEX);
  const [sample, setSample] = useState("Hamburgefonstiv");
  const ratio = RATIO_PRESETS[ratioIndex].value;

  return (
    <section
      id="specimen"
      className="grid-blueprint relative overflow-hidden border-b border-canvas-line bg-canvas pb-14 text-white"
    >
      {/* Crosshair glyphs at a couple of grid intersections — decorative,
          hidden from AT. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[22%] top-[112px] hidden select-none font-mono text-xs text-brand-600/50 md:block"
      >
        +
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[14%] top-[304px] hidden select-none font-mono text-xs text-brand-600/40 md:block"
      >
        +
      </span>

      {/* Top marginalia row */}
      <div className="relative mx-auto flex max-w-6xl flex-col border-b border-canvas-line font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500 sm:flex-row">
        <div className="border-b border-canvas-line px-6 py-3 sm:flex-1 sm:border-b-0 sm:border-r md:px-10">
          TypeSmith &mdash; Control Surface
        </div>
        <div className="border-b border-canvas-line px-6 py-3 sm:flex-1 sm:border-b-0 sm:border-r md:px-10">
          Rev 04
        </div>
        <div className="px-6 py-3 md:px-10">Fig. A</div>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid grid-cols-1 gap-10 pt-14 md:grid-cols-12 md:gap-8 md:pt-20">
          {/* Headline column */}
          <div className="md:col-span-8">
            {/* Every line is nowrap so the composition stays exactly three
                lines; the clamps are tuned (and CDP-measured) so line 1
                ("Type is a system.") fits the 8-col track at 1440 and the
                full width at 390 without overflow. */}
            <h1 className="font-display text-[clamp(2rem,9vw,2.5rem)] font-medium leading-[1.05] tracking-tight text-white md:text-[clamp(2.75rem,6.2vw,5.75rem)] md:leading-[1.02]">
              <span className="reveal-mask">
                <span className="reveal-line whitespace-nowrap" style={{ animationDelay: "0.05s" }}>
                  Type is a <span className="text-brand-500">system.</span>
                </span>
              </span>
              <span className="reveal-mask">
                <span className="reveal-line whitespace-nowrap" style={{ animationDelay: "0.18s" }}>
                  Tune it
                </span>
              </span>
              <span className="reveal-mask">
                <span className="reveal-line whitespace-nowrap" style={{ animationDelay: "0.31s" }}>
                  like one.
                </span>
              </span>
            </h1>

            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-gray-400">
              TypeSmith builds modular type scales, pairs typefaces, and proves
              accessibility &mdash; instantly, in the browser.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link
                href="/editor"
                className="chamfer group relative inline-flex items-center gap-2 bg-brand-600 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-brand-700"
              >
                Start tuning
                <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                  -&gt;
                </span>
              </Link>
              <a
                href="#editions"
                className="link-underline font-mono text-[11px] uppercase tracking-[0.15em] text-gray-400 hover:text-brand-100"
              >
                View editions
              </a>
            </div>
          </div>

          {/* Right marginalia spec column — live-bound to the interactive ratio */}
          <div className="md:col-span-4">
            <div className="space-y-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-400 md:border-l md:border-canvas-line md:pl-6">
              <p>
                Base <span className="text-white">16px</span>
              </p>
              <p>
                Ratio <span className="text-white">{ratio.toFixed(3)}</span>
              </p>
              <p>
                Steps <span className="text-white">&minus;2 .. +4</span>
              </p>
              <p>
                WCAG <span className="text-white">13.9:1 AAA</span>
              </p>
              <p className="pt-2">
                <Link href="/editor" className="link-underline text-brand-100">
                  -&gt; Open the editor
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* THE INTERACTIVE SPECIMEN */}
      <div className="relative mt-16">
        <SpecimenRail
          ratio={ratio}
          ratioIndex={ratioIndex}
          onRatioIndexChange={setRatioIndex}
          sample={sample}
          onSampleChange={setSample}
        />
      </div>
    </section>
  );
}
