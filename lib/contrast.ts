// WCAG 2.1 contrast ratio calculation.
// Ratio = (Llighter + 0.05) / (Ldarker + 0.05), where L is relative luminance.
// Thresholds:
//   AA  normal >= 4.5 | AA  large >= 3.0
//   AAA normal >= 7.0 | AAA large >= 4.5

export interface ContrastResult {
  ratio: number;
  normalAA: boolean;
  normalAAA: boolean;
  largeAA: boolean;
  largeAAA: boolean;
  /** best single badge to show: "AAA" | "AA" | "Fail" */
  grade: "AAA" | "AA" | "Fail";
}

export function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastRatio(fg: string, bg: string): number | null {
  const a = hexToRgb(fg);
  const b = hexToRgb(bg);
  if (!a || !b) return null;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export function evaluateContrast(fg: string, bg: string): ContrastResult | null {
  const ratio = contrastRatio(fg, bg);
  if (ratio === null) return null;
  const normalAA = ratio >= 4.5;
  const normalAAA = ratio >= 7;
  const largeAA = ratio >= 3;
  const largeAAA = ratio >= 4.5;
  const grade: ContrastResult["grade"] = normalAAA
    ? "AAA"
    : normalAA
      ? "AA"
      : "Fail";
  return { ratio, normalAA, normalAAA, largeAA, largeAAA, grade };
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

// --- Color-blindness simulation (proposal roadmap item) -------------------
// Approximate matrices for the three common dichromacies. Good enough for a
// design-preview toggle; not a clinical tool.
type Cvd = "protanopia" | "deuteranopia" | "tritanopia";

const MATRICES: Record<Cvd, number[]> = {
  protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
  deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
  tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
};

export function simulateCvd(hex: string, type: Cvd): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const m = MATRICES[type];
  const [r, g, b] = rgb;
  const nr = clamp(m[0] * r + m[1] * g + m[2] * b);
  const ng = clamp(m[3] * r + m[4] * g + m[5] * b);
  const nb = clamp(m[6] * r + m[7] * g + m[8] * b);
  return rgbToHex(nr, ng, nb);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}
