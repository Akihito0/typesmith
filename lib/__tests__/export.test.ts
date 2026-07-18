import { describe, it, expect } from "vitest";
import { generate, FORMAT_LABELS, type ExportFormat } from "../export";
import { DEFAULT_PROJECT } from "../store";

const state = { ...DEFAULT_PROJECT };

describe("generate", () => {
  it("emits CSS variables for fonts, scale, leading, and colors", () => {
    const css = generate(state, "css");
    expect(css).toContain(":root {");
    expect(css).toContain("--font-heading:");
    expect(css).toContain("--text-h1:");
    expect(css).toContain("--text-body:");
    expect(css).toContain(`--leading-body: ${state.bodyLeading};`);
    expect(css).toContain(`--tracking-heading: ${state.headingTracking}em;`);
    expect(css).toContain(`--color-accent: ${state.accent};`);
  });

  it("emits fluid CSS with clamp() per step", () => {
    const css = generate(state, "fluid");
    expect(css).toContain("--text-h1: clamp(");
    expect(css).toContain("--text-body: clamp(");
    expect(css).toContain("Fluid type scale");
  });

  it("emits SCSS variables", () => {
    const scss = generate(state, "scss");
    expect(scss).toContain("$font-heading:");
    expect(scss).toContain("$text-h1:");
    expect(scss).toContain(`$leading-heading: ${state.headingLeading};`);
  });

  it("emits a Tailwind config with fontSize, lineHeight, and letterSpacing", () => {
    const tw = generate(state, "tailwind");
    expect(tw).toContain("module.exports");
    expect(tw).toContain('"h1":');
    expect(tw).toContain("lineHeight: {");
    expect(tw).toContain(`heading: "${state.headingTracking}em",`);
  });

  it("emits parseable JSON tokens", () => {
    const tokens = JSON.parse(generate(state, "json"));
    expect(tokens.project).toBe(state.projectName);
    expect(tokens.typography.ratio).toBe(state.ratio);
    expect(tokens.typography.scale.body).toBe("1rem");
    expect(tokens.typography.leading.body).toBe(state.bodyLeading);
    expect(tokens.color.accent).toBe(state.accent);
  });

  it("respects the px unit setting", () => {
    const css = generate({ ...state, unit: "px" }, "css");
    expect(css).toContain("--text-body: 16px;");
  });

  it("has a label and output for every format", () => {
    for (const format of Object.keys(FORMAT_LABELS) as ExportFormat[]) {
      expect(FORMAT_LABELS[format]).toBeTruthy();
      expect(generate(state, format).length).toBeGreaterThan(50);
    }
  });
});
