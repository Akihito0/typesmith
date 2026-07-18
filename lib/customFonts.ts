"use client";

import { create } from "zustand";
import { registerCustomFont, type FontDef } from "./fonts";

// Custom font upload (session-only). The file is loaded through the FontFace
// API and registered under a family name derived from the filename. Uploads
// can't be serialized into the share URL or localStorage, so they last until
// the tab closes; a share link opened elsewhere falls back to the default face.

interface CustomFontsStore {
  fonts: FontDef[];
  add: (file: File) => Promise<FontDef | null>;
}

export const ACCEPTED_FONT_TYPES = ".woff,.woff2,.ttf,.otf";

export const useCustomFonts = create<CustomFontsStore>((set) => ({
  fonts: [],
  add: async (file) => {
    try {
      const family = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " ")
        .trim();
      if (!family) return null;
      const face = new FontFace(family, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      const def: FontDef = {
        id: `custom:${family.toLowerCase().replace(/\s+/g, "-")}`,
        name: `${family} (uploaded)`,
        stack: `'${family}', system-ui, sans-serif`,
        category: "sans",
      };
      registerCustomFont(def);
      set((s) => ({ fonts: [...s.fonts.filter((f) => f.id !== def.id), def] }));
      return def;
    } catch {
      return null;
    }
  },
}));
