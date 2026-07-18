"use client";

import { useMemo, useState } from "react";
import { useProject } from "@/lib/store";
import { fontById } from "@/lib/fonts";
import { buildScale } from "@/lib/scale";
import { readableInk } from "./MockupPanel";

// The three Pro-badged layouts (free during the beta). Like the Website and
// Mobile mockups, everything renders live from the shared project state, and
// the copy is edited from the "Mockup Content" section of the mockup rail.

function useDesign() {
  const p = useProject();
  const scale = useMemo(() => buildScale(p.base, p.ratio), [p.base, p.ratio]);
  return {
    p,
    heading: fontById(p.headingFont),
    body: fontById(p.bodyFont),
    px: (label: string, fallback: number) =>
      scale.find((s) => s.label === label)?.px ?? fallback,
    ink: readableInk(p.background),
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Body copy split into presentation bullets for the content slide.
function toBullets(body: string): string[] {
  return body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}

// ---- Slides -----------------------------------------------------------------
export function SlidesPanel() {
  const { p, heading, body, px, ink } = useDesign();
  const [slide, setSlide] = useState(0);

  const headingStyle = {
    fontFamily: heading.stack,
    lineHeight: p.headingLeading,
    letterSpacing: `${p.headingTracking}em`,
  };

  const slides = [
    // 1 — title
    <div key="title" className="flex h-full flex-col justify-center px-[8%]">
      <p
        className="text-[0.9em] font-semibold uppercase tracking-[0.16em]"
        style={{ fontFamily: body.stack, color: p.accent }}
      >
        {p.subhead}
      </p>
      <h2 className="mt-[2%] font-bold" style={{ ...headingStyle, fontSize: "2.6em" }}>
        {p.headline}
      </h2>
      <p className="mt-auto pb-[6%] text-[0.85em] opacity-60" style={{ fontFamily: body.stack }}>
        {p.projectName} · {p.author}
      </p>
    </div>,

    // 2 — content
    <div key="content" className="flex h-full flex-col px-[8%] py-[7%]">
      <h3 className="font-bold" style={{ ...headingStyle, fontSize: "1.7em" }}>
        {p.previewText || "Modern Typography"}
      </h3>
      <ul className="mt-[4%] space-y-[3%]" style={{ fontFamily: body.stack, lineHeight: p.bodyLeading }}>
        {toBullets(p.body).map((b, i) => (
          <li key={i} className="flex items-start gap-[1.2em] text-[0.95em]">
            <span
              className="mt-[0.45em] block h-[0.5em] w-[0.5em] shrink-0 rounded-full"
              style={{ background: p.accent }}
            />
            {b}
          </li>
        ))}
      </ul>
      <p className="mt-auto text-[0.7em] opacity-50" style={{ fontFamily: body.stack }}>
        {p.projectName}
      </p>
    </div>,

    // 3 — closing
    <div key="closing" className="flex h-full flex-col items-center justify-center px-[10%] text-center">
      <h2 className="font-bold" style={{ ...headingStyle, fontSize: "2.2em" }}>
        {p.previewText || "Modern Typography"}
      </h2>
      <span
        className="mt-[4%] rounded-md px-[1.4em] py-[0.6em] text-[0.9em] font-medium text-white"
        style={{ background: p.accent, fontFamily: body.stack }}
      >
        Get Started
      </span>
      <p className="mt-[3%] text-[0.75em] opacity-60" style={{ fontFamily: body.stack }}>
        {p.projectName} · by {p.author}
      </p>
    </div>,
  ];

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-auto ts-scroll">
      {/* 16:9 slide frame; font-size on the frame drives the em-based type inside */}
      <div className="flex w-full max-w-3xl flex-1 items-center">
        <div
          className="aspect-video w-full overflow-hidden rounded-lg border border-line shadow-panel"
          style={{ background: p.background, color: ink, fontSize: `clamp(10px, 2.2vw, ${px("Lead", 22)}px)` }}
        >
          {slides[slide]}
        </div>
      </div>

      {/* deck controls */}
      <div className="flex items-center gap-3 pb-1">
        <button
          onClick={() => setSlide((s) => Math.max(0, s - 1))}
          disabled={slide === 0}
          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs text-ink hover:bg-surface disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === slide ? "bg-brand-600" : "bg-line hover:bg-muted/40"
              }`}
            />
          ))}
        </span>
        <button
          onClick={() => setSlide((s) => Math.min(slides.length - 1, s + 1))}
          disabled={slide === slides.length - 1}
          className="rounded-md border border-line bg-white px-2.5 py-1 text-xs text-ink hover:bg-surface disabled:opacity-40"
        >
          Next →
        </button>
        <span className="text-[11px] text-muted">
          {slide + 1} / {slides.length}
        </span>
      </div>
    </div>
  );
}

// ---- Social -----------------------------------------------------------------
export function SocialPanel() {
  const { p, heading, body, ink } = useDesign();

  return (
    <div className="flex h-full flex-wrap content-start items-start justify-center gap-6 overflow-auto py-2 ts-scroll">
      {/* square post */}
      <div className="w-[340px] overflow-hidden rounded-xl border border-line bg-white shadow-panel">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
          <span
            className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-white"
            style={{ background: p.accent }}
          >
            {initials(p.projectName)}
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-ink">{p.projectName}</p>
            <p className="text-[11px] text-muted">Sponsored</p>
          </div>
        </div>
        <div
          className="flex aspect-square flex-col justify-center px-8"
          style={{ background: p.background, color: ink }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ fontFamily: body.stack, color: p.accent }}
          >
            {p.subhead}
          </p>
          <h3
            className="mt-2 text-[30px] font-bold"
            style={{
              fontFamily: heading.stack,
              lineHeight: p.headingLeading,
              letterSpacing: `${p.headingTracking}em`,
            }}
          >
            {p.previewText || "Modern Typography"}
          </h3>
        </div>
        <div className="px-3.5 py-3 text-[12px] text-ink" style={{ lineHeight: 1.45 }}>
          <b>{p.projectName}</b>{" "}
          <span className="text-muted">{p.body.slice(0, 110)}…</span>
        </div>
      </div>

      {/* post card (X/LinkedIn-style) */}
      <div className="w-[400px] rounded-xl border border-line bg-white p-4 shadow-panel">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-full text-[12px] font-bold text-white"
            style={{ background: p.accent }}
          >
            {initials(p.author)}
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-ink">{p.author}</p>
            <p className="text-[11px] text-muted">
              @{p.projectName.toLowerCase().replace(/\s+/g, "")}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[14px] text-ink" style={{ fontFamily: body.stack, lineHeight: p.bodyLeading }}>
          {p.headline}
        </p>
        {/* link preview card */}
        <div className="mt-3 overflow-hidden rounded-lg border border-line">
          <div
            className="flex h-36 flex-col justify-center px-6"
            style={{ background: p.background, color: ink }}
          >
            <h4
              className="text-[22px] font-bold"
              style={{
                fontFamily: heading.stack,
                lineHeight: p.headingLeading,
                letterSpacing: `${p.headingTracking}em`,
              }}
            >
              {p.previewText || "Modern Typography"}
            </h4>
          </div>
          <div className="border-t border-line px-3 py-2">
            <p className="text-[11px] text-muted">
              typesmith.io/{p.projectName.toLowerCase().replace(/\s+/g, "-")}
            </p>
            <p className="text-[12px] font-medium text-ink">{p.subhead}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-6 text-[11px] text-muted">
          <span>💬 128</span>
          <span>🔁 342</span>
          <span>❤️ 2.1k</span>
        </div>
      </div>
    </div>
  );
}

// ---- Newsletter -------------------------------------------------------------
export function NewsletterPanel() {
  const { p, heading, body, ink } = useDesign();

  return (
    <div className="flex h-full justify-center overflow-auto py-2 ts-scroll">
      <div className="h-fit w-full max-w-xl overflow-hidden rounded-lg border border-line bg-white shadow-panel">
        {/* email client chrome */}
        <div className="border-b border-line bg-surface px-5 py-3">
          <p className="text-[14px] font-semibold text-ink">{p.headline}</p>
          <p className="mt-0.5 text-[12px] text-muted">
            {p.author} &lt;hello@{p.projectName.toLowerCase().replace(/\s+/g, "")}.io&gt; — {p.subhead}
          </p>
        </div>

        {/* email body */}
        <div style={{ background: p.background, color: ink }}>
          <div className="px-8 py-8">
            <span
              className="grid h-9 w-9 place-items-center rounded-md text-[13px] font-bold text-white"
              style={{ background: p.accent }}
            >
              {initials(p.projectName)}
            </span>
            <h2
              className="mt-5 text-[26px] font-bold"
              style={{
                fontFamily: heading.stack,
                lineHeight: p.headingLeading,
                letterSpacing: `${p.headingTracking}em`,
              }}
            >
              {p.headline}
            </h2>
            <p
              className="mt-4 text-[14px] opacity-80"
              style={{ fontFamily: body.stack, lineHeight: p.bodyLeading }}
            >
              {p.body}
            </p>
            <span
              className="mt-6 inline-block rounded-md px-5 py-2.5 text-[13px] font-medium text-white"
              style={{ background: p.accent, fontFamily: body.stack }}
            >
              Read the full story
            </span>
          </div>
          <div
            className="border-t px-8 py-4 text-[11px] opacity-50"
            style={{ borderColor: "rgba(127,127,127,0.25)", fontFamily: body.stack }}
          >
            {p.projectName} · You&apos;re receiving this because you subscribed. Unsubscribe
          </div>
        </div>
      </div>
    </div>
  );
}
