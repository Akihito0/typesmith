"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { HeroShowcase } from "./HeroShowcase";
import { useScrollPercent } from "./useReveal";

// 01 — SPECIMEN. Poster composition on the dark control surface: masked
// headline reveals, spec marginalia, and the editor-timelapse showcase in a
// contained instrument panel below.
export function Hero() {
  const pct = useScrollPercent();
  const headRef = useRef<HTMLHeadingElement | null>(null);

  // Headline drift at ~7% of scroll speed (skipped under reduced motion).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = headRef.current;
        if (el) {
          el.style.transform = `translateY(${Math.min(window.scrollY, 720) * -0.07}px)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="specimen"
      className="relative overflow-hidden border-b border-canvas-line bg-canvas pb-16 text-white"
    >
      {/* Top marginalia row — four cells, the third a live scroll HUD */}
      <div className="relative mx-auto flex max-w-6xl flex-col border-b border-canvas-line font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500 sm:flex-row">
        <div className="border-b border-canvas-line px-6 py-3 sm:flex-1 sm:border-b-0 sm:border-r md:px-10">
          01 &mdash; Specimen
        </div>
        <div className="border-b border-canvas-line px-6 py-3 sm:flex-1 sm:border-b-0 sm:border-r md:px-10">
          TypeSmith &mdash; Control Surface
        </div>
        <div className="border-b border-canvas-line px-6 py-3 tabular-nums sm:flex-1 sm:border-b-0 sm:border-r md:px-10">
          Scroll <span className="text-white">{String(pct).padStart(3, "0")}%</span>
        </div>
        <div className="px-6 py-3 md:px-10">Rev 06 &mdash; Fig. A</div>
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 md:px-10">
        {/* Held invisible while the intro plays; remounts when it finishes so
            the masked line reveals fire right as the editor lands. */}
        <div>
          {/* Spec column — marginalia pinned top-right on md+ */}
          <div className="pt-10 md:absolute md:right-10 md:top-12 md:w-[230px] md:pt-0">
            <div className="space-y-2.5 border-l border-canvas-line pl-4 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-400 md:pl-6">
              <p>
                Base <span className="text-white">16px</span>
              </p>
              <p>
                Ratio <span className="text-white">1.250</span>
              </p>
              <p>
                Steps <span className="text-white">&minus;2 .. +5</span>
              </p>
              <p>
                WCAG <span className="text-white">13.9:1 AAA</span>
              </p>
              <p className="pt-2">
                <Link href="/editor" className="link-underline text-brand-100">
                  -&gt; Open the editor
                </Link>
              </p>
            </div>
          </div>

          {/* Poster headline — three staircased masked lines */}
          <h1
            ref={headRef}
            className="mt-10 font-display font-medium tracking-tight text-white will-change-transform md:mt-20"
            style={{ fontSize: "clamp(2.6rem, 8.8vw, 8rem)", lineHeight: 1.02 }}
          >
            <span className="reveal-mask">
              <span className="reveal-line whitespace-nowrap" style={{ animationDelay: "0.05s" }}>
                Type is a
              </span>
            </span>
            <span className="reveal-mask">
              <span
                className="reveal-line whitespace-nowrap text-[1.45em] leading-[1.08] text-brand-500"
                style={{ animationDelay: "0.18s" }}
              >
                system.
              </span>
            </span>
            <span className="reveal-mask">
              <span className="reveal-line whitespace-nowrap" style={{ animationDelay: "0.31s" }}>
                Tune it like one.
              </span>
            </span>
          </h1>

          <div className="mt-10 flex flex-col gap-8 md:mt-12 md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-[15px] leading-relaxed text-gray-400">
              TypeSmith builds modular type scales, pairs typefaces, and proves
              accessibility &mdash; instantly, in the browser.
            </p>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link
                href="/editor"
                className="chamfer group relative inline-flex items-center gap-2 bg-brand-600 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-brand-700"
              >
                Start tuning
                <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                  -&gt;
                </span>
              </Link>
              <a
                href="#editions"
                className="link-underline font-mono text-[11px] uppercase tracking-[0.15em] text-gray-400 hover:text-brand-100"
              >
                View editions
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* THE SHOWCASE — real editor screenshots cycling in the contained
          instrument panel (the intro overlay lands exactly here). */}
      <div className="relative mx-auto mt-16 w-full max-w-6xl px-6 md:mt-20 md:px-10">
        <HeroShowcase />
      </div>
    </section>
  );
}
