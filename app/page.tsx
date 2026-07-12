"use client";

import { useState } from "react";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Marquee, Instruments, Editions, Colophon } from "@/components/landing/Sections";
import { AuthModal } from "@/components/landing/AuthModal";

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white">
      <Nav onLogin={() => setAuthOpen(true)} />
      <Hero />
      <Marquee />
      <Instruments />
      <Editions onStart={() => setAuthOpen(true)} />
      <Colophon />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
