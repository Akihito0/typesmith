"use client";

import { useState } from "react";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Marquee, Instruments, Doctrine, Editions, Colophon } from "@/components/landing/Sections";
import { AuthModal } from "@/components/landing/AuthModal";

// v6 page order — dark bookends around a light editorial middle, no scroll
// hijacking, blueprint grid contained to the specimen panel:
// 01 Specimen (hero + live specimen panel) -> marquee -> 02 Instruments ->
// 03 Doctrine -> 04 Editions -> 05 Colophon.
export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white">
      {/* First screen: nav + hero + marquee fill exactly one viewport — the
          marquee rides the bottom edge and the light sections only appear on
          scroll. */}
      <div className="flex min-h-screen flex-col">
        <Nav onLogin={() => setAuthOpen(true)} />
        <Hero />
        <Marquee />
      </div>
      <Instruments />
      <Doctrine />
      <Editions onStart={() => setAuthOpen(true)} />
      <Colophon />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
