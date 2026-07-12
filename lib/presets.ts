// Curated starting points selectable from the "Presets" dropdown in the toolbar.
// The shuffle button picks a random one.

export interface Preset {
  name: string;
  heading: string; // font id
  body: string; // font id
  base: number;
  ratio: number;
}

export const PRESETS: Preset[] = [
  { name: "SaaS Minimalist", heading: "geist-sans", body: "geist-mono", base: 16, ratio: 1.25 },
  { name: "SaaS Landing", heading: "space-grotesk", body: "inter", base: 16, ratio: 1.25 },
  { name: "Editorial", heading: "playfair", body: "lora", base: 18, ratio: 1.333 },
  { name: "Technical Docs", heading: "inter", body: "ibm-plex-mono", base: 15, ratio: 1.2 },
  { name: "Bold Display", heading: "sora", body: "inter", base: 17, ratio: 1.5 },
  { name: "Developer Portfolio", heading: "geist-sans", body: "jetbrains-mono", base: 16, ratio: 1.414 },
];

export function presetByName(name: string): Preset | undefined {
  return PRESETS.find((p) => p.name === name);
}

export function randomPreset(exclude?: string): Preset {
  const pool = exclude ? PRESETS.filter((p) => p.name !== exclude) : PRESETS;
  return pool[Math.floor(Math.random() * pool.length)];
}
