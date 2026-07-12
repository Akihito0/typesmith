// Modular type-scale generation.
// A modular scale multiplies a base size by a ratio raised to a step index:
//   size(step) = base * ratio ^ step
// Steps below the base (negative) produce small text; steps above produce headings.

export type Unit = "px" | "rem" | "em";

export interface ScaleStep {
  /** step index relative to the base (0 = base) */
  step: number;
  /** semantic label, e.g. "Body", "H1" */
  label: string;
  /** computed size in px, rounded */
  px: number;
}

// Named ratios designers reach for. Custom values are allowed too.
export const RATIO_PRESETS: { name: string; value: number }[] = [
  { name: "Minor Second", value: 1.067 },
  { name: "Major Second", value: 1.125 },
  { name: "Minor Third", value: 1.2 },
  { name: "Major Third", value: 1.25 },
  { name: "Perfect Fourth", value: 1.333 },
  { name: "Augmented Fourth", value: 1.414 },
  { name: "Perfect Fifth", value: 1.5 },
  { name: "Golden Ratio", value: 1.618 },
];

// Labels applied from the smallest step upward, then the base sits at "Body".
const STEP_LABELS = ["Caption", "Small", "Body", "Lead", "H4", "H3", "H2", "H1", "Display"];

/**
 * Build a scale. We render two steps below the base and up to five above,
 * which covers caption → display for a typical interface.
 */
export function buildScale(base: number, ratio: number): ScaleStep[] {
  const from = -2;
  const to = 5;
  const steps: ScaleStep[] = [];
  for (let step = from; step <= to; step++) {
    const px = Math.round(base * Math.pow(ratio, step) * 100) / 100;
    const labelIndex = step - from; // 0-based from the smallest
    steps.push({
      step,
      label: STEP_LABELS[labelIndex] ?? `Step ${step}`,
      px,
    });
  }
  return steps;
}

export function toUnit(px: number, unit: Unit, base = 16): string {
  if (unit === "px") return `${round(px)}px`;
  const v = px / base;
  return `${round(v)}${unit}`;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
