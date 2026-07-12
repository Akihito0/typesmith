"use client";

import { create } from "zustand";
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

export const useProject = create<ProjectState & ProjectActions>((set) => ({
  ...DEFAULT,
  set: (key, value) => set({ [key]: value } as Partial<ProjectState>),
  applyPreset: (p) =>
    set({ headingFont: p.heading, bodyFont: p.body, base: p.base, ratio: p.ratio }),
  hydrate: (partial) => set(partial),
}));

export { DEFAULT as DEFAULT_PROJECT };
