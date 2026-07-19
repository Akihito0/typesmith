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

// --- APCA (WCAG 3 draft) ---------------------------------------------------
// Accessible Perceptual Contrast Algorithm, SAPC-4g constants. Returns Lc
// (lightness contrast): positive for dark text on light backgrounds, negative
// for light-on-dark, magnitude 0..~106. Rough guidance: |Lc| ≥ 90 preferred
// body, ≥ 75 body minimum, ≥ 60 large/bold text, ≥ 45 headlines, ≥ 30
// non-text. Not a clinical implementation — a design-guidance port.

function apcaScreenLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => Math.pow(c / 255, 2.4);
  let y = 0.2126729 * lin(r) + 0.7151522 * lin(g) + 0.072175 * lin(b);
  // Soft clamp near black.
  if (y < 0.022) y += Math.pow(0.022 - y, 1.414);
  return y;
}

export function apcaContrast(fg: string, bg: string): number | null {
  const f = hexToRgb(fg);
  const g = hexToRgb(bg);
  if (!f || !g) return null;
  const ytx = apcaScreenLuminance(f);
  const ybg = apcaScreenLuminance(g);

  let sapc: number;
  if (ybg > ytx) {
    // dark text on light background ("normal" polarity)
    sapc = (Math.pow(ybg, 0.56) - Math.pow(ytx, 0.57)) * 1.14;
    if (sapc < 0.1) return 0;
    return Math.round((sapc - 0.027) * 1000) / 10;
  }
  // light text on dark background ("reverse" polarity)
  sapc = (Math.pow(ybg, 0.65) - Math.pow(ytx, 0.62)) * 1.14;
  if (sapc > -0.1) return 0;
  return Math.round((sapc + 0.027) * 1000) / 10;
}

export type ApcaGrade = "Body" | "Large" | "Headline" | "Non-text" | "Fail";

export function apcaGrade(lc: number): ApcaGrade {
  const a = Math.abs(lc);
  if (a >= 75) return "Body";
  if (a >= 60) return "Large";
  if (a >= 45) return "Headline";
  if (a >= 30) return "Non-text";
  return "Fail";
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
