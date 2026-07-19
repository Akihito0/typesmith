"use client";

import Link from "next/link";

const LINKS = [
  { label: "Specimen", href: "#specimen" },
  { label: "Instruments", href: "#instruments" },
  { label: "Editions", href: "#editions" },
];

// Deterministic dark nav: solid editor-canvas background at all times (no
// translucency/backdrop-blur, which composited unpredictably over the dark
// hero). Dark bookends the dark hero + dark colophon and reads cleanly over
// the light middle sections.
export function Nav({ onLogin }: { onLogin: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-canvas-line bg-canvas">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-10">
        <a href="#specimen" className="flex items-center gap-2 text-white">
          <span aria-hidden="true" className="h-[6px] w-[6px] bg-brand-500" />
          <span className="font-display text-xl font-semibold leading-none">TypeSmith</span>
        </a>

        <div className="hidden items-center gap-8 font-mono text-[11px] uppercase tracking-[0.15em] text-gray-400 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="group inline-flex items-center hover:text-white">
              <span
                aria-hidden="true"
                className="inline-block w-0 overflow-hidden text-brand-500 opacity-0 transition-all duration-200 group-hover:mr-1 group-hover:w-[0.6em] group-hover:opacity-100"
              >
                /
              </span>
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onLogin}
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-gray-400 transition-colors hover:text-white"
          >
            Log in
          </button>
          <Link
            href="/editor"
            className="chamfer-sm group inline-flex items-center gap-2 bg-white px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-ink transition-colors hover:bg-brand-600 hover:text-white sm:px-4"
          >
            <span className="sm:hidden">Editor</span>
            <span className="hidden sm:inline">Open Editor</span>
            <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1">
              -&gt;
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
