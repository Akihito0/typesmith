"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "@/backend/project/store";
import { generate, FORMAT_LABELS, type ExportFormat } from "@/backend/export/code";
import { Button } from "@/frontend/ui";
import { useFocusTrap } from "@/frontend/ui/useFocusTrap";

const EXTENSIONS: Record<ExportFormat, string> = {
  css: "css",
  fluid: "css",
  scss: "scss",
  tailwind: "js",
  json: "json",
  tokens: "tokens.json",
};

export function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = useProject();
  const [format, setFormat] = useState<ExportFormat>("css");
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const code = useMemo(
    () => generate(p, format),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      p.base,
      p.ratio,
      p.stepOverrides,
      p.headingFont,
      p.bodyFont,
      p.foreground,
      p.background,
      p.accent,
      p.mutedColor,
      p.surfaceColor,
      p.projectName,
      p.author,
      p.unit,
      p.headingLeading,
      p.bodyLeading,
      p.headingTracking,
      p.headingWeight,
      p.bodyWeight,
      p.fluidMinVw,
      p.fluidMaxVw,
      p.fluidMinScale,
      format,
      open,
    ]
  );

  if (!open) return null;

  const copy = async () => {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${p.projectName.toLowerCase().replace(/\s+/g, "-")}-tokens.${EXTENSIONS[format]}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Export design tokens"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-xl bg-panel p-5 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-ink">Export design tokens</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex gap-1 rounded-md border border-line bg-surface p-0.5">
          {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 rounded px-2 py-1.5 text-xs font-medium ${
                format === f ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>

        {format === "fluid" && (
          <div className="mt-3 flex items-end gap-3 rounded-md bg-surface px-3 py-2.5">
            <label className="block">
              <span className="text-[10px] font-medium text-muted">Min viewport</span>
              <input
                type="number"
                min={280}
                max={800}
                value={p.fluidMinVw}
                onChange={(e) => p.set("fluidMinVw", Number(e.target.value) || 360)}
                className="mt-0.5 h-7 w-20 rounded border border-line px-1.5 text-xs"
                aria-label="Fluid minimum viewport in px"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-medium text-muted">Max viewport</span>
              <input
                type="number"
                min={800}
                max={2400}
                value={p.fluidMaxVw}
                onChange={(e) => p.set("fluidMaxVw", Number(e.target.value) || 1280)}
                className="mt-0.5 h-7 w-20 rounded border border-line px-1.5 text-xs"
                aria-label="Fluid maximum viewport in px"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-medium text-muted">Mobile scale</span>
              <input
                type="number"
                step={0.025}
                min={0.5}
                max={1}
                value={p.fluidMinScale}
                onChange={(e) => p.set("fluidMinScale", Number(e.target.value) || 0.875)}
                className="mt-0.5 h-7 w-20 rounded border border-line px-1.5 text-xs"
                aria-label="Fluid mobile base scale factor"
              />
            </label>
          </div>
        )}

        <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-canvas-code p-4 font-mono text-[11px] leading-relaxed text-gray-300 ts-scroll">
          {code}
        </pre>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" className="h-9" onClick={download}>
            Download file
          </Button>
          <Button className="h-9" onClick={copy}>
            {copied ? "Copied" : "Copy to clipboard"}
          </Button>
        </div>
      </div>
    </div>
  );
}
