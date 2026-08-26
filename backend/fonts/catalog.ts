import { gfFallback } from "@/backend/fonts/google";

// The preview fonts a user can pick for heading/body. All are loaded once from
// Google Fonts in the root layout, so switching is just a font-family swap.
// "Geist" refers to the app's own bundled Geist family (via next `geist` pkg),
// exposed through the --font-geist-sans / --font-geist-mono CSS variables.

export interface FontDef {
  /** value stored in state */
  id: string;
  /** label shown in dropdowns */
  name: string;
  /** css font-family stack */
  stack: string;
  category: "sans" | "serif" | "mono" | "display";
}

export const FONTS: FontDef[] = [
  {
    id: "geist-sans",
    name: "Geist Sans",
    stack: "var(--font-geist-sans), system-ui, sans-serif",
    category: "sans",
  },
  {
    id: "geist-mono",
    name: "Geist Mono",
    stack: "var(--font-geist-mono), ui-monospace, monospace",
    category: "mono",
  },
  { id: "inter", name: "Inter", stack: "'Inter', system-ui, sans-serif", category: "sans" },
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    stack: "'Space Grotesk', system-ui, sans-serif",
    category: "display",
  },
  { id: "sora", name: "Sora", stack: "'Sora', system-ui, sans-serif", category: "display" },
  {
    id: "playfair",
    name: "Playfair Display",
    stack: "'Playfair Display', Georgia, serif",
    category: "serif",
  },
  { id: "lora", name: "Lora", stack: "'Lora', Georgia, serif", category: "serif" },
  {
    id: "ibm-plex-mono",
    name: "IBM Plex Mono",
    stack: "'IBM Plex Mono', ui-monospace, monospace",
    category: "mono",
  },
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    stack: "'JetBrains Mono', ui-monospace, monospace",
    category: "mono",
  },
];

// Session-only fonts registered at runtime via the FontFace API (see
// lib/customFonts.ts). A binary font can't travel in the share URL or
// localStorage, so an unknown id gracefully falls back to the default face.
const CUSTOM: FontDef[] = [];

export function registerCustomFont(def: FontDef) {
  const i = CUSTOM.findIndex((f) => f.id === def.id);
  if (i >= 0) CUSTOM[i] = def;
  else CUSTOM.push(def);
}

export function fontById(id: string): FontDef {
  // Google Fonts ids ("gf:Family+Name") resolve from the id itself, so share
  // links and saved sessions work on any device — the stylesheet is injected
  // on demand by ensureGoogleFont (lib/googleFonts.ts).
  if (id.startsWith("gf:")) {
    const family = id.slice(3).replace(/\+/g, " ");
    return {
      id,
      name: family,
      stack: `'${family}', ${gfFallback(family)}`,
      category: "sans",
    };
  }
  return FONTS.find((f) => f.id === id) ?? CUSTOM.find((f) => f.id === id) ?? FONTS[0];
}

// Google Fonts stylesheet URL covering every non-Geist face above.
export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Inter:wght@400;500;600;700;800",
    "family=Space+Grotesk:wght@400;500;600;700",
    "family=Sora:wght@400;600;700;800",
    "family=Playfair+Display:wght@400;600;700;800",
    "family=Lora:wght@400;500;600;700",
    "family=IBM+Plex+Mono:wght@400;500;600",
    "family=JetBrains+Mono:wght@400;500;700",
  ].join("&") +
  "&display=swap";
