import { describe, expect, it } from "vitest";
import {
  THEME_ATTRIBUTE,
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
  nextTheme,
  normalizeTheme,
  resolveTheme,
} from "@/backend/project/theme";

describe("normalizeTheme", () => {
  it("accepts the three real choices", () => {
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("system")).toBe("system");
  });

  it("falls back to following the OS for anything else", () => {
    // A stale or hand-edited localStorage value must not wedge the app.
    for (const junk of [null, undefined, "", "Dark", 1, {}, "auto"]) {
      expect(normalizeTheme(junk)).toBe("system");
    }
  });
});

describe("resolveTheme", () => {
  it("defers to the OS only when the choice is system", () => {
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("system", "light")).toBe("light");
  });

  it("lets an explicit choice override the OS", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("dark", "light")).toBe("dark");
  });
});

describe("nextTheme", () => {
  it("cycles light -> dark -> system -> light", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
    expect(nextTheme("system")).toBe("light");
  });

  it("recovers from a corrupt value instead of getting stuck", () => {
    expect(nextTheme("nonsense" as never)).toBe("light");
  });
});

describe("THEME_BOOT_SCRIPT", () => {
  it("names the same storage key and attribute the app uses", () => {
    // If these drift, the pre-paint script and React disagree and the theme
    // flashes on every load.
    expect(THEME_BOOT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
    expect(THEME_BOOT_SCRIPT).toContain(JSON.stringify(THEME_ATTRIBUTE));
  });

  it("is self-contained and cannot throw the page down", () => {
    expect(THEME_BOOT_SCRIPT).toContain("try{");
    expect(THEME_BOOT_SCRIPT).toContain("catch");
    expect(THEME_BOOT_SCRIPT).not.toContain("import ");
  });

  it("actually applies the stored choice, falling back to the OS", () => {
    // Run it against fakes to prove the branch logic, not just its text.
    const run = (stored: string | null, prefersDark: boolean) => {
      let applied = "";
      const doc = { documentElement: { setAttribute: (_: string, v: string) => (applied = v) } };
      const win = { matchMedia: () => ({ matches: prefersDark }) };
      new Function("document", "localStorage", "window", THEME_BOOT_SCRIPT)(
        doc,
        { getItem: () => stored },
        win
      );
      return applied;
    };

    expect(run("dark", false)).toBe("dark");
    expect(run("light", true)).toBe("light");
    expect(run(null, true)).toBe("dark");
    expect(run(null, false)).toBe("light");
    expect(run("garbage", true)).toBe("dark");
  });
});
