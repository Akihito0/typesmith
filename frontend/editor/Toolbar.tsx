"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useProject } from "@/backend/project/store";
import { PRESETS, presetByName, randomPreset } from "@/backend/typography/presets";
import { buildShareUrl } from "@/backend/project/share";
import { isProUnlocked } from "@/backend/project/pro";
import { FontPicker } from "./FontPicker";
import { ShareModal } from "./ShareModal";
import { ThemeToggle } from "@/frontend/system/ThemeToggle";
import { Button, Check, Chevron, Logo, Redo, Select, Shuffle, Undo } from "@/frontend/ui";
import type { ToolId } from "./types";
import { LAYOUTS } from "./Sidebar";

/**
 * Derived, not stored: the preset select reads "Custom" the moment fonts, size,
 * or ratio drift from a preset (and undo/redo keeps that truthful). Shared by
 * the wide toolbar and the collapsed "Aa" menu.
 */
function activePresetFor(project: {
  headingFont: string;
  bodyFont: string;
  base: number;
  ratio: number;
}) {
  return PRESETS.find(
    (p) =>
      p.heading === project.headingFont &&
      p.body === project.bodyFont &&
      p.base === project.base &&
      p.ratio === project.ratio
  );
}

export function Toolbar({
  onExport,
  onUpgrade,
  onMenu,
  activeTool,
  onSelectTool,
}: {
  onExport: () => void;
  onUpgrade: () => void;
  onMenu?: () => void;
  activeTool: ToolId;
  onSelectTool: (t: ToolId) => void;
}) {
  const project = useProject();
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  const activePreset = activePresetFor(project);

  const applyPresetByName = (name: string) => {
    const p = presetByName(name);
    if (p) project.applyPreset(p);
  };

  const shuffle = () => {
    project.applyPreset(randomPreset(activePreset?.name));
  };

  // Copy first (that's the one-click case people want), then open the panel
  // with the QR for getting the project onto a phone.
  const share = async () => {
    const url = await buildShareUrl(project);
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (permissions) — the panel shows the URL to copy by
      // hand, so there's nothing to recover from here.
    }
    setShareOpen(true);
  };

  return (
    // Wraps to a second row below md. On a 390px phone this bar used to run
    // ~1044px wide, pushing Share / Export / Upgrade off-screen and scrolling
    // the whole page sideways — which mattered more once the QR flow started
    // sending people here from their phones.
    <div className="flex min-h-14 flex-wrap items-center gap-x-2 gap-y-2 border-b border-line bg-panel px-3 py-2 print:hidden md:h-14 md:flex-nowrap md:gap-x-3 md:px-4 md:py-0">
      {onMenu && (
        <button
          onClick={onMenu}
          aria-label="Open navigation"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-muted hover:bg-surface hover:text-ink md:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
      <Link href="/" className="shrink-0" aria-label="TypeSmith home">
        <Logo className="text-sm" wordClassName="hidden sm:inline" />
      </Link>

      <EditViewControl activeTool={activeTool} onSelectTool={onSelectTool} onUpgrade={onUpgrade} />

      <div className="mx-2 h-6 w-px bg-line" />

      {/* Undo / redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={project.undo}
          disabled={project.past.length === 0}
          title="Undo (⌘Z)"
          aria-label="Undo"
          className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <Undo />
        </button>
        <button
          onClick={project.redo}
          disabled={project.future.length === 0}
          title="Redo (⇧⌘Z)"
          aria-label="Redo"
          className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <Redo />
        </button>
      </div>

      <div className="mx-2 hidden h-6 w-px bg-line lg:block" />

      {/* Presets — below lg they live in the collapsed "Aa" type menu */}
      <div className="hidden items-center gap-1.5 lg:flex">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          Presets:
        </span>
        <Select
          value={activePreset?.name ?? "__custom"}
          onChange={(e) => applyPresetByName(e.target.value)}
          className="w-40"
          aria-label="Pairing preset"
        >
          {!activePreset && (
            <option value="__custom" disabled>
              Custom
            </option>
          )}
          {PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
        <button
          onClick={shuffle}
          title="Shuffle pairing"
          aria-label="Shuffle pairing"
          className="grid h-8 w-8 place-items-center rounded-md border border-line text-muted hover:bg-surface hover:text-ink"
        >
          <Shuffle />
        </button>
      </div>

      {/* Fonts (wide screens) */}
      <div className="hidden items-center gap-1.5 xl:flex">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          Heading
        </span>
        <FontPicker
          value={project.headingFont}
          onChange={(id) => project.set("headingFont", id)}
          label="Heading font"
          className="w-36"
        />
        <WeightSelect
          value={project.headingWeight}
          onChange={(w) => project.set("headingWeight", w)}
          label="Heading weight"
        />
        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Body
        </span>
        <FontPicker
          value={project.bodyFont}
          onChange={(id) => project.set("bodyFont", id)}
          label="Body font"
          className="w-36"
        />
        <WeightSelect
          value={project.bodyWeight}
          onChange={(w) => project.set("bodyWeight", w)}
          label="Body weight"
        />
      </div>

      {/* Size / ratio (wide screens) */}
      <div className="hidden items-center gap-1.5 xl:flex">
        <SizeRatioInputs />
      </div>

      {/* Collapsed type menu (narrow screens) */}
      <TypeMenu />

      <div className="ml-auto flex items-center gap-2">
        {/* Decorative confirmation — autosave still runs when it's hidden. */}
        <span className="hidden sm:inline-flex">
          <SaveIndicator />
        </span>
        <ThemeToggle className="grid h-8 w-8 place-items-center rounded-md border border-line text-muted hover:bg-surface hover:text-ink" />
        <Button variant="outline" className="h-8 px-3 text-xs" onClick={share}>
          {copied ? "Link copied" : "Share"}
        </Button>
        <Button variant="outline" className="h-8 px-3 text-xs" onClick={onExport}>
          Export
        </Button>
        {/* On a phone this lives in the sidebar drawer footer instead. */}
        <Button className="hidden h-8 px-3 text-xs sm:inline-flex" onClick={onUpgrade}>
          Upgrade to Pro
        </Button>
      </div>

      <ShareModal open={shareOpen} url={shareUrl} onClose={() => setShareOpen(false)} />
    </div>
  );
}

const WEIGHTS = [300, 400, 500, 600, 700, 800];

function WeightSelect({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (w: number) => void;
  label: string;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-[74px]"
      aria-label={label}
    >
      {WEIGHTS.map((w) => (
        <option key={w} value={w}>
          {w}
        </option>
      ))}
    </Select>
  );
}

// Base size + ratio number inputs, shared by the wide toolbar and the
// collapsed type menu.
function SizeRatioInputs() {
  const project = useProject();
  return (
    <>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Size</span>
      <input
        type="number"
        min={10}
        max={28}
        value={project.base}
        onChange={(e) => project.set("base", Number(e.target.value) || 16)}
        className="h-8 w-14 rounded-md border border-line px-2 text-sm"
        aria-label="Base size in px"
      />
      <span className="text-[10px] text-muted">px</span>
      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Ratio
      </span>
      <input
        type="number"
        step={0.001}
        min={1.02}
        max={2}
        value={project.ratio}
        onChange={(e) => project.set("ratio", Number(e.target.value) || 1.25)}
        className="h-8 w-[70px] rounded-md border border-line px-2 text-sm"
        aria-label="Scale ratio"
      />
    </>
  );
}

// On narrow screens the font/size/ratio controls collapse into this "Aa"
// popover so nothing becomes unreachable.
function TypeMenu() {
  const project = useProject();
  const activePreset = activePresetFor(project);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative xl:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Type settings"
        aria-expanded={open}
        title="Fonts, size & ratio"
        className="grid h-8 w-9 place-items-center rounded-md border border-line text-sm font-semibold text-muted hover:bg-surface hover:text-ink"
      >
        Aa
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-40 w-72 space-y-3 rounded-lg border border-line bg-panel p-3 shadow-modal">
          {/* Presets are only in the toolbar proper from lg up, so they need a
              home here or they're unreachable on a narrow screen. */}
          <div className="flex items-end gap-2 lg:hidden">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Preset
              </span>
              <Select
                value={activePreset?.name ?? "__custom"}
                onChange={(e) => {
                  const p = presetByName(e.target.value);
                  if (p) project.applyPreset(p);
                }}
                className="mt-1 w-full"
                aria-label="Pairing preset"
              >
                {!activePreset && (
                  <option value="__custom" disabled>
                    Custom
                  </option>
                )}
                {PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <button
              onClick={() => project.applyPreset(randomPreset(activePreset?.name))}
              title="Shuffle pairing"
              aria-label="Shuffle pairing"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-muted hover:bg-surface hover:text-ink"
            >
              <Shuffle />
            </button>
          </div>

          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Heading font
              </span>
              <FontPicker
                value={project.headingFont}
                onChange={(id) => project.set("headingFont", id)}
                label="Heading font"
                className="mt-1"
              />
            </div>
            <WeightSelect
              value={project.headingWeight}
              onChange={(w) => project.set("headingWeight", w)}
              label="Heading weight"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Body font
              </span>
              <FontPicker
                value={project.bodyFont}
                onChange={(id) => project.set("bodyFont", id)}
                label="Body font"
                className="mt-1"
              />
            </div>
            <WeightSelect
              value={project.bodyWeight}
              onChange={(w) => project.set("bodyWeight", w)}
              label="Body weight"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <SizeRatioInputs />
          </div>
        </div>
      )}
    </div>
  );
}

// Flashes "Saved" whenever the store changes (every change autosaves to
// localStorage). The initial rehydrate on mount is ignored.
function SaveIndicator() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mountedAt = Date.now();
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useProject.subscribe(() => {
      if (Date.now() - mountedAt < 1200) return;
      setVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setVisible(false), 1600);
    });
    return () => {
      unsub();
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <span
      aria-live="polite"
      className={`flex items-center gap-1 text-[11px] text-muted transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <Check className="text-pass" /> Saved
    </span>
  );
}

// Custom Edit / View control. "Edit" is a simple button that switches to edit
// mode. "View" has a chevron and opens a dropdown with layout options; selecting
// one switches to view mode and navigates to that layout panel.
function EditViewControl({
  activeTool,
  onSelectTool,
  onUpgrade,
}: {
  activeTool: ToolId;
  onSelectTool: (t: ToolId) => void;
  onUpgrade: () => void;
}) {
  const project = useProject();
  const mode = project.mode;
  const [viewOpen, setViewOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewOpen) return;
    const onDown = (e: MouseEvent) => {
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) setViewOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setViewOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [viewOpen]);

  return (
    <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
      <button
        type="button"
        onClick={() => {
          project.set("mode", "edit");
          setViewOpen(false);
        }}
        className={`rounded px-2.5 h-6 text-xs font-medium transition-colors ${
          mode === "edit" ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"
        }`}
      >
        Edit
      </button>

      <div ref={viewRef} className="relative">
        <button
          type="button"
          onClick={() => {
            const isLayout = LAYOUTS.some((l) => l.id === activeTool);
            if (mode === "view") {
              setViewOpen((o) => !o);
            } else {
              project.set("mode", "view");
              if (!isLayout) onSelectTool(LAYOUTS[0].id);
              setViewOpen(true);
            }
          }}
          aria-expanded={viewOpen}
          aria-haspopup="true"
          className={`inline-flex items-center gap-0.5 rounded px-2.5 h-6 text-xs font-medium transition-colors ${
            mode === "view" ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          View
          <Chevron
            className={`transition-transform duration-200 ${viewOpen ? "rotate-180" : ""}`}
          />
        </button>

        {viewOpen && (
          <div className="absolute left-0 top-8 z-40 w-44 rounded-lg border border-line bg-panel p-1 shadow-modal">
            <p className="mb-1 px-2 pt-1 text-[9px] font-semibold uppercase tracking-wider text-muted">
              Layouts
            </p>
            {LAYOUTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setViewOpen(false);
                  // Same gate as the sidebar: free during the beta, upgrade
                  // modal after it (see lib/pro.ts).
                  if (item.pro && !isProUnlocked()) {
                    onUpgrade();
                    return;
                  }
                  project.set("mode", "view");
                  onSelectTool(item.id);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                  activeTool === item.id && mode === "view"
                    ? "bg-brand-50 font-medium text-accent"
                    : "text-ink hover:bg-surface"
                }`}
              >
                <span>{item.label}</span>
                {item.pro && (
                  <span className="rounded border border-line bg-panel px-1.5 py-px text-[9px] font-semibold uppercase text-muted">
                    Pro
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
