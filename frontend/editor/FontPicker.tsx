"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { FONTS, fontById } from "@/backend/fonts/catalog";
import { useCustomFonts, ACCEPTED_FONT_TYPES } from "@/backend/fonts/custom";
import { GOOGLE_FONTS, gfId, gfFallback, ensureGoogleFont } from "@/backend/fonts/google";
import { Chevron } from "@/frontend/ui";

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
        className="flex h-8 w-full items-center justify-between gap-1 rounded-md border border-line bg-panel px-3 text-sm text-ink hover:bg-surface"
      >
        <span className="truncate">{current.name}</span>
        <Chevron className="shrink-0 text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-40 w-64 rounded-lg border border-line bg-panel shadow-modal">
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
              <Option
                key={f.id}
                active={value === f.id}
                onClick={() => pick(f.id)}
                tag={f.category}
                stack={f.stack}
              >
                {f.name}
              </Option>
            ))}

            {uploaded.length > 0 && <GroupLabel>Uploaded (this session)</GroupLabel>}
            {uploaded.map((f) => (
              <Option
                key={f.id}
                active={value === f.id}
                onClick={() => pick(f.id)}
                tag="upload"
                stack={f.stack}
              >
                {f.name}
              </Option>
            ))}

            {google.length > 0 && <GroupLabel>Google Fonts</GroupLabel>}
            {google.map((f) => (
              <GoogleOption
                key={f.name}
                name={f.name}
                category={f.category}
                active={value === gfId(f.name)}
                onClick={() => {
                  ensureGoogleFont(f.name);
                  pick(gfId(f.name));
                }}
              />
            ))}

            {curated.length + uploaded.length + google.length === 0 && (
              <p className="px-2.5 py-3 text-center text-xs text-muted">No fonts match “{q}”.</p>
            )}
          </div>

          <div className="border-t border-line p-1.5">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-accent hover:bg-surface"
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

const Option = forwardRef<
  HTMLButtonElement,
  {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
    tag?: string;
    /** css stack the option label renders in — the preview IS the font */
    stack?: string;
  }
>(function Option({ children, active, onClick, tag, stack }, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[14px] ${
        active ? "bg-brand-50 font-medium text-accent" : "text-ink hover:bg-surface"
      }`}
    >
      <span className="truncate" style={stack ? { fontFamily: stack } : undefined}>
        {children}
      </span>
      {tag && <span className="ml-2 shrink-0 text-[9px] uppercase text-muted/70">{tag}</span>}
    </button>
  );
});

// Google option: loads its stylesheet only once it scrolls into view, then
// renders its own name in its own face.
function GoogleOption({
  name,
  category,
  active,
  onClick,
}: {
  name: string;
  category: string;
  active: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        ensureGoogleFont(name);
        setSeen(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [name]);

  return (
    <Option
      ref={ref}
      active={active}
      onClick={onClick}
      tag={category}
      stack={seen ? `'${name}', ${gfFallback(name)}` : undefined}
    >
      {name}
    </Option>
  );
}
