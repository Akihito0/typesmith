"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { HeroShowcase } from "./HeroShowcase";

// 01 — SPECIMEN. Symmetric composition: the staircased headline rails the
// left edge, the pitch + CTAs rail the right edge, and the showcase panel —
// the working editor — sits centered between them as the hero's focal
// object. Below lg everything stacks: headline, pitch/CTAs, panel.
export function Hero() {
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
      className="relative flex flex-1 items-center overflow-hidden bg-canvas py-8 text-white"
    >
      <div className="mx-auto w-full max-w-[120rem] px-6 md:px-10">
        <div className="grid grid-cols-1 items-center gap-9 lg:grid-cols-[minmax(230px,320px)_1fr_minmax(230px,320px)] lg:gap-7 xl:gap-9">
          {/* Left rail — the headline */}
          <h1
            ref={headRef}
            className="font-display font-medium tracking-tight text-white will-change-transform"
            style={{ fontSize: "clamp(1.9rem, 2.4vw, 2.6rem)", lineHeight: 1.1 }}
          >
            <span className="reveal-mask">
              <span className="reveal-line whitespace-nowrap" style={{ animationDelay: "0.05s" }}>
                Precision
              </span>
            </span>
            <span className="reveal-mask">
              <span
                className="reveal-line whitespace-nowrap text-brand-500"
                style={{ animationDelay: "0.16s" }}
              >
                typography
              </span>
            </span>
            <span className="reveal-mask">
              <span className="reveal-line whitespace-nowrap" style={{ animationDelay: "0.27s" }}>
                and UI design,
              </span>
            </span>
            <span className="reveal-mask">
              <span className="reveal-line whitespace-nowrap" style={{ animationDelay: "0.38s" }}>
                in one tool.
              </span>
            </span>
          </h1>

          {/* Center — THE SHOWCASE, the focal object. The inner cap keeps the
              panel from outgrowing the viewport height (16.5rem ≈ nav +
              marquee + panel chrome + padding), so the marquee always rides
              the bottom edge of the first screen. Settles in after the
              headline's first lines. */}
          <div className="order-3 min-w-0 lg:order-none">
            <div
              className="hero-item mx-auto lg:max-w-[calc((100vh-16.5rem)*1.6)]"
              style={{ animationDelay: "0.3s" }}
            >
              <HeroShowcase />
            </div>
          </div>

          {/* Right rail — pitch + CTAs, mirrored to the right edge; they
              close the entrance sequence. */}
          <div className="lg:text-right">
            <p
              className="hero-item text-[16px] leading-relaxed text-gray-400"
              style={{ animationDelay: "0.55s" }}
            >
              Generate type scales, check contrast, and preview real-world mockups instantly. Built
              for designers who value mathematical rigor.
            </p>
            <div
              className="hero-item mt-6 flex flex-wrap items-center gap-x-7 gap-y-4 lg:justify-end"
              style={{ animationDelay: "0.7s" }}
            >
              <Link
                href="/editor"
                className="chamfer group relative inline-flex items-center gap-2 bg-brand-600 px-7 py-3.5 font-mono text-[12px] uppercase tracking-[0.15em] text-white transition-colors hover:bg-brand-700"
              >
                Start tuning
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                >
                  -&gt;
                </span>
              </Link>
              <a
                href="#editions"
                className="link-underline font-mono text-[12px] uppercase tracking-[0.15em] text-gray-400 hover:text-brand-100"
              >
                View editions
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
