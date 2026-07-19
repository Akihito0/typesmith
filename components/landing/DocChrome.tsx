"use client";

import { useState, type ReactNode } from "react";
import { Nav } from "./Nav";
import { Colophon } from "./Sections";
import { AuthModal } from "./AuthModal";
import { SmoothScroll } from "./SmoothScroll";

// Shared chrome for the secondary "Elsewhere" pages (changelog, privacy,
// terms). Same nav + colophon bookends as the landing so the pages read as
// one system, on the dark canvas that the hero and footer already own. The
// nav's in-page links resolve to /#section, so from here they route home and
// land on the right section (SmoothScroll animates once there).
export function DocChrome({ children }: { children: ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <main className="min-h-screen bg-canvas text-white">
      <SmoothScroll />
      <Nav onLogin={() => setAuthOpen(true)} />
      {children}
      <Colophon />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}

// Page masthead: a tiny caps label, a masked-reveal display title, and an
// optional meta line — the marginalia + one confident headline, per the
// house language.
export function DocHeader({
  label,
  title,
  meta,
  lede,
}: {
  label: string;
  title: string;
  meta?: string;
  lede?: string;
}) {
  return (
    <header className="mx-auto max-w-3xl px-6 pb-12 pt-20 md:px-10 md:pb-16 md:pt-28">
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-500">
        <span aria-hidden="true" className="mr-1.5">
          &#9632;
        </span>
        {label}
      </p>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-white md:text-6xl">
        <span className="reveal-mask">
          <span className="reveal-line" style={{ animationDelay: "0.05s" }}>
            {title}
          </span>
        </span>
      </h1>
      {lede && (
        <p className="hero-item mt-6 max-w-xl text-[15px] leading-relaxed text-gray-400">{lede}</p>
      )}
      {meta && (
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-gray-500">
          {meta}
        </p>
      )}
    </header>
  );
}

// A numbered content block: index marginalia + heading on the left rail,
// prose on the right, separated from the previous block by a hairline. Mirrors
// the instrument rows on the landing page.
export function DocSection({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-canvas-line py-10 md:py-12">
      <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-[220px_1fr]">
        <div className="md:sticky md:top-24 md:self-start">
          <span className="font-mono text-[11px] tracking-[0.15em] text-brand-500">{index}</span>
          <h2 className="mt-2 font-display text-xl font-medium text-white md:text-2xl">{title}</h2>
        </div>
        <div className="max-w-xl space-y-4 text-[14px] leading-relaxed text-gray-400 [&_a:hover]:decoration-brand-500 [&_a]:text-brand-100 [&_a]:underline [&_a]:decoration-canvas-line [&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-gray-200 [&_strong]:font-medium [&_strong]:text-gray-200">
          {children}
        </div>
      </div>
    </section>
  );
}

// Wrapper that supplies the shared max-width + hairline rhythm for a page's
// stacked DocSections.
export function DocBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-6 pb-24 md:px-10">{children}</div>;
}
