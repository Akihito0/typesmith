"use client";

// THE HERO SHOWCASE — a timelapse of real work in the editor. Eight retina
// captures of the actual app (public/shots/) recorded mid-workflow: tuning
// the ratio, pairing Playfair, recoloring the accent, proofing contrast,
// flipping the mockup to mobile, ending on the assembled style guide. A demo
// cursor glides to the control that causes each change and "presses" it (a
// soft cursor dip — no ripple), and the press swaps to the next frame.
// Hovering pauses; a tab pick pauses on that panel and auto-resumes after
// RESUME_MS (or via the Resume button). Never animates under
// prefers-reduced-motion. (A fullscreen intro variant is parked — see
// TASK.md.)
//
// The screenshots are positional: `target` points the cursor at a control
// inside the image (in % of the 1440×900 capture). Regenerate with the
// capture script after editor UI changes (see TASK.md), then re-check
// targets.

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

const STORY = [
  {
    src: "/shots/01-type-scale.png",
    alt: "TypeSmith editor — type scale at defaults",
    caption: "Open: 16px base × 1.250",
    tab: 0,
    target: { x: 96.0, y: 3.1 }, // toolbar ratio input
  },
  {
    src: "/shots/02-ratio.png",
    alt: "TypeSmith editor — ratio tuned to 1.414",
    caption: "Ratio tuned -> 1.414",
    tab: 0,
    target: { x: 52.0, y: 3.1 }, // toolbar heading font picker
  },
  {
    src: "/shots/03-font.png",
    alt: "TypeSmith editor — heading paired with Playfair Display",
    caption: "Heading paired -> Playfair Display",
    tab: 0,
    target: { x: 4.3, y: 25.9 }, // sidebar: Colors
  },
  {
    src: "/shots/04-colors.png",
    alt: "TypeSmith editor — WCAG and APCA contrast checker",
    caption: "Proofing contrast — 5.17:1 AA",
    tab: 1,
    target: { x: 38.0, y: 34.0 }, // accent hex input
  },
  {
    src: "/shots/05-accent.png",
    alt: "TypeSmith editor — accent recolored",
    caption: "Accent recolored -> #16a34a",
    tab: 1,
    target: { x: 4.5, y: 34.0 }, // sidebar: Website
  },
  {
    src: "/shots/06-website.png",
    alt: "TypeSmith editor — live website mockup with the new system",
    caption: "Mockup — live from the system",
    tab: 2,
    target: { x: 52.8, y: 9.6 }, // mobile width toggle
  },
  {
    src: "/shots/07-mobile.png",
    alt: "TypeSmith editor — website mockup at mobile width",
    caption: "Responsive check — mobile frame",
    tab: 2,
    target: { x: 4.7, y: 18.4 }, // sidebar: Style Guide
  },
  {
    src: "/shots/08-style-guide.png",
    alt: "TypeSmith editor — assembled style guide",
    caption: "Style guide — assembled itself",
    tab: 3,
    target: { x: 4.7, y: 22.2 }, // sidebar: Type Scale (loop)
  },
] as const;

const TABS = ["Type Scale", "Colors", "Website", "Style Guide"] as const;
const TAB_START = [0, 3, 5, 7] as const;

// One beat = study the result, glide (0.8s), press, swap.
const STEP_MS = 2600;
const GLIDE_AT = 1500;
const PRESS_AT = 2350;
// After a manual tab pick the session auto-resumes — long enough to study a
// panel, short enough that the show never feels dead.
const RESUME_MS = 8000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function useSession(running: boolean) {
  const [step, setStep] = useState(0);
  const [cursor, setCursor] = useState({ x: 58, y: 42 });
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    if (!running || prefersReducedMotion()) return;
    const next = (step + 1) % STORY.length;
    const t1 = setTimeout(() => setCursor(STORY[step].target), GLIDE_AT);
    const t2 = setTimeout(() => setPressing(true), PRESS_AT);
    const t3 = setTimeout(() => {
      setPressing(false);
      setStep(next);
    }, STEP_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setPressing(false);
    };
  }, [step, running]);

  return { step, cursor, pressing, setStep };
}

function ShowcasePanel({
  step,
  onPickTab,
  onResume,
  showProgress,
  overlay,
}: {
  step: number;
  onPickTab?: (tab: number) => void;
  onResume?: () => void;
  showProgress?: boolean;
  overlay?: ReactNode;
}) {
  const frame = STORY[step];
  return (
    <div className="grid-blueprint-faint flex h-full flex-col overflow-hidden border border-canvas-line bg-canvas">
      {/* header: live caption + panel tabs */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-canvas-line px-6 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500 md:px-8">
        <span className="text-brand-100">
          <span className="text-gray-500">
            Fig. A <span className="mx-1 text-brand-500">&#9632;</span>
          </span>
          {frame.caption}
        </span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {onResume && (
            <button
              type="button"
              onClick={onResume}
              className="text-brand-100 transition-colors hover:text-white"
            >
              Resume -&gt;
            </button>
          )}
          {TABS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={onPickTab ? () => onPickTab(i) : undefined}
              tabIndex={onPickTab ? undefined : -1}
              aria-pressed={frame.tab === i}
              className={`transition-colors ${
                frame.tab === i ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <span className={frame.tab === i ? "text-brand-500" : ""}>0{i + 1}</span> {label}
            </button>
          ))}
        </div>
      </div>

      {/* per-beat progress hairline */}
      <div className="relative h-px w-full bg-canvas-line">
        {showProgress && (
          <span
            key={step}
            className="showcase-progress absolute inset-y-0 left-0 bg-brand-500"
            style={{ animationDuration: `${STEP_MS}ms` }}
          />
        )}
      </div>

      {/* the frames + demo cursor. All frames stay mounted and stacked; the
          active one swaps with a hard cut — no crossfade, because two frames
          mid-fade both go semi-transparent and the dark panel blinks through.
          An instant cut is exactly what a real click repaint looks like. */}
      <div className="relative min-h-0 flex-1">
        {STORY.map((f, i) => (
          <Image
            key={f.src}
            src={f.src}
            alt={i === step ? f.alt : ""}
            width={1440}
            height={900}
            priority={i === 0}
            className={`h-auto w-full ${i === 0 ? "" : "absolute inset-0"} ${
              i === step ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {overlay}
      </div>
    </div>
  );
}

export function HeroShowcase() {
  const [hovered, setHovered] = useState(false);
  const [manualTab, setManualTab] = useState<number | null>(null);

  const running = manualTab === null && !hovered;
  const session = useSession(running);

  // A tab pick pauses the session on that panel; it resumes on its own after
  // RESUME_MS (or immediately via the Resume button in the header).
  useEffect(() => {
    if (manualTab === null) return;
    const t = setTimeout(() => setManualTab(null), RESUME_MS);
    return () => clearTimeout(t);
  }, [manualTab]);

  const displayStep = manualTab !== null ? TAB_START[manualTab] : session.step;
  const showCursor = running && !prefersReducedMotion();

  const cursorOverlay = showCursor ? (
    <div
      aria-hidden="true"
      className="demo-cursor pointer-events-none absolute z-10"
      style={{
        left: `${session.cursor.x}%`,
        top: `${session.cursor.y}%`,
        transform: session.pressing ? "scale(0.82)" : undefined,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" className="drop-shadow-md">
        <path
          d="M5 3l14 8.5-6.2 1.3L16 19l-2.8 1.4-3.2-6.2L5 18V3z"
          fill="#fff"
          stroke="#111827"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  ) : null;

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <ShowcasePanel
        step={displayStep}
        showProgress={running}
        overlay={cursorOverlay}
        onPickTab={(tab) => {
          setManualTab(tab);
          session.setStep(TAB_START[tab]);
        }}
        onResume={manualTab !== null ? () => setManualTab(null) : undefined}
      />
    </div>
  );
}
