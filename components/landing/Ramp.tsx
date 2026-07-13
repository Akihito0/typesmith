"use client";

import { buildScale } from "@/lib/scale";
import { useScrollProgress } from "./useReveal";

// 02 — THE RAMP. A pinned, scroll-driven traverse of the modular scale:
// the section is 300vh tall, its inner viewport is sticky, and scrolling
// through it sweeps a live glyph continuously from step −2 (Caption) to
// step +5 (Display) at 16px × 1.25^n. The product's core math, demonstrated
// by the scroll bar itself — no autoplay, the user drives every frame, so it
// stays legible under prefers-reduced-motion too. Fail-open: without JS the
// section simply shows the first step, nothing is hidden.
const RATIO = 1.25;
const STEPS = buildScale(16, RATIO); // steps -2 .. +5
const SPAN = STEPS.length - 1;

function fmtStep(step: number) {
  return step >= 0 ? `+${step}` : `${step}`;
}

export function Ramp() {
  const { ref, progress } = useScrollProgress<HTMLElement>();
  const cont = STEPS[0].step + progress * SPAN;
  const size = 16 * Math.pow(RATIO, cont);
  const nearest = Math.min(SPAN, Math.max(0, Math.round(cont - STEPS[0].step)));
  const active = STEPS[nearest];

  return (
    <section
      id="ramp"
      ref={ref}
      className="relative border-b border-canvas-line bg-canvas text-white"
      style={{ height: "300vh" }}
    >
      {/* Pinned frame sits below the 64px sticky nav (top-16), so its own
          marginalia header stays visible while pinned. */}
      <div className="grid-blueprint-faint sticky top-16 flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
        {/* Marginalia header */}
        <div className="flex flex-col border-b border-canvas-line font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500 sm:flex-row">
          <div className="border-b border-canvas-line px-6 py-3 sm:flex-1 sm:border-b-0 sm:border-r sm:border-canvas-line md:px-10">
            02 &mdash; The Ramp
          </div>
          <div className="border-b border-canvas-line px-6 py-3 sm:flex-1 sm:border-b-0 sm:border-r sm:border-canvas-line md:px-10">
            Scroll to traverse the scale
          </div>
          <div className="px-6 py-3 tabular-nums md:px-10">
            16px base &times; 1.250 Major Third
          </div>
        </div>

        {/* Continuous progress hairline */}
        <div className="relative h-px w-full bg-canvas-line">
          <div
            className="absolute left-0 top-0 h-px bg-brand-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Crosshairs — decorative */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[16%] top-[30%] hidden select-none font-mono text-xs text-brand-600/40 md:block"
        >
          +
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[18%] bottom-[26%] hidden select-none font-mono text-xs text-brand-600/40 md:block"
        >
          +
        </span>

        {/* The live glyph */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
          <span
            className="font-display font-medium leading-none text-white"
            style={{ fontSize: `min(${(size * 6).toFixed(2)}px, 56vw, 52vh)` }}
          >
            Aa
          </span>
          <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-400 tabular-nums">
            Step <span className="text-white">{fmtStep(active.step)}</span>
            <span aria-hidden="true" className="mx-2 text-brand-500">&#9632;</span>
            <span className="text-white">{size.toFixed(2)}px</span>
            <span aria-hidden="true" className="mx-2 text-brand-500">&#9632;</span>
            <span className="text-white">{(size / 16).toFixed(3)}rem</span>
            <span aria-hidden="true" className="mx-2 text-brand-500">&#9632;</span>
            <span className="text-brand-100">{active.label}</span>
          </p>
        </div>

        {/* Step tick rail */}
        <div className="border-t border-canvas-line">
          <div className="mx-auto grid max-w-6xl grid-cols-4 px-6 sm:grid-cols-8 md:px-10">
            {STEPS.map((s, i) => (
              <div
                key={s.step}
                className="flex flex-col gap-2 border-l border-canvas-line py-4 pl-2 md:pl-3"
              >
                <span
                  aria-hidden="true"
                  className={`h-3 w-px transition-colors duration-200 ${
                    i === nearest ? "bg-brand-500" : "bg-canvas-line"
                  }`}
                />
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.15em] transition-colors duration-200 ${
                    i === nearest ? "text-brand-500" : "text-gray-600"
                  }`}
                >
                  {fmtStep(s.step)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-canvas-line px-6 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-100 md:px-10">
          Proofed at 600%
        </div>
      </div>
    </section>
  );
}
