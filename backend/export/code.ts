// "Get Code" / export. Produces CSS variables, a Tailwind config fragment,
// SCSS variables, and JSON design tokens from the current project state.

import { buildScale, buildFluidScale, toUnit } from "@/backend/typography/scale";
import { fontById } from "@/backend/fonts/catalog";
import type { ProjectState } from "@/backend/project/store";

export type ExportFormat = "css" | "fluid" | "tailwind" | "scss" | "json" | "tokens";

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  css: "CSS Variables",
  fluid: "Fluid CSS",
  tailwind: "Tailwind Config",
  scss: "SCSS Variables",
  json: "JSON Tokens",
  tokens: "Design Tokens",
};

function colorEntries(state: ProjectState): [string, string][] {
  return [
    ["foreground", state.foreground],
    ["background", state.background],
    ["accent", state.accent],
    ["muted", state.mutedColor],
    ["surface", state.surfaceColor],
  ];
}

function scaleTokens(state: ProjectState) {
  return buildScale(state.base, state.ratio, state.stepOverrides).map((s) => ({
    key: s.label.toLowerCase().replace(/\s+/g, "-"),
    rem: Math.round((s.px / 16) * 1000) / 1000,
    px: s.px,
  }));
}

export function generate(state: ProjectState, format: ExportFormat, minify = false): string {
  const steps = scaleTokens(state);
  const heading = fontById(state.headingFont);
  const body = fontById(state.bodyFont);

  if (format === "css") {
    const lines = [
      ":root {",
      `  --font-heading: ${heading.stack};`,
      `  --font-body: ${body.stack};`,
      `  --font-base: ${state.base}px;`,
      `  --ratio: ${state.ratio};`,
      ...steps.map((s) => `  --text-${s.key}: ${toUnit(s.px, state.unit)}; /* ${s.px}px */`),
      `  --weight-heading: ${state.headingWeight};`,
      `  --weight-body: ${state.bodyWeight};`,
      `  --leading-heading: ${state.headingLeading};`,
      `  --leading-body: ${state.bodyLeading};`,
      `  --tracking-heading: ${state.headingTracking}em;`,
      ...colorEntries(state).map(([k, v]) => `  --color-${k}: ${v};`),
      "}",
    ];
    return minify ? lines.join("").replace(/\s*\/\*.*?\*\//g, "") : lines.join("\n");
  }

  if (format === "fluid") {
    const fluid = buildFluidScale(state.base, state.ratio, {
      minVw: state.fluidMinVw,
      maxVw: state.fluidMaxVw,
      minScale: state.fluidMinScale,
      overrides: state.stepOverrides,
    }).map((s) => ({
      key: s.label.toLowerCase().replace(/\s+/g, "-"),
      ...s,
    }));
    const lines = [
      `/* Fluid type scale — sizes interpolate between ${state.fluidMinVw}px and ${state.fluidMaxVw}px viewports. */`,
      ":root {",
      `  --font-heading: ${heading.stack};`,
      `  --font-body: ${body.stack};`,
      ...fluid.map((s) => `  --text-${s.key}: ${s.clamp}; /* ${s.minPx}px → ${s.maxPx}px */`),
      `  --weight-heading: ${state.headingWeight};`,
      `  --weight-body: ${state.bodyWeight};`,
      `  --leading-heading: ${state.headingLeading};`,
      `  --leading-body: ${state.bodyLeading};`,
      `  --tracking-heading: ${state.headingTracking}em;`,
      ...colorEntries(state).map(([k, v]) => `  --color-${k}: ${v};`),
      "}",
    ];
    return minify ? lines.join("").replace(/\s*\/\*.*?\*\//g, "") : lines.join("\n");
  }

  if (format === "scss") {
    const lines = [
      `$font-heading: ${heading.stack};`,
      `$font-body: ${body.stack};`,
      `$font-base: ${state.base}px;`,
      `$ratio: ${state.ratio};`,
      ...steps.map((s) => `$text-${s.key}: ${toUnit(s.px, state.unit)};`),
      `$weight-heading: ${state.headingWeight};`,
      `$weight-body: ${state.bodyWeight};`,
      `$leading-heading: ${state.headingLeading};`,
      `$leading-body: ${state.bodyLeading};`,
      `$tracking-heading: ${state.headingTracking}em;`,
      ...colorEntries(state).map(([k, v]) => `$color-${k}: ${v};`),
    ];
    return lines.join("\n");
  }

  if (format === "tailwind") {
    const fontSize = steps
      .map((s) => `        "${s.key}": "${toUnit(s.px, state.unit)}",`)
      .join("\n");
    return [
      "/** @type {import('tailwindcss').Config} */",
      "module.exports = {",
      "  theme: {",
      "    extend: {",
      "      fontFamily: {",
      `        heading: [${JSON.stringify(heading.stack)}],`,
      `        body: [${JSON.stringify(body.stack)}],`,
      "      },",
      "      fontSize: {",
      fontSize,
      "      },",
      "      lineHeight: {",
      `        heading: "${state.headingLeading}",`,
      `        body: "${state.bodyLeading}",`,
      "      },",
      "      letterSpacing: {",
      `        heading: "${state.headingTracking}em",`,
      "      },",
      "      fontWeight: {",
      `        heading: "${state.headingWeight}",`,
      `        body: "${state.bodyWeight}",`,
      "      },",
      "      colors: {",
      ...colorEntries(state).map(([k, v]) => `        ${k}: "${v}",`),
      "      },",
      "    },",
      "  },",
      "};",
    ].join("\n");
  }

  if (format === "json") {
    const tokens = {
      project: state.projectName,
      author: state.author,
      typography: {
        heading: heading.name,
        body: body.name,
        base: `${state.base}px`,
        ratio: state.ratio,
        scale: Object.fromEntries(steps.map((s) => [s.key, toUnit(s.px, state.unit)])),
        weight: { heading: state.headingWeight, body: state.bodyWeight },
        leading: { heading: state.headingLeading, body: state.bodyLeading },
        tracking: { heading: `${state.headingTracking}em` },
      },
      color: Object.fromEntries(colorEntries(state)),
    };
    return JSON.stringify(tokens, null, minify ? 0 : 2);
  }

  // W3C Design Tokens Community Group format — importable by Figma token
  // plugins and Style Dictionary.
  const w3c = {
    color: Object.fromEntries(
      colorEntries(state).map(([k, v]) => [k, { $type: "color", $value: v }])
    ),
    fontFamily: {
      heading: {
        $type: "fontFamily",
        $value: heading.stack.split(",").map((s) => s.trim().replace(/^'|'$/g, "")),
      },
      body: {
        $type: "fontFamily",
        $value: body.stack.split(",").map((s) => s.trim().replace(/^'|'$/g, "")),
      },
    },
    fontWeight: {
      heading: { $type: "fontWeight", $value: state.headingWeight },
      body: { $type: "fontWeight", $value: state.bodyWeight },
    },
    fontSize: Object.fromEntries(
      steps.map((s) => [s.key, { $type: "dimension", $value: `${s.rem}rem` }])
    ),
    lineHeight: {
      heading: { $type: "number", $value: state.headingLeading },
      body: { $type: "number", $value: state.bodyLeading },
    },
    letterSpacing: {
      heading: { $type: "dimension", $value: `${state.headingTracking}em` },
    },
  };
  return JSON.stringify(w3c, null, minify ? 0 : 2);
}
