"use client";

import { useEffect } from "react";

// Eased in-page scrolling for hash links. Intercepts any same-page anchor
// (nav, hero, footer index) and animates the scroll with the house
// front-loaded easing — a settle, never a hard jump — offset for the sticky
// nav so a target never lands under it. Cross-page links (/changelog),
// external links, and modified clicks fall through to the browser.
// prefers-reduced-motion collapses the animation to an instant, offset jump.

const NAV_OFFSET = 64; // sticky nav height (h-16 = 4rem)

// easeOutQuint — fast out of the gate, long gentle settle. The scroll analog
// of the cubic-bezier(0.16, 1, 0.3, 1) used across the site's reveals.
const ease = (t: number) => 1 - Math.pow(1 - t, 5);

export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    function targetTop(hash: string): number | null {
      const el = document.querySelector(hash);
      if (!el) return null;
      const top = window.scrollY + el.getBoundingClientRect().top - NAV_OFFSET;
      // The first section (hero) sits exactly NAV_OFFSET below the top, so its
      // offset target resolves to 0 — a clean return to the first screen.
      return Math.max(0, Math.round(top));
    }

    function cancel() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    function animateTo(to: number) {
      cancel();
      const from = window.scrollY;
      const dist = to - from;
      if (Math.abs(dist) < 2) return;
      const dur = Math.min(900, Math.max(450, Math.abs(dist) * 0.5));
      let start = 0;
      const frame = (now: number) => {
        if (!start) start = now;
        const p = Math.min(1, (now - start) / dur);
        window.scrollTo(0, from + dist * ease(p));
        raf = p < 1 ? requestAnimationFrame(frame) : 0;
      };
      raf = requestAnimationFrame(frame);
    }

    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.href);
      // Only same-document hash links animate; anything else is a real
      // navigation and belongs to the browser / router.
      if (
        url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        !url.hash
      ) {
        return;
      }
      const to = targetTop(url.hash);
      if (to === null) return;
      e.preventDefault();
      window.history.pushState(null, "", url.hash);
      if (reduce) {
        window.scrollTo(0, to);
        return;
      }
      animateTo(to);
    }

    // Any manual scroll intent hands control straight back to the user.
    const onUserScroll = () => cancel();

    document.addEventListener("click", onClick);
    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchstart", onUserScroll, { passive: true });
    return () => {
      cancel();
      document.removeEventListener("click", onClick);
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchstart", onUserScroll);
    };
  }, []);

  return null;
}
