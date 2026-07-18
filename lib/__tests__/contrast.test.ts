import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  contrastRatio,
  evaluateContrast,
  formatRatio,
  simulateCvd,
} from "../contrast";

describe("hexToRgb", () => {
  it("parses 6-digit and 3-digit hex, with or without #", () => {
    expect(hexToRgb("#2563eb")).toEqual([37, 99, 235]);
    expect(hexToRgb("2563eb")).toEqual([37, 99, 235]);
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
  });

  it("rejects invalid input", () => {
    expect(hexToRgb("#12345")).toBeNull();
    expect(hexToRgb("not-a-color")).toBeNull();
    expect(hexToRgb("")).toBeNull();
  });
});

describe("contrastRatio", () => {
  it("is 21:1 for black on white and symmetric", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });

  it("is 1:1 for identical colors", () => {
    expect(contrastRatio("#2563eb", "#2563eb")).toBeCloseTo(1, 5);
  });

  it("returns null for invalid colors", () => {
    expect(contrastRatio("nope", "#ffffff")).toBeNull();
  });
});

describe("evaluateContrast", () => {
  it("grades AAA at >= 7:1", () => {
    const r = evaluateContrast("#000000", "#ffffff")!;
    expect(r.grade).toBe("AAA");
    expect(r.normalAA).toBe(true);
    expect(r.largeAAA).toBe(true);
  });

  it("grades the brand blue on white as AA (ratio ~5.17)", () => {
    const r = evaluateContrast("#2563eb", "#ffffff")!;
    expect(r.ratio).toBeGreaterThan(4.5);
    expect(r.ratio).toBeLessThan(7);
    expect(r.grade).toBe("AA");
    expect(r.normalAAA).toBe(false);
    expect(r.largeAAA).toBe(true); // >= 4.5
  });

  it("fails low-contrast pairs but may still pass large text", () => {
    const r = evaluateContrast("#999999", "#ffffff")!;
    expect(r.grade).toBe("Fail");
    expect(r.normalAA).toBe(false);
  });
});

describe("formatRatio", () => {
  it("renders two decimals with the :1 suffix", () => {
    expect(formatRatio(4.5)).toBe("4.50:1");
    expect(formatRatio(21)).toBe("21.00:1");
  });
});

describe("simulateCvd", () => {
  it("returns a valid hex for each dichromacy type", () => {
    for (const type of ["protanopia", "deuteranopia", "tritanopia"] as const) {
      expect(simulateCvd("#2563eb", type)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("leaves pure grays nearly unchanged", () => {
    expect(simulateCvd("#808080", "deuteranopia")).toBe("#808080");
  });

  it("passes through invalid input untouched", () => {
    expect(simulateCvd("oops", "protanopia")).toBe("oops");
  });
});
