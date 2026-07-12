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
