// "Get Code" / export. Produces CSS variables, a Tailwind config fragment,
// SCSS variables, and JSON design tokens from the current project state.

import { buildScale, toUnit } from "./scale";
import { fontById } from "./fonts";
import type { ProjectState } from "./store";

export type ExportFormat = "css" | "tailwind" | "scss" | "json";

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  css: "CSS Variables",
  tailwind: "Tailwind Config",
  scss: "SCSS Variables",
  json: "JSON Tokens",
};

function scaleTokens(state: ProjectState) {
  return buildScale(state.base, state.ratio).map((s) => ({
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
      `  --color-foreground: ${state.foreground};`,
      `  --color-background: ${state.background};`,
      `  --color-accent: ${state.accent};`,
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
      `$color-foreground: ${state.foreground};`,
      `$color-background: ${state.background};`,
      `$color-accent: ${state.accent};`,
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
      "      colors: {",
      `        foreground: "${state.foreground}",`,
      `        background: "${state.background}",`,
      `        accent: "${state.accent}",`,
      "      },",
      "    },",
      "  },",
      "};",
    ].join("\n");
  }

  // json
  const tokens = {
    project: state.projectName,
    author: state.author,
    typography: {
      heading: heading.name,
      body: body.name,
      base: `${state.base}px`,
      ratio: state.ratio,
      scale: Object.fromEntries(steps.map((s) => [s.key, toUnit(s.px, state.unit)])),
    },
    color: {
      foreground: state.foreground,
      background: state.background,
      accent: state.accent,
    },
  };
  return JSON.stringify(tokens, null, minify ? 0 : 2);
}
