// App theme. Deliberately separate from ProjectState: the theme is a property
// of the person using TypeSmith, not of the document they are making, so it
// must not travel in `?s=` share links, backups, or the workspace registry.
// It lives in its own localStorage key and nothing else reads it.

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "typesmith-theme";
/** Attribute on <html>. Distinct from the `data-theme` the Type Scale panel
 * puts on its own preview, which themes the artwork rather than the app. */
export const THEME_ATTRIBUTE = "data-app-theme";

export const THEME_CHOICES: ThemeChoice[] = ["light", "dark", "system"];

export function normalizeTheme(value: unknown): ThemeChoice {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

/** What the OS is asking for. Falls back to light where matchMedia is absent
 * (server render, older browsers). */
export function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(choice: ThemeChoice, system: ResolvedTheme): ResolvedTheme {
  return choice === "system" ? system : choice;
}

/** The next choice in the Light → Dark → System cycle. */
export function nextTheme(choice: ThemeChoice): ThemeChoice {
  const index = THEME_CHOICES.indexOf(normalizeTheme(choice));
  return THEME_CHOICES[(index + 1) % THEME_CHOICES.length];
}

export function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Private browsing and blocked storage both throw; the default is fine.
    return "system";
  }
}

export function storeTheme(choice: ThemeChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Not being able to remember the preference is not worth breaking on.
  }
}

export function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(THEME_ATTRIBUTE, resolved);
}

/** Runs in <head> before first paint, so a dark-mode visitor never sees a
 * white flash. Inlined as a string because it has to execute before React
 * hydrates. Keep it dependency-free and defensive — it runs before anything
 * else on the page. */
export const THEME_BOOT_SCRIPT = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
var t=(s==='light'||s==='dark')?s:m;
document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},t);
}catch(e){document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},'light');}})();`;
