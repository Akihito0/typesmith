"use client";

import { useState } from "react";
import Link from "next/link";
import { useProject } from "@/lib/store";
import { FONTS } from "@/lib/fonts";
import { PRESETS, presetByName, randomPreset } from "@/lib/presets";
import { buildShareUrl } from "@/lib/share";
import { Button, Logo, Redo, Segmented, Select, Shuffle, Undo } from "@/components/ui";

// Top toolbar from the screenshots: Edit|View toggle, TypeSmith logo, preset
// dropdown + shuffle, HEADING/BODY font pickers, SIZE + RATIO fields, then
// Share / Export / Upgrade to Pro on the right.
export function Toolbar({ onExport }: { onExport: () => void }) {
  const project = useProject();
  const [presetName, setPresetName] = useState(PRESETS[0].name);
  const [copied, setCopied] = useState(false);

  const applyPresetByName = (name: string) => {
    setPresetName(name);
    const p = presetByName(name);
    if (p) project.applyPreset(p);
  };

  const shuffle = () => {
    const p = randomPreset(presetName);
    setPresetName(p.name);
    project.applyPreset(p);
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
    <div className="flex h-14 items-center gap-3 border-b border-line bg-white px-4">
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
          value={presetName}
          onChange={(e) => applyPresetByName(e.target.value)}
          className="w-40"
          aria-label="Pairing preset"
        >
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

      {/* Fonts */}
      <div className="hidden items-center gap-1.5 lg:flex">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          Heading
        </span>
        <Select
          value={project.headingFont}
          onChange={(e) => project.set("headingFont", e.target.value)}
          className="w-36"
          aria-label="Heading font"
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </Select>
        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Body
        </span>
        <Select
          value={project.bodyFont}
          onChange={(e) => project.set("bodyFont", e.target.value)}
          className="w-36"
          aria-label="Body font"
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </Select>
      </div>

      {/* Size / ratio */}
      <div className="hidden items-center gap-1.5 xl:flex">
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
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" className="h-8 px-3 text-xs" onClick={share}>
          {copied ? "Link copied" : "Share"}
        </Button>
        <Button variant="outline" className="h-8 px-3 text-xs" onClick={onExport}>
          Export
        </Button>
        <Button className="h-8 px-3 text-xs">Upgrade to Pro</Button>
      </div>
    </div>
  );
}
