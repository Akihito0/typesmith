"use client";

import { useEffect, useRef, useState } from "react";
import { FONTS, fontById } from "@/lib/fonts";
import { useCustomFonts, ACCEPTED_FONT_TYPES } from "@/lib/customFonts";
import { GOOGLE_FONTS, gfId, ensureGoogleFont } from "@/lib/googleFonts";
import { Chevron } from "@/components/ui";

// Searchable font picker: curated faces, session uploads, and the Google
// Fonts catalog (loaded on demand). Replaces the plain <select>s in the
// toolbar.

const CURATED_NAMES = new Set(FONTS.map((f) => f.name));

export function FontPicker({
  value,
  onChange,
  label,
  className = "",
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const customFonts = useCustomFonts((s) => s.fonts);
  const addFont = useCustomFonts((s) => s.add);
  const current = fontById(value);

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

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQ("");
  };

  const onFontFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const def = await addFont(file);
    if (def) pick(def.id);
    else window.alert("Couldn't load that font file. Try a .woff, .woff2, .ttf, or .otf.");
  };

  const ql = q.trim().toLowerCase();
  const curated = FONTS.filter((f) => f.name.toLowerCase().includes(ql));
  const uploaded = customFonts.filter((f) => f.name.toLowerCase().includes(ql));
  const google = GOOGLE_FONTS.filter(
    (f) => f.name.toLowerCase().includes(ql) && !CURATED_NAMES.has(f.name)
  ).slice(0, 40);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-expanded={open}
        className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-line bg-white px-3 text-sm text-ink hover:bg-surface"
      >
        <span className="truncate">{current.name}</span>
        <Chevron className="shrink-0 text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-40 w-64 rounded-lg border border-line bg-white shadow-modal">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search fonts…"
              className="h-8 w-full rounded-md border border-line px-2.5 text-sm outline-none focus:border-brand-600"
              aria-label={`Search ${label.toLowerCase()}`}
            />
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 ts-scroll">
            {curated.length > 0 && <GroupLabel>Curated</GroupLabel>}
            {curated.map((f) => (
              <Option key={f.id} active={value === f.id} onClick={() => pick(f.id)} tag={f.category}>
                {f.name}
              </Option>
            ))}

            {uploaded.length > 0 && <GroupLabel>Uploaded (this session)</GroupLabel>}
            {uploaded.map((f) => (
              <Option key={f.id} active={value === f.id} onClick={() => pick(f.id)} tag="upload">
                {f.name}
              </Option>
            ))}

            {google.length > 0 && <GroupLabel>Google Fonts</GroupLabel>}
            {google.map((f) => {
              const id = gfId(f.name);
              return (
                <Option
                  key={id}
                  active={value === id}
                  onClick={() => {
                    ensureGoogleFont(f.name);
                    pick(id);
                  }}
                  tag={f.category}
                >
                  {f.name}
                </Option>
              );
            })}

            {curated.length + uploaded.length + google.length === 0 && (
              <p className="px-2.5 py-3 text-center text-xs text-muted">No fonts match “{q}”.</p>
            )}
          </div>

          <div className="border-t border-line p-1.5">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-brand-600 hover:bg-surface"
            >
              + Upload font…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_FONT_TYPES}
              onChange={onFontFile}
              className="hidden"
              aria-label="Upload font file"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
      {children}
    </p>
  );
}

function Option({
  children,
  active,
  onClick,
  tag,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tag?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] ${
        active ? "bg-brand-50 font-medium text-brand-700" : "text-ink hover:bg-surface"
      }`}
    >
      <span className="truncate">{children}</span>
      {tag && <span className="ml-2 shrink-0 text-[9px] uppercase text-muted/70">{tag}</span>}
    </button>
  );
}
