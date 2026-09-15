"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  systemTheme,
  toggleTheme,
  type Theme,
} from "@/backend/project/theme";

/** Reads the stored preference on mount and keeps <html> in sync. The boot
 * script in app/layout.tsx has already painted the right theme by the time
 * this runs; this hook only takes over from there. */
export function useTheme() {
  const [stored, setStored] = useState<Theme | null>(null);
  const [system, setSystem] = useState<Theme>("light");

  useEffect(() => {
    setStored(readStoredTheme());
    setSystem(systemTheme());
  }, []);

  // Until someone picks a side, the OS decides — and keeps deciding, so the
  // app follows it at sunset rather than sampling once at load.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(query.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const theme = resolveTheme(stored, system);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    const next = toggleTheme(theme);
    setStored(next);
    storeTheme(next);
  }, [theme]);

  return { theme, toggle };
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * One button, two states. It shows the theme it will switch *to* — a moon
 * while you are in light — and says so, so the icon never has to carry the
 * meaning on its own.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const next = toggleTheme(theme);
  const label = `Switch to ${next} theme`;

  return (
    <button
      type="button"
      onClick={toggle}
      data-theme={theme}
      aria-label={label}
      title={label}
      className={className}
    >
      {next === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
