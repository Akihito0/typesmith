// App theme. Deliberately separate from ProjectState: the theme is a property
// of the person using TypeSmith, not of the document they are making, so it
// must not travel in `?s=` share links, backups, or the workspace registry.
// It lives in its own localStorage key and nothing else reads it.
//
// The control is two-state — light or dark, nothing else. A first visit still
// starts from the OS preference, but "follow the OS" is a starting point
// rather than a third thing to land on, which is a state people had to think
// about for no benefit.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "typesmith-theme";
/** Attribute on <html>. Distinct from the `data-theme` the Type Scale panel
 * puts on its own preview, which themes the artwork rather than the app. */
export const THEME_ATTRIBUTE = "data-app-theme";

export const THEMES: Theme[] = ["light", "dark"];

/** A stored value, or null when there isn't a usable one. Null is meaningful:
 * it means "nobody has chosen yet", which is what lets the OS decide. An older
 * build stored "system"; that reads back as null, so those users simply carry
 * on following their OS. */
export function parseTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

/** What the OS is asking for. Falls back to light where matchMedia is absent
 * (server render, older browsers). */
export function systemTheme(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The theme to show: whatever was chosen, else whatever the OS wants. */
export function resolveTheme(stored: Theme | null, system: Theme): Theme {
  return stored ?? system;
}

export function toggleTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Private browsing and blocked storage both throw; no preference is fine.
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not being able to remember the preference is not worth breaking on.
  }
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
}

/** Runs in <head> before first paint, so a dark-mode visitor never sees a
 * white flash. Inlined as a string because it has to execute before React
 * hydrates. Keep it dependency-free and defensive — it runs before anything
 * else on the page. Anything that isn't "light" or "dark" (including the old
 * "system" value) defers to the OS. */
export const THEME_BOOT_SCRIPT = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
var t=(s==='light'||s==='dark')?s:m;
document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},t);
}catch(e){document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},'light');}})();`;
