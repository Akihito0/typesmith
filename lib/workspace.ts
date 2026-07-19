"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProjectState } from "./store";

// Multi-project workspace: a localStorage registry of project snapshots.
// The *active* project still lives in the main project store (and its own
// persist key); this registry holds a copy of every project so you can
// switch between them. The editor page keeps the active entry in sync
// (debounced) and the Sidebar renders the switcher.

export interface WorkspaceEntry {
  id: string;
  updatedAt: number;
  state: ProjectState;
}

interface WorkspaceStore {
  activeId: string | null;
  projects: WorkspaceEntry[];
  /** First-run: register the current project as the active entry. */
  init: (state: ProjectState) => void;
  /** Create or update an entry's snapshot. */
  upsert: (id: string, state: ProjectState) => void;
  setActive: (id: string) => void;
  remove: (id: string) => void;
  /** Merge backup entries in; on id collision the newer updatedAt wins. */
  importAll: (entries: WorkspaceEntry[]) => void;
}

export function newProjectId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useWorkspace = create<WorkspaceStore>()(
  persist(
    (set) => ({
      activeId: null,
      projects: [],

      init: (state) =>
        set((s) => {
          if (s.activeId) return {};
          const id = newProjectId();
          return { activeId: id, projects: [{ id, updatedAt: Date.now(), state }] };
        }),

      upsert: (id, state) =>
        set((s) => {
          const entry: WorkspaceEntry = { id, updatedAt: Date.now(), state };
          const i = s.projects.findIndex((p) => p.id === id);
          const projects = [...s.projects];
          if (i >= 0) projects[i] = entry;
          else projects.push(entry);
          return { projects };
        }),

      setActive: (id) => set({ activeId: id }),

      remove: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      importAll: (entries) =>
        set((s) => {
          const byId = new Map(s.projects.map((p) => [p.id, p]));
          for (const e of entries) {
            if (!e || typeof e.id !== "string" || typeof e.state !== "object" || e.state === null) continue;
            const existing = byId.get(e.id);
            const updatedAt = typeof e.updatedAt === "number" ? e.updatedAt : Date.now();
            if (!existing || updatedAt > existing.updatedAt) {
              byId.set(e.id, { id: e.id, updatedAt, state: e.state });
            }
          }
          return { projects: [...byId.values()] };
        }),
    }),
    {
      name: "typesmith-workspace",
      version: 1,
      // Manual rehydration alongside the project store (app/editor/page.tsx)
      // to avoid SSR hydration mismatches.
      skipHydration: true,
    }
  )
);
