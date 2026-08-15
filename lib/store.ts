"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Unit, StepOverrides } from "./scale";
import { PRESETS, type Preset } from "./presets";
import { DEFAULT_PLAYGROUND, normalizePlayground, type PlaygroundDocument } from "./playground";

// The whole project is one state object. Type scale, fonts, colors, mockups,
// the playground, and exports all read from here — no per-tool re-entry. This
// is the shape that gets encoded into a shareable URL.
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
  /** Per-step px nudges on top of the modular formula (step index → px). */
  stepOverrides: StepOverrides;

  // Leading & tracking (heading line-height is unitless, tracking is em)
  headingLeading: number;
  bodyLeading: number;
  headingTracking: number;

  // Weights
  headingWeight: number;
  bodyWeight: number;

  // Fluid (clamp) scale bounds: sizes interpolate between these viewports,
  // with the mobile end compressed to minScale × base.
  fluidMinVw: number;
  fluidMaxVw: number;
  fluidMinScale: number;

  // Color
  foreground: string; // hex
  background: string; // hex
  accent: string; // hex
  mutedColor: string; // secondary text, hex
  surfaceColor: string; // alternate surface, hex

  // Preview copy used by both mockups
  headline: string;
  subhead: string;
  body: string;

  // Freeform type canvas
  playground: PlaygroundDocument;

  // UI mode
  mode: "edit" | "view";
}

export interface ProjectActions {
  set: <K extends keyof ProjectState>(key: K, value: ProjectState[K]) => void;
  /** Commit a playground change; coalescing is useful for inspector input bursts. */
  setPlayground: (document: PlaygroundDocument, coalesce?: boolean) => void;
  /** Set (px) or clear (null) a per-step size override. */
  setStepOverride: (step: number, px: number | null) => void;
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
  stepOverrides: {},

  headingLeading: 1.1,
  bodyLeading: 1.6,
  headingTracking: -0.02,

  headingWeight: 700,
  bodyWeight: 400,

  fluidMinVw: 360,
  fluidMaxVw: 1280,
  fluidMinScale: 0.875,

  foreground: "#2563eb",
  background: "#ffffff",
  accent: "#2563eb",
  mutedColor: "#6b7280",
  surfaceColor: "#f8f9fb",

  headline: "Engineering precision for modern typography.",
  subhead: "Architecting Digital Precision",
  body: "The ultimate tool for developers and designers to craft perfectly scaled, accessible, and performant type systems for any digital interface.",

  playground: DEFAULT_PLAYGROUND,

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

/** Fill newly-added fields and sanitize the nested canvas when loading old or
 * imported project data. */
export function normalizeProjectState(partial: Partial<ProjectState>): ProjectState {
  return {
    ...DEFAULT,
    ...partial,
    playground: normalizePlayground(partial.playground),
  };
}

/** Public snapshot of just the project fields (no history/actions) — used by
 * the workspace registry (lib/workspace.ts). */
export function pickProjectState(s: ProjectState): ProjectState {
  return snapshot(s);
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

      setPlayground: (playground, allowCoalesce = false) =>
        set((s) => {
          const now = Date.now();
          const coalesce =
            allowCoalesce && lastEditKey === "playground" && now - lastEditAt < COALESCE_MS;
          lastEditKey = "playground";
          lastEditAt = now;
          return {
            playground,
            future: [],
            ...(coalesce ? {} : { past: pushPast(s) }),
          };
        }),

      setStepOverride: (step, px) =>
        set((s) => {
          lastEditKey = null;
          const stepOverrides = { ...s.stepOverrides };
          if (px === null) delete stepOverrides[step];
          else stepOverrides[step] = px;
          return { stepOverrides, past: pushPast(s), future: [] };
        }),

      applyPreset: (p) =>
        set((s) => {
          lastEditKey = null;
          return {
            headingFont: p.heading,
            bodyFont: p.body,
            base: p.base,
            ratio: p.ratio,
            stepOverrides: {},
            past: pushPast(s),
            future: [],
          };
        }),

      // Used for share-link (?s=), workspace, and backup loads. Normalize so
      // projects created before the playground was introduced remain valid.
      hydrate: (partial) => set({ ...normalizeProjectState(partial), past: [], future: [] }),

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
      version: 2,
      partialize: (s) => snapshot(s),
      migrate: (persisted) => normalizeProjectState((persisted ?? {}) as Partial<ProjectState>),
      merge: (persisted, current) => ({
        ...current,
        ...normalizeProjectState((persisted ?? {}) as Partial<ProjectState>),
      }),
      // Rehydration is triggered manually in the editor so a ?s= share link
      // can take priority over the saved session (see app/editor/page.tsx).
      skipHydration: true,
    }
  )
);

export { DEFAULT as DEFAULT_PROJECT };
