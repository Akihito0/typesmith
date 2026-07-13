"use client";

import { useEffect, useRef, useState } from "react";

// Scroll-triggered reveal, FAIL-OPEN by design: server markup ships fully
// visible (no hiding class), and content is only hidden after this hook has
// successfully attached an IntersectionObserver on the client. If JS never
// loads, hydration fails, or IntersectionObserver is unavailable, nothing is
// ever hidden — content can't be permanently invisible again.
//
// States:
//   ""                  — SSR / pre-JS / unsupported: visible, no animation
//   "is-armed"          — observer attached, element below fold: hidden
//   "is-armed is-in"    — element entered viewport: animates in (CSS owns
//                         the motion; the global prefers-reduced-motion rule
//                         collapses it to an instant state change)
// Elements already in the viewport when the hook arms are left visible
// (state stays "idle") so there is no hide-then-show flash on load.
export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<"idle" | "armed" | "in">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    // Already on screen at arm time: never hide it.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < vh && rect.bottom > 0) return;

    setState("armed");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("in");
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const revealClass =
    state === "in" ? "is-armed is-in" : state === "armed" ? "is-armed" : "";

  return { ref, revealClass };
}

// Progress (0..1) of a tall section scrolling past a sticky viewport: 0 when
// the section's top reaches the top of the screen, 1 when its bottom does.
// rAF-throttled; drives the pinned Ramp specimen. Without JS the section
// simply renders its initial state — nothing is hidden.
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const travel = rect.height - vh;
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      setProgress((prev) => (Math.abs(prev - p) < 0.0005 ? prev : p));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { ref, progress };
}

// Whole-page scroll percentage (integer 0..100) for the hero's HUD readout.
// Only re-renders when the rounded value actually changes.
export function useScrollPercent() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      setPct((prev) => (prev === p ? prev : p));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return pct;
}

// Eased 0 -> target counter, started when `active` flips true. Respects
// prefers-reduced-motion by jumping straight to the target.
export function useCountUp(target: number, active: boolean, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);

  return value;
}
