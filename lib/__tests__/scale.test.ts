import { describe, it, expect } from "vitest";
import {
  buildScale,
  buildFluidScale,
  clampExpr,
  toUnit,
  RATIO_PRESETS,
  FLUID_MIN_VW,
  FLUID_MAX_VW,
} from "../scale";

describe("buildScale", () => {
  it("computes base * ratio^step for each step", () => {
    const scale = buildScale(16, 1.25);
    const base = scale.find((s) => s.step === 0)!;
    expect(base.px).toBe(16);
    expect(scale.find((s) => s.step === 1)!.px).toBe(20);
    expect(scale.find((s) => s.step === 2)!.px).toBe(25); // 16 * 1.25^2
    expect(scale.find((s) => s.step === -1)!.px).toBeCloseTo(12.8, 2);
  });

  it("spans steps -2..5 with semantic labels", () => {
    const scale = buildScale(16, 1.25);
    expect(scale).toHaveLength(8);
    expect(scale[0]).toMatchObject({ step: -2, label: "Caption" });
    expect(scale.find((s) => s.step === 0)!.label).toBe("Body");
    expect(scale[scale.length - 1]).toMatchObject({ step: 5, label: "H1" });
  });

  it("is strictly increasing for every ratio preset", () => {
    for (const { value } of RATIO_PRESETS) {
      const scale = buildScale(16, value);
      for (let i = 1; i < scale.length; i++) {
        expect(scale[i].px).toBeGreaterThan(scale[i - 1].px);
      }
    }
  });
});

describe("toUnit", () => {
  it("formats px, rem, and em", () => {
    expect(toUnit(16, "px")).toBe("16px");
    expect(toUnit(16, "rem")).toBe("1rem");
    expect(toUnit(20, "rem")).toBe("1.25rem");
    expect(toUnit(24, "em")).toBe("1.5em");
  });

  it("rounds to three decimals", () => {
    expect(toUnit(17, "rem")).toBe("1.063rem");
  });
});

describe("fluid scale", () => {
  it("interpolates from a compressed min base to the regular scale", () => {
    const fluid = buildFluidScale(16, 1.25);
    const body = fluid.find((s) => s.step === 0)!;
    expect(body.maxPx).toBe(16);
    expect(body.minPx).toBe(14); // 16 * 0.875
    expect(body.clamp).toMatch(/^clamp\(0\.875rem, .+, 1rem\)$/);
  });

  it("evaluates to the endpoints at the min and max viewports", () => {
    const fluid = buildFluidScale(16, 1.25);
    for (const s of fluid) {
      const m = s.clamp.match(/clamp\(.+?, ([\d.]+)vw ([+-]) ([\d.]+)rem, .+?\)/);
      expect(m).not.toBeNull();
      const slopeVw = Number(m![1]);
      const intercept = (m![2] === "-" ? -1 : 1) * Number(m![3]) * 16;
      const at = (vw: number) => (slopeVw / 100) * vw + intercept;
      expect(at(FLUID_MIN_VW)).toBeCloseTo(s.minPx, 0);
      expect(at(FLUID_MAX_VW)).toBeCloseTo(s.maxPx, 0);
    }
  });

  it("degenerates to a plain rem value when min equals max", () => {
    expect(clampExpr(16, 16)).toBe("1rem");
  });
});
