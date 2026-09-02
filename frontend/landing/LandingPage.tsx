"use client";

import { useState } from "react";
import { Nav } from "@/frontend/landing/Nav";
import { Hero } from "@/frontend/landing/Hero";
import { Marquee, Features, Doctrine, Editions, Colophon } from "@/frontend/landing/Sections";
import { AuthModal } from "@/frontend/landing/AuthModal";
import { SmoothScroll } from "@/frontend/landing/SmoothScroll";

// Page order — dark bookends around a light editorial middle, no scroll
// hijacking, blueprint grid contained to the preview panel:
// Preview (hero + live preview panel) -> marquee -> Features ->
// Doctrine -> Editions -> Colophon.
export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <main className="ts-light min-h-screen bg-canvas">
      {/* First screen: nav + hero + marquee fill exactly one viewport — the
          marquee rides the bottom edge and the light sections only appear on
          scroll. */}
      <SmoothScroll />
      <div className="flex min-h-screen flex-col">
        <Nav onLogin={() => setAuthOpen(true)} />
        <Hero />
        <Marquee />
      </div>
      <div className="ts-light bg-white text-ink pb-12 md:pb-16">
        <Features />
        <Doctrine />
        <Editions onStart={() => setAuthOpen(true)} />
      </div>
      <Colophon />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
