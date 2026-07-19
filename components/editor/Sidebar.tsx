"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject, pickProjectState, DEFAULT_PROJECT } from "@/lib/store";
import { useWorkspace, newProjectId } from "@/lib/workspace";
import { Button, Chevron } from "@/components/ui";
import type { ToolId } from "./types";

const DOCS_URL = "https://github.com/Akihito0/typesmith#readme";

// Left rail from the screenshots: Project Workspace header, DESIGN SYSTEM
// group (Style Guide / Type Scale / Colors), LAYOUTS group (Website / Mobile
// App, plus PRO-locked layouts from the roadmap), New Asset button.
const DESIGN_SYSTEM: { id: ToolId; label: string }[] = [
  { id: "style-guide", label: "Style Guide" },
  { id: "type-scale", label: "Type Scale" },
  { id: "colors", label: "Colors" },
];

// "pro" items are badged but fully usable — free during the beta.
const LAYOUTS: { id: ToolId; label: string; pro?: boolean }[] = [
  { id: "website", label: "Website" },
  { id: "mobile", label: "Mobile App" },
  { id: "slides", label: "Slides", pro: true },
  { id: "social", label: "Social", pro: true },
  { id: "newsletter", label: "Newsletter", pro: true },
];

export function Sidebar({
  active,
  onSelect,
}: {
  active: ToolId;
  onSelect: (t: ToolId) => void;
}) {
  const router = useRouter();
  const hydrate = useProject((s) => s.hydrate);
  const projectName = useProject((s) => s.projectName);

  const activeId = useWorkspace((s) => s.activeId);
  const projects = useWorkspace((s) => s.projects);

  const [wsOpen, setWsOpen] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) setWsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setWsOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [wsOpen]);

  const saveCurrent = () => {
    const ws = useWorkspace.getState();
    if (ws.activeId) ws.upsert(ws.activeId, pickProjectState(useProject.getState()));
  };

  const afterProjectChange = () => {
    onSelect("type-scale");
    // Drop any ?s= share param so the fresh state isn't re-hydrated over.
    router.replace("/editor");
  };

  const switchTo = (id: string) => {
    setWsOpen(false);
    if (id === activeId) return;
    saveCurrent();
    const entry = useWorkspace.getState().projects.find((e) => e.id === id);
    if (!entry) return;
    useWorkspace.getState().setActive(id);
    hydrate(entry.state);
    afterProjectChange();
  };

  // Creates a fresh project. Nothing is lost — the current one is saved to
  // the workspace first — so no confirmation is needed.
  const newAsset = () => {
    saveCurrent();
    const ws = useWorkspace.getState();
    const id = newProjectId();
    ws.setActive(id);
    hydrate(DEFAULT_PROJECT);
    ws.upsert(id, DEFAULT_PROJECT);
    afterProjectChange();
  };

  const deleteProject = (id: string) => {
    const ws = useWorkspace.getState();
    const entry = ws.projects.find((e) => e.id === id);
    const name = id === activeId ? projectName : entry?.state.projectName ?? "this project";
    if (!window.confirm(`Delete “${name}”? This can't be undone.`)) return;
    ws.remove(id);
    if (id !== activeId) return;
    const rest = useWorkspace.getState().projects;
    if (rest.length > 0) {
      ws.setActive(rest[0].id);
      hydrate(rest[0].state);
    } else {
      const nid = newProjectId();
      ws.setActive(nid);
      hydrate(DEFAULT_PROJECT);
      ws.upsert(nid, DEFAULT_PROJECT);
    }
    afterProjectChange();
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-sidebar print:hidden">
      {/* workspace switcher */}
      <div ref={wsRef} className="relative border-b border-line">
        <button
          onClick={() => setWsOpen((o) => !o)}
          aria-label="Switch project"
          aria-expanded={wsOpen}
          className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left hover:bg-surface"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-600 text-xs font-bold text-white">
            TS
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-ink">{projectName}</span>
            <span className="block text-[11px] text-muted">
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </span>
          </span>
          <Chevron className="shrink-0 text-muted" />
        </button>

        {wsOpen && (
          <div className="absolute left-2 right-2 top-full z-40 mt-1 rounded-lg border border-line bg-white p-1.5 shadow-modal">
            {[...projects]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((entry) => (
                <div
                  key={entry.id}
                  className={`group flex items-center rounded-md ${
                    entry.id === activeId ? "bg-brand-50" : "hover:bg-surface"
                  }`}
                >
                  <button
                    onClick={() => switchTo(entry.id)}
                    className="min-w-0 flex-1 px-2.5 py-1.5 text-left"
                  >
                    <span
                      className={`block truncate text-[13px] ${
                        entry.id === activeId ? "font-medium text-brand-700" : "text-ink"
                      }`}
                    >
                      {entry.id === activeId ? projectName : entry.state.projectName}
                    </span>
                    <span className="block text-[10px] text-muted">
                      {new Date(entry.updatedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteProject(entry.id)}
                    aria-label={`Delete ${entry.state.projectName}`}
                    title="Delete project"
                    className="mr-1.5 hidden rounded p-1 text-muted hover:bg-white hover:text-fail group-hover:block"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 ts-scroll">
        <Group label="Design System">
          {DESIGN_SYSTEM.map((item) => (
            <Item
              key={item.id}
              label={item.label}
              active={active === item.id}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </Group>

        <Group label="Layouts">
          {LAYOUTS.map((item) => (
            <Item
              key={item.id}
              label={item.label}
              pro={item.pro}
              active={active === item.id}
              onClick={() => onSelect(item.id)}
            />
          ))}
        </Group>
      </nav>

      <div className="border-t border-line p-3">
        <Button variant="dark" className="w-full h-8 text-xs" onClick={newAsset}>+ New Asset</Button>
        <div className="mt-2.5 flex items-center justify-between px-1 text-[11px] text-muted">
          <a href={DOCS_URL} target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
            Docs
          </a>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" /> Status: Operational
          </span>
        </div>
      </div>
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Item({
  label,
  active,
  pro,
  onClick,
}: {
  label: string;
  active?: boolean;
  pro?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[13px] transition-colors ${
        active ? "bg-brand-50 font-medium text-brand-700" : "text-ink hover:bg-surface"
      }`}
    >
      <span>{label}</span>
      {pro && (
        <span className="rounded border border-line bg-white px-1.5 py-px text-[9px] font-semibold uppercase text-muted">
          Pro
        </span>
      )}
    </button>
  );
}
