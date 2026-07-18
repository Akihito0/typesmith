"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Unit } from "./scale";
import { PRESETS, type Preset } from "./presets";

// The whole project is one state object. Type scale, fonts, colors, mockups,
// and exports all read from here — no per-tool re-entry. This is the shape that
// gets encoded into a shareable URL.
export interface ProjectState {
  projectName: string;
  author: string;

  // Type
  headingFont: string; // font id
  bodyFont: string; // font id
  base: number;
  ratio: number;
  unit: Unit;
  previewText: string;

  // Color
  foreground: string; // hex
  background: string; // hex
  accent: string; // hex

  // Preview copy used by both mockups
  headline: string;
  subhead: string;
  body: string;

  // UI mode
  mode: "edit" | "view";
}

export interface ProjectActions {
  set: <K extends keyof ProjectState>(key: K, value: ProjectState[K]) => void;
  applyPreset: (p: Preset) => void;
  hydrate: (partial: Partial<ProjectState>) => void;
  /** Start a fresh project (undoable). */
  reset: () => void;
  undo: () => void;
  redo: () => void;
}

export interface ProjectHistory {
  past: ProjectState[];
  future: ProjectState[];
}

const DEFAULT: ProjectState = {
  projectName: "TypeSmith Mobile",
  author: "Design Team",

  headingFont: PRESETS[0].heading,
  bodyFont: PRESETS[0].body,
  base: PRESETS[0].base,
  ratio: PRESETS[0].ratio,
  unit: "rem",
  previewText: "Modern Typography",

  foreground: "#2563eb",
  background: "#ffffff",
  accent: "#2563eb",

  headline: "Engineering precision for modern typography.",
  subhead: "Architecting Digital Precision",
  body: "The ultimate tool for developers and designers to craft perfectly scaled, accessible, and performant type systems for any digital interface.",

  mode: "edit",
};

const PROJECT_KEYS = Object.keys(DEFAULT) as (keyof ProjectState)[];
const HISTORY_LIMIT = 50;

// Rapid edits to the same field (typing, dragging a color picker) coalesce
// into one history entry so undo steps over the whole burst.
const COALESCE_MS = 800;
let lastEditKey: keyof ProjectState | null = null;
let lastEditAt = 0;

function snapshot(s: ProjectState): ProjectState {
  const out: Partial<ProjectState> = {};
  PROJECT_KEYS.forEach((k) => {
    (out as Record<keyof ProjectState, unknown>)[k] = s[k];
  });
  return out as ProjectState;
}

type Store = ProjectState & ProjectHistory & ProjectActions;

function pushPast(s: Store): ProjectState[] {
  return [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)];
}

export const useProject = create<Store>()(
  persist(
    (set) => ({
      ...DEFAULT,
      past: [],
      future: [],

      set: (key, value) =>
        set((s) => {
          const now = Date.now();
          const coalesce = key === lastEditKey && now - lastEditAt < COALESCE_MS;
          lastEditKey = key;
          lastEditAt = now;
          return {
            [key]: value,
            future: [],
            ...(coalesce ? {} : { past: pushPast(s) }),
          } as Partial<Store>;
        }),

      applyPreset: (p) =>
        set((s) => {
          lastEditKey = null;
          return {
            headingFont: p.heading,
            bodyFont: p.body,
            base: p.base,
            ratio: p.ratio,
            past: pushPast(s),
            future: [],
          };
        }),

      // Used for share-link (?s=) loads — replaces state without history.
      hydrate: (partial) => set({ ...partial, past: [], future: [] }),

      reset: () =>
        set((s) => {
          lastEditKey = null;
          return { ...DEFAULT, past: pushPast(s), future: [] };
        }),

      undo: () =>
        set((s) => {
          const prev = s.past[s.past.length - 1];
          if (!prev) return {};
          lastEditKey = null;
          return {
            ...prev,
            past: s.past.slice(0, -1),
            future: [snapshot(s), ...s.future].slice(0, HISTORY_LIMIT),
          };
        }),

      redo: () =>
        set((s) => {
          const next = s.future[0];
          if (!next) return {};
          lastEditKey = null;
          return {
            ...next,
            past: pushPast(s),
            future: s.future.slice(1),
          };
        }),
    }),
    {
      name: "typesmith-project",
      version: 1,
      partialize: (s) => snapshot(s),
      // Rehydration is triggered manually in the editor so a ?s= share link
      // can take priority over the saved session (see app/editor/page.tsx).
      skipHydration: true,
    }
  )
);

export { DEFAULT as DEFAULT_PROJECT };
