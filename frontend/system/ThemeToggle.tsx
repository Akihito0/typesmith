"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  nextTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  systemTheme,
  type ResolvedTheme,
  type ThemeChoice,
} from "@/backend/project/theme";

/** Reads the stored choice on mount and keeps <html> in sync. The boot script
 * in app/layout.tsx has already painted the right theme by the time this runs;
 * this hook only takes over from there. */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [system, setSystem] = useState<ResolvedTheme>("light");

  useEffect(() => {
    setChoice(readStoredTheme());
    setSystem(systemTheme());
  }, []);

  // Following the OS is the default, so keep listening rather than sampling
  // once — the theme should change under the user at sunset.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(query.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveTheme(choice, system);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const choose = useCallback((next: ThemeChoice) => {
    setChoice(next);
    storeTheme(next);
  }, []);

  const cycle = useCallback(() => choose(nextTheme(readStoredTheme())), [choose]);

  return { choice, resolved, choose, cycle };
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

function SystemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="4" width="19" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const LABELS: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

/**
 * One button that cycles Light → Dark → System. The accessible name always
 * says what is active *and* what pressing does, because the icon alone can't
 * distinguish "dark because you chose it" from "dark because your OS is".
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { choice, resolved, cycle } = useTheme();
  const Icon = choice === "system" ? SystemIcon : choice === "dark" ? MoonIcon : SunIcon;

  return (
    <button
      type="button"
      onClick={cycle}
      data-theme-choice={choice}
      aria-label={`Theme: ${LABELS[choice]}${choice === "system" ? ` (${LABELS[resolved]})` : ""}. Switch to ${LABELS[nextTheme(choice)]}.`}
      title={`Theme: ${LABELS[choice]} — click for ${LABELS[nextTheme(choice)]}`}
      className={className}
    >
      <Icon />
    </button>
  );
}
