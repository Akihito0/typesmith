"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { buildScale, RATIO_PRESETS } from "@/lib/scale";
import { fontById } from "@/lib/fonts";
import { evaluateContrast, formatRatio } from "@/lib/contrast";
import { useInView } from "./useReveal";

// ============================================================================
// 02 — MARQUEE STRIP. Full-bleed dark strip between the specimen and the
// instruments — it now visually merges with the dark hero above it instead
// of being the page's one inversion beat. Separator glyph is the nav's blue
// square (■) instead of the "+" from v3.
// ============================================================================
const MARQUEE_ITEMS = [
  "TYPE SCALES",
  "FONT PAIRING",
  "WCAG CONTRAST",
  "LIVE MOCKUPS",
  "CSS EXPORT",
  "NO SIGNUP",
  "SHAREABLE LINKS",
];

function MarqueeTrack({ hidden }: { hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {MARQUEE_ITEMS.map((item, i) => (
        <span
          key={i}
          className="flex items-center gap-8 px-4 font-mono text-[11px] uppercase tracking-[0.15em]"
        >
          {item}
          <span aria-hidden="true" className="text-[8px] text-brand-500">
            &#9632;
          </span>
        </span>
      ))}
    </div>
  );
}

export function Marquee() {
  return (
    <div className="overflow-hidden border-y border-canvas-line bg-canvas py-5 text-white">
      <div className="marquee-track">
        <MarqueeTrack />
        <MarqueeTrack hidden />
      </div>
    </div>
  );
}

// ============================================================================
// 03 — INSTRUMENTS. Light section, the interactive centerpiece. No cards:
// four full-width editorial rows, each now a WORKING TOOL instead of a
// static demo. The Scale tool's ratio is lifted here so the Mockups tool can
// share it — local useState only, no store changes.
// ============================================================================
const SCALE_CHIP_NAMES = ["Minor Third", "Major Third", "Golden Ratio"];
const SCALE_CHIPS = SCALE_CHIP_NAMES.map(
  (name) => RATIO_PRESETS.find((p) => p.name === name)!
);

function ScaleDemo({
  ratio,
  ratioName,
  onSelect,
}: {
  ratio: number;
  ratioName: string;
  onSelect: (name: string, value: number) => void;
}) {
  const ramp = buildScale(16, ratio).filter((s) => [0, 1, 2, 3].includes(s.step));
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {SCALE_CHIPS.map((chip) => {
          const active = chip.name === ratioName;
          return (
            <button
              key={chip.name}
              type="button"
              onClick={() => onSelect(chip.name, chip.value)}
              aria-pressed={active}
              className={`chamfer-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-line bg-white text-muted hover:border-brand-600 hover:text-ink"
              }`}
            >
              {chip.name}
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex items-end gap-5">
        {ramp.map((s) => (
          <div key={s.step} className="flex flex-col items-start gap-1.5">
            <span
              className="font-display leading-none text-ink transition-[font-size] duration-300 ease-out"
              style={{ fontSize: s.px }}
            >
              Aa
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted">
              {s.px}px
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PAIRINGS = [
  { headingId: "space-grotesk", bodyId: "geist-sans" },
  { headingId: "playfair", bodyId: "geist-sans" },
  { headingId: "sora", bodyId: "ibm-plex-mono" },
  { headingId: "geist-sans", bodyId: "lora" },
];

function PairingDemo() {
  const [index, setIndex] = useState(0);
  const [swapKey, setSwapKey] = useState(0);
  const pair = PAIRINGS[index];
  const heading = fontById(pair.headingId);
  const body = fontById(pair.bodyId);

  const shuffle = () => {
    setIndex((i) => (i + 1) % PAIRINGS.length);
    setSwapKey((k) => k + 1);
  };

  return (
    <div>
      <button
        type="button"
        onClick={shuffle}
        className="link-underline font-mono text-[11px] uppercase tracking-[0.15em] text-brand-600"
      >
        Shuffle -&gt;
      </button>
      <div key={swapKey} className="swap-in mt-6">
        <p className="text-[26px] leading-tight text-ink" style={{ fontFamily: heading.stack }}>
          Heading 24px
        </p>
        <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted" style={{ fontFamily: body.stack }}>
          The quick brown fox jumps over the lazy dog.
          <br />
          Proofed side by side before you commit.
        </p>
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.15em] text-muted">
          {heading.name} <span className="text-brand-600">+</span> {body.name}
        </p>
      </div>
    </div>
  );
}

const CONTRAST_SWATCHES = [
  { name: "Ink", hex: "#111827" },
  { name: "White", hex: "#ffffff" },
  { name: "Brand", hex: "#2563eb" },
  { name: "Muted", hex: "#6b7280" },
  { name: "Surface", hex: "#f8f9fb" },
];

function VerdictChip({ label, pass }: { label: string; pass: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.15em]">
      <span aria-hidden="true" className={`h-2 w-2 ${pass ? "bg-pass" : "bg-fail"}`} />
      {label} {pass ? "PASS ✓" : "FAIL ✕"}
    </span>
  );
}

function ContrastDemo() {
  const [fgIndex, setFgIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(1);
  const fg = CONTRAST_SWATCHES[fgIndex];
  const bg = CONTRAST_SWATCHES[bgIndex];
  const result = evaluateContrast(fg.hex, bg.hex);

  return (
    <div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setFgIndex((i) => (i + 1) % CONTRAST_SWATCHES.length)}
          className="chamfer-sm h-11 w-11 border border-line transition-transform hover:scale-105"
          style={{ backgroundColor: fg.hex }}
          aria-label={`Foreground swatch, currently ${fg.name}. Click to cycle.`}
        />
        <button
          type="button"
          onClick={() => setBgIndex((i) => (i + 1) % CONTRAST_SWATCHES.length)}
          className="chamfer-sm h-11 w-11 border border-line transition-transform hover:scale-105"
          style={{ backgroundColor: bg.hex }}
          aria-label={`Background swatch, currently ${bg.name}. Click to cycle.`}
        />
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
          <p>
            FG <span className="text-ink">{fg.name}</span> / BG <span className="text-ink">{bg.name}</span>
          </p>
          <p className="mt-1 text-ink">{result ? formatRatio(result.ratio) : "—"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {result && (
          <>
            <VerdictChip label="AA" pass={result.normalAA} />
            <VerdictChip label="AAA" pass={result.normalAAA} />
          </>
        )}
      </div>

      <div
        className="chamfer-sm mt-5 border border-line px-4 py-3 text-[14px]"
        style={{ color: fg.hex, backgroundColor: bg.hex }}
      >
        The quick brown fox
      </div>
    </div>
  );
}

function DeviceChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chamfer-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-line bg-white text-muted hover:border-brand-600 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function MockupsDemo({ ratio }: { ratio: number }) {
  const [device, setDevice] = useState<"web" | "mobile">("web");
  const bars = buildScale(16, ratio).filter((s) => [2, 0, -1].includes(s.step));

  return (
    <div>
      <div className="flex gap-2">
        <DeviceChip active={device === "web"} onClick={() => setDevice("web")}>
          Website
        </DeviceChip>
        <DeviceChip active={device === "mobile"} onClick={() => setDevice("mobile")}>
          Mobile
        </DeviceChip>
      </div>

      <div
        className={`mt-6 border border-line p-3 transition-all duration-300 ease-out ${
          device === "web" ? "w-full" : "mx-auto w-[140px]"
        }`}
      >
        <div className="w-1/3 border-b border-line pb-2" style={{ height: bars[0].px / 2.4 }} />
        <div
          className={`mt-3 grid gap-3 transition-all duration-300 ease-out ${
            device === "web" ? "grid-cols-3" : "grid-cols-1"
          }`}
        >
          {[0, 1, 2].map((col) => (
            <div key={col} className="space-y-2">
              <div className="border-b border-line" style={{ height: bars[1].px / 2.4 }} />
              <div className="w-4/5 border-b border-line" style={{ height: bars[2].px / 2.4 }} />
              <div className="w-3/5 border-b border-line" style={{ height: bars[2].px / 2.4 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InstrumentRow({
  index,
  title,
  body,
  demo,
}: {
  index: string;
  title: string;
  body: string;
  demo: ReactNode;
}) {
  const { ref, revealClass } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal-row group relative border-b border-line px-6 py-10 md:px-10 ${revealClass}`}
    >
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1fr_420px]">
        <div>
          <span className="font-mono text-[10px] tracking-[0.15em] text-brand-600">{index}</span>
          <h3
            className="mt-2 font-display font-medium text-ink"
            style={{ fontSize: "clamp(2.25rem, 3.5vw, 3.25rem)" }}
          >
            {title}
          </h3>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-muted">{body}</p>
        </div>
        <div className="chamfer-panel border border-line bg-surface p-6">{demo}</div>
      </div>
    </div>
  );
}

export function Instruments() {
  const [ratioName, setRatioName] = useState(SCALE_CHIPS[1].name);
  const [ratioValue, setRatioValue] = useState(SCALE_CHIPS[1].value);

  const instruments = [
    {
      index: "01",
      title: "Scale",
      body: "A base size and a ratio, expanded into a mathematically consistent hierarchy. Try a preset.",
      demo: (
        <ScaleDemo
          ratio={ratioValue}
          ratioName={ratioName}
          onSelect={(name, value) => {
            setRatioName(name);
            setRatioValue(value);
          }}
        />
      ),
    },
    {
      index: "02",
      title: "Pairing",
      body: "Heading and body voices proofed side by side before you commit. Shuffle to compare.",
      demo: <PairingDemo />,
    },
    {
      index: "03",
      title: "Contrast",
      body: "Every foreground/background pair checked against WCAG as you pick colors.",
      demo: <ContrastDemo />,
    },
    {
      index: "04",
      title: "Mockups",
      body: "See the scale set into real web and mobile layouts, live, using the ratio from Scale.",
      demo: <MockupsDemo ratio={ratioValue} />,
    },
  ];

  return (
    <section id="instruments" className="mx-auto max-w-6xl px-6 md:px-10">
      <h2 className="flex flex-wrap items-center gap-3 border-t border-line py-6 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
        <span className="text-brand-600">02</span>
        Instruments
        <span className="h-px flex-1 bg-line" />
        <span className="text-brand-600">Interactive &mdash; try them</span>
      </h2>
      <div>
        {instruments.map((it) => (
          <InstrumentRow key={it.index} {...it} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// 04 — EDITIONS. Two-column spec table, not pricing cards. Keeps both plans'
// behaviors: Community -> onStart opens AuthModal; Professional -> /editor.
// CTAs restyled to the chamfer language; no more thin-bordered rectangles.
// ============================================================================
const COMMUNITY_FEATURES = [
  "Core scale generator",
  "Contrast checker",
  "Unlimited mockup previews",
  "No signup needed",
];
const PRO_FEATURES = [
  "Everything in Community",
  "Extra font pairing presets",
  "Extra layout templates",
  "White-label export (CSS/Figma)",
];

export function Editions({ onStart }: { onStart: () => void }) {
  return (
    <section id="editions" className="mx-auto max-w-6xl px-6 md:px-10">
      <h2 className="flex items-center gap-3 border-t border-line py-6 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
        <span className="text-brand-600">03</span>
        Editions
        <span className="h-px flex-1 bg-line" />
      </h2>

      <div className="grid grid-cols-1 border-t border-line md:grid-cols-2">
        {/* Community */}
        <div className="border-b border-line py-10 md:border-b-0 md:border-r md:border-line md:pr-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
            Community
          </p>
          <p className="mt-4 font-display text-6xl font-semibold text-ink">Free</p>
          <ul className="mt-8 space-y-2.5">
            {COMMUNITY_FEATURES.map((f) => (
              <li key={f} className="font-mono text-[12px] text-ink/70">
                <span className="text-brand-600">+</span> {f}
              </li>
            ))}
          </ul>
          <button
            onClick={onStart}
            className="chamfer group mt-10 flex w-full items-center justify-center gap-2 bg-ink px-6 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-black"
          >
            Start Free
          </button>
        </div>

        {/* Professional */}
        <div className="py-10 md:pl-10">
          {/* Tag on its own line so it never clips at narrow widths */}
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-600">
            Recommended -&gt;
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
            Professional
          </p>
          <p className="mt-4 font-display text-6xl font-semibold text-ink">
            <span className="align-baseline text-[0.5em]">$</span>49{" "}
            <span className="font-mono text-sm font-normal text-muted">one-time</span>
          </p>
          <ul className="mt-8 space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="font-mono text-[12px] text-ink/70">
                <span className="text-brand-600">+</span> {f}
              </li>
            ))}
          </ul>
          <Link
            href="/editor"
            className="chamfer group mt-10 flex w-full items-center justify-center gap-2 bg-brand-600 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-brand-700"
          >
            Get Pro
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 05 — COLOPHON (footer, id="docs"). Dark again — symmetric with the hero.
// A designed section: sign-off line, hairline, mono columns, and a watermark
// word cropped flush to the very bottom edge of the page.
// ============================================================================
export function Colophon() {
  return (
    <footer id="docs" className="grid-blueprint-faint relative mt-6 overflow-hidden border-t border-canvas-line bg-canvas text-white">
      <div className="relative mx-auto max-w-6xl px-6 pt-16 md:px-10">
        <h2 className="font-display text-4xl font-medium text-white md:text-5xl">
          Tuned, not guessed.
        </h2>

        <div className="mt-10 h-px w-full bg-canvas-line" />

        <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="flex items-center gap-2 font-display text-xl font-semibold text-white">
              <span aria-hidden="true" className="h-[6px] w-[6px] bg-brand-500" />
              TypeSmith
            </p>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-gray-400">
              Type scales, pairing, and contrast &mdash; proofed, not guessed.
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500">Index</p>
            <ul className="mt-3 space-y-2 font-mono text-[12px] text-gray-400">
              <li>
                <a href="#specimen" className="link-underline hover:text-white">
                  Specimen
                </a>
              </li>
              <li>
                <a href="#instruments" className="link-underline hover:text-white">
                  Instruments
                </a>
              </li>
              <li>
                <a href="#editions" className="link-underline hover:text-white">
                  Editions
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500">
              Elsewhere
            </p>
            <ul className="mt-3 space-y-2 font-mono text-[12px] text-gray-400">
              <li>
                <a href="#" className="link-underline hover:text-white">
                  Changelog
                </a>
              </li>
              <li>
                <a href="#" className="link-underline hover:text-white">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="link-underline hover:text-white">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="link-underline hover:text-white">
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500">
              Colophon
            </p>
            <p className="mt-3 font-mono text-[10px] leading-relaxed text-gray-400">
              SET IN SPACE GROTESK &amp; GEIST MONO &mdash; PROOFED AT 1.250 / &copy; 2026 TYPESMITH
            </p>
          </div>
        </div>
      </div>

      {/* Watermark: single full-bleed line flush to the bottom edge. The
          negative bottom margin pulls the footer's edge up over the glyphs,
          so the section's overflow-hidden crops the bottom ~40% cleanly with
          no dead band above. White at ~4% opacity against the dark canvas. */}
      <div aria-hidden="true" className="pointer-events-none relative mt-16 select-none">
        <p
          className="-mb-[0.42em] w-full whitespace-nowrap text-center font-display leading-none text-white/[0.04]"
          style={{ fontSize: "20vw" }}
        >
          TypeSmith
        </p>
      </div>
    </footer>
  );
}
