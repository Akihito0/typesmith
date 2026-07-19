import type { Metadata } from "next";
import { DocChrome, DocHeader } from "@/components/landing/DocChrome";

export const metadata: Metadata = {
  title: "Changelog — TypeSmith",
  description: "What has shipped in TypeSmith, newest first.",
};

type Change = { tag: "Added" | "Changed" | "Fixed"; text: string };
type Release = { version: string; date: string; note?: string; changes: Change[] };

// Newest first. Versions track package.json; the note flags milestone builds.
const RELEASES: Release[] = [
  {
    version: "0.9.0",
    date: "19 Jul 2026",
    note: "Beta",
    changes: [
      {
        tag: "Changed",
        text: "Landing rebuilt around a live editor preview; section numbering retired for a cleaner specimen sheet.",
      },
      {
        tag: "Changed",
        text: "Navigation now scrolls with an eased motion instead of a hard jump, and always clears the sticky header.",
      },
      {
        tag: "Added",
        text: "Elsewhere pages — this changelog, plus privacy and terms — in the same specimen-sheet language.",
      },
      {
        tag: "Added",
        text: "Multi-project workspace: keep several type systems side by side and switch between them.",
      },
      {
        tag: "Added",
        text: "Per-step size overrides and independent heading / body font weights.",
      },
    ],
  },
  {
    version: "0.8.0",
    date: "12 Jul 2026",
    changes: [
      {
        tag: "Added",
        text: "APCA contrast alongside WCAG 2.1, with color-vision-deficiency simulation.",
      },
      {
        tag: "Added",
        text: "Contrast matrix — every text color graded against every surface at once.",
      },
      { tag: "Added", text: "Fluid clamp(), Tailwind, SCSS, and W3C design-token export formats." },
    ],
  },
  {
    version: "0.7.0",
    date: "5 Jul 2026",
    changes: [
      {
        tag: "Added",
        text: "Slides, Social, and Newsletter layouts, with a fullscreen present mode.",
      },
      { tag: "Added", text: "Google Fonts catalog and session-only custom font upload." },
    ],
  },
  {
    version: "0.6.0",
    date: "28 Jun 2026",
    changes: [
      { tag: "Added", text: "Share links compressed with native deflate for shorter URLs." },
      { tag: "Added", text: "Downloadable style-guide PDF." },
      { tag: "Fixed", text: "Focus traps on every modal, and a proper mobile sidebar drawer." },
    ],
  },
  {
    version: "0.5.0",
    date: "20 Jun 2026",
    note: "First beta",
    changes: [
      { tag: "Added", text: "Type scale generator with modular ratios and a fluid preview." },
      { tag: "Added", text: "WCAG contrast checker." },
      { tag: "Added", text: "Live website and mobile mockups." },
      { tag: "Added", text: "CSS export." },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <DocChrome>
      <DocHeader
        label="Colophon / Changelog"
        title="Changelog"
        lede="Every release of TypeSmith, newest first. One base, one ratio — and a steady cadence of the tools built around them."
        meta={`Current — v${RELEASES[0].version}`}
      />
      <div className="mx-auto max-w-3xl px-6 pb-24 md:px-10">
        {RELEASES.map((r) => (
          <article
            key={r.version}
            className="grid grid-cols-1 gap-x-10 gap-y-6 border-t border-canvas-line py-10 md:grid-cols-[220px_1fr] md:py-12"
          >
            <div className="md:sticky md:top-24 md:self-start">
              <p className="font-display text-3xl font-medium tabular-nums text-white">
                {r.version}
              </p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-gray-500">
                {r.date}
              </p>
              {r.note && (
                <span className="chamfer-sm mt-3 inline-block border border-canvas-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-brand-100">
                  {r.note}
                </span>
              )}
            </div>

            <ul className="space-y-3.5">
              {r.changes.map((c, i) => (
                <li key={i} className="flex gap-4 text-[14px] leading-relaxed text-gray-400">
                  <span
                    className={`mt-[3px] w-16 shrink-0 font-mono text-[9px] uppercase tracking-[0.15em] ${
                      c.tag === "Added" ? "text-brand-500" : "text-gray-500"
                    }`}
                  >
                    {c.tag}
                  </span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </DocChrome>
  );
}
