"use client";

// THE LIVE SPECIMEN RAIL — the product demonstrated live, not described.
// v4: this is no longer a static proof sheet. A mono control strip drives
// real state (ratio + preview text) that the Hero owns; every row below is
// buildScale(16, ratio) recomputed on each change, so dragging the ratio
// slider visibly re-tunes the whole rail in real time.
//
// Proof-zoom convention carries over from v3: samples render at 200% of the
// computed value on desktop (via a CSS custom property swap at the md:
// breakpoint) and 100% on small screens.
import type { CSSProperties } from "react";
import { buildScale, toUnit, RATIO_PRESETS } from "@/lib/scale";

const STEPS_SHOWN = [4, 3, 2, 1, 0];

export function SpecimenRail({
  ratio,
  ratioIndex,
  onRatioIndexChange,
  sample,
  onSampleChange,
}: {
  ratio: number;
  ratioIndex: number;
  onRatioIndexChange: (index: number) => void;
  sample: string;
  onSampleChange: (value: string) => void;
}) {
  const preset = RATIO_PRESETS[ratioIndex];
  const steps = buildScale(16, ratio)
    .filter((s) => STEPS_SHOWN.includes(s.step))
    .sort((a, b) => b.step - a.step);
  const shown = sample.trim() ? sample : "Hamburgefonstiv";

  return (
    <div className="border-t border-canvas-line">
      {/* Control strip — the instrument controls, not a caption */}
      <div className="flex flex-col gap-4 border-b border-canvas-line px-6 py-5 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-400 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:px-10">
        {/* At 390px this whole group is its own stacked row (outer flex-col);
            the preset name drops to a second line (basis-full) instead of
            squeezing the slider. */}
        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:min-w-0 sm:flex-1">
          <label htmlFor="hero-ratio" className="shrink-0">
            Ratio
          </label>
          <input
            id="hero-ratio"
            type="range"
            className="ts-range min-w-0 flex-1 sm:max-w-[200px]"
            min={0}
            max={RATIO_PRESETS.length - 1}
            step={1}
            value={ratioIndex}
            aria-label="Type scale ratio — snaps to named presets"
            onChange={(e) => onRatioIndexChange(Number(e.target.value))}
          />
          <span className="shrink-0 text-white">{preset.value.toFixed(3)}</span>
          <span className="basis-full whitespace-nowrap text-brand-100 sm:basis-auto">
            {preset.name}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="hero-sample" className="shrink-0">
            Sample
          </label>
          <input
            id="hero-sample"
            type="text"
            value={sample}
            maxLength={24}
            aria-label="Preview text for the specimen rail"
            onChange={(e) => onSampleChange(e.target.value)}
            className="w-[160px] min-w-0 border-b border-canvas-line bg-transparent px-1 py-1 text-[11px] normal-case tracking-normal text-white outline-none focus-visible:border-brand-500 sm:w-[180px]"
          />
        </div>
      </div>

      {steps.map((s) => (
        <div
          key={s.step}
          className="group relative flex flex-col gap-1.5 overflow-hidden border-b border-canvas-line px-6 py-4 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-baseline sm:gap-8 md:px-10"
        >
          <Corners />
          <span className="w-full shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500 transition-colors group-hover:text-brand-500 sm:w-[230px]">
            step {s.step > 0 ? `+${s.step}` : s.step} &mdash; {s.px}px &mdash; {toUnit(s.px, "rem")}
          </span>
          <span
            className="min-w-0 max-w-full truncate font-display font-medium text-[length:var(--proof)] leading-none text-white md:text-[length:var(--proof-2x)]"
            style={
              {
                "--proof": `${s.px}px`,
                "--proof-2x": `${s.px * 2}px`,
              } as CSSProperties
            }
          >
            {shown}
          </span>
        </div>
      ))}

      <div className="flex justify-end px-6 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-brand-100 md:px-10">
        <span className="md:hidden">Shown at 100%</span>
        <span className="hidden md:inline">Shown at 200%</span>
      </div>
    </div>
  );
}

// Brand-blue corner brackets that frame the row on hover — carried over
// unchanged: this is a design *principle* (marginalia framing), not skin.
function Corners() {
  const base =
    "pointer-events-none absolute h-2.5 w-2.5 border-brand-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100";
  return (
    <>
      <span className={`${base} left-1.5 top-1.5 border-l border-t`} />
      <span className={`${base} right-1.5 top-1.5 border-r border-t`} />
      <span className={`${base} bottom-1.5 left-1.5 border-b border-l`} />
      <span className={`${base} bottom-1.5 right-1.5 border-b border-r`} />
    </>
  );
}
