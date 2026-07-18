// Searchable Google Fonts catalog. A curated slice of the most-used families
// (the full API needs a key and returns 1,800+ rows — this keeps the picker
// fast and offline-friendly). Fonts load on demand: picking one injects its
// stylesheet, and gf: ids resolve without any registry so share links and
// saved sessions keep working across devices (see fontById in fonts.ts).

export interface GoogleFontEntry {
  name: string;
  category: "sans" | "serif" | "display" | "mono" | "handwriting";
}

export const GOOGLE_FONTS: GoogleFontEntry[] = [
  // Sans
  { name: "Roboto", category: "sans" },
  { name: "Open Sans", category: "sans" },
  { name: "Lato", category: "sans" },
  { name: "Montserrat", category: "sans" },
  { name: "Poppins", category: "sans" },
  { name: "Nunito", category: "sans" },
  { name: "Raleway", category: "sans" },
  { name: "Ubuntu", category: "sans" },
  { name: "Rubik", category: "sans" },
  { name: "Work Sans", category: "sans" },
  { name: "Fira Sans", category: "sans" },
  { name: "Karla", category: "sans" },
  { name: "Manrope", category: "sans" },
  { name: "DM Sans", category: "sans" },
  { name: "Josefin Sans", category: "sans" },
  { name: "Mulish", category: "sans" },
  { name: "Barlow", category: "sans" },
  { name: "Heebo", category: "sans" },
  { name: "PT Sans", category: "sans" },
  { name: "Noto Sans", category: "sans" },
  { name: "Source Sans 3", category: "sans" },
  { name: "Cabin", category: "sans" },
  { name: "Archivo", category: "sans" },
  { name: "Outfit", category: "sans" },
  { name: "Plus Jakarta Sans", category: "sans" },
  { name: "Figtree", category: "sans" },
  { name: "Lexend", category: "sans" },
  { name: "Urbanist", category: "sans" },
  { name: "Overpass", category: "sans" },
  { name: "Chivo", category: "sans" },
  { name: "Asap", category: "sans" },
  { name: "Assistant", category: "sans" },
  { name: "Catamaran", category: "sans" },
  { name: "Kanit", category: "sans" },
  { name: "Signika", category: "sans" },
  { name: "Varela Round", category: "sans" },
  { name: "Quicksand", category: "sans" },
  { name: "Comfortaa", category: "sans" },
  { name: "Exo 2", category: "sans" },
  { name: "Hind", category: "sans" },
  { name: "Oxygen", category: "sans" },
  { name: "Jost", category: "sans" },
  { name: "Sora", category: "sans" },
  { name: "Space Grotesk", category: "sans" },
  { name: "Albert Sans", category: "sans" },
  { name: "Be Vietnam Pro", category: "sans" },
  { name: "Public Sans", category: "sans" },
  { name: "Red Hat Display", category: "sans" },
  // Serif
  { name: "Merriweather", category: "serif" },
  { name: "Playfair Display", category: "serif" },
  { name: "Lora", category: "serif" },
  { name: "PT Serif", category: "serif" },
  { name: "Noto Serif", category: "serif" },
  { name: "Crimson Text", category: "serif" },
  { name: "Libre Baskerville", category: "serif" },
  { name: "Cormorant Garamond", category: "serif" },
  { name: "EB Garamond", category: "serif" },
  { name: "Bitter", category: "serif" },
  { name: "Arvo", category: "serif" },
  { name: "Zilla Slab", category: "serif" },
  { name: "Alegreya", category: "serif" },
  { name: "Cardo", category: "serif" },
  { name: "Spectral", category: "serif" },
  { name: "Vollkorn", category: "serif" },
  { name: "Domine", category: "serif" },
  { name: "Frank Ruhl Libre", category: "serif" },
  { name: "Newsreader", category: "serif" },
  { name: "Fraunces", category: "serif" },
  { name: "Literata", category: "serif" },
  { name: "Source Serif 4", category: "serif" },
  { name: "DM Serif Display", category: "serif" },
  { name: "Roboto Slab", category: "serif" },
  { name: "Slabo 27px", category: "serif" },
  // Display
  { name: "Oswald", category: "display" },
  { name: "Bebas Neue", category: "display" },
  { name: "Anton", category: "display" },
  { name: "Abril Fatface", category: "display" },
  { name: "Righteous", category: "display" },
  { name: "Alfa Slab One", category: "display" },
  { name: "Fredoka", category: "display" },
  { name: "Teko", category: "display" },
  { name: "Secular One", category: "display" },
  { name: "Archivo Black", category: "display" },
  { name: "Bricolage Grotesque", category: "display" },
  // Mono
  { name: "Roboto Mono", category: "mono" },
  { name: "Source Code Pro", category: "mono" },
  { name: "Fira Code", category: "mono" },
  { name: "Inconsolata", category: "mono" },
  { name: "Space Mono", category: "mono" },
  { name: "Ubuntu Mono", category: "mono" },
  { name: "Courier Prime", category: "mono" },
  // Handwriting
  { name: "Pacifico", category: "handwriting" },
  { name: "Caveat", category: "handwriting" },
  { name: "Dancing Script", category: "handwriting" },
  { name: "Shadows Into Light", category: "handwriting" },
  { name: "Satisfy", category: "handwriting" },
  { name: "Lobster", category: "handwriting" },
];

const FALLBACKS: Record<GoogleFontEntry["category"], string> = {
  sans: "system-ui, sans-serif",
  serif: "Georgia, serif",
  display: "system-ui, sans-serif",
  mono: "ui-monospace, monospace",
  handwriting: "cursive",
};

export function gfId(name: string): string {
  return "gf:" + name.replace(/ /g, "+");
}

export function gfFamilyFromId(id: string): string {
  return id.slice(3).replace(/\+/g, " ");
}

export function gfFallback(name: string): string {
  const entry = GOOGLE_FONTS.find((f) => f.name === name);
  return FALLBACKS[entry?.category ?? "sans"];
}

/**
 * Inject the stylesheet for a family once. Uses the v1 CSS API because it
 * silently serves whichever of the requested weights exist (v2 rejects the
 * whole request if any weight is missing).
 */
export function ensureGoogleFont(name: string): void {
  if (typeof document === "undefined") return;
  const id = "gf-" + name.toLowerCase().replace(/\s+/g, "-");
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css?family=${name.replace(/ /g, "+")}:400,500,600,700&display=swap`;
  document.head.appendChild(link);
}
