"use client";

import { useState } from "react";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Ramp } from "@/components/landing/Ramp";
import { Marquee, Instruments, Doctrine, Editions, Colophon } from "@/components/landing/Sections";
import { AuthModal } from "@/components/landing/AuthModal";

// v5 page order — dark bookends, a scroll-driven pinned interlude, and a
// light editorial middle:
// 01 Specimen (hero) -> marquee -> 02 The Ramp (pinned scroll traverse) ->
// 03 Instruments -> 04 Doctrine -> 05 Editions -> 06 Colophon.
export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white">
      <Nav onLogin={() => setAuthOpen(true)} />
      <Hero />
      <Marquee />
      <Ramp />
      <Instruments />
      <Doctrine />
      <Editions onStart={() => setAuthOpen(true)} />
      <Colophon />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
