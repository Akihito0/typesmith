"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useProject } from "@/lib/store";
import { PRESETS, presetByName, randomPreset } from "@/lib/presets";
import { buildShareUrl } from "@/lib/share";
import { FontPicker } from "./FontPicker";
import { Button, Check, Logo, Redo, Segmented, Select, Shuffle, Undo } from "@/components/ui";

// Top toolbar from the screenshots: Edit|View toggle, TypeSmith logo, preset
// dropdown + shuffle, HEADING/BODY font pickers, SIZE + RATIO fields, then
// Share / Export / Upgrade to Pro on the right. Below the xl breakpoint the
// font/size/ratio controls collapse into the "Aa" type menu.
export function Toolbar({ onExport, onUpgrade }: { onExport: () => void; onUpgrade: () => void }) {
  const project = useProject();
  const [copied, setCopied] = useState(false);

  // Derived, not stored: the select reads "Custom" the moment fonts/size/ratio
  // drift from a preset (and undo/redo keeps it truthful too).
  const activePreset = PRESETS.find(
    (p) =>
      p.heading === project.headingFont &&
      p.body === project.bodyFont &&
      p.base === project.base &&
      p.ratio === project.ratio
  );

  const applyPresetByName = (name: string) => {
    const p = presetByName(name);
    if (p) project.applyPreset(p);
  };

  const shuffle = () => {
    project.applyPreset(randomPreset(activePreset?.name));
  };

  const share = async () => {
    const url = buildShareUrl(project);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (permissions) — show the URL for manual copy.
      window.prompt("Copy your share link:", url);
    }
  };

  return (
    <div className="flex h-14 items-center gap-3 border-b border-line bg-white px-4 print:hidden">
      <Segmented
        size="sm"
        options={[
          { label: "Edit", value: "edit" as const },
          { label: "View", value: "view" as const },
        ]}
        value={project.mode}
        onChange={(m) => project.set("mode", m)}
      />

      <Link href="/" className="ml-1">
        <Logo className="text-sm" />
      </Link>

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

      <div className="mx-2 h-6 w-px bg-line" />

      {/* Presets */}
      <div className="flex items-center gap-1.5">
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
            <option key={p.name} value={p.name}>{p.name}</option>
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
        <SaveIndicator />
        <Button variant="outline" className="h-8 px-3 text-xs" onClick={share}>
          {copied ? "Link copied" : "Share"}
        </Button>
        <Button variant="outline" className="h-8 px-3 text-xs" onClick={onExport}>
          Export
        </Button>
        <Button className="h-8 px-3 text-xs" onClick={onUpgrade}>Upgrade to Pro</Button>
      </div>
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
        <option key={w} value={w}>{w}</option>
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
      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Ratio</span>
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
        <div className="absolute left-0 top-10 z-40 w-72 space-y-3 rounded-lg border border-line bg-white p-3 shadow-modal">
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
