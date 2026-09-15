import { describe, expect, it } from "vitest";
import {
  THEME_ATTRIBUTE,
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
  parseTheme,
  resolveTheme,
  toggleTheme,
} from "@/backend/project/theme";

describe("parseTheme", () => {
  it("accepts the two real themes", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("returns null for anything else, which means 'nobody has chosen'", () => {
    expect(parseTheme(null)).toBeNull();
    expect(parseTheme("")).toBeNull();
    expect(parseTheme("Dark")).toBeNull();
    expect(parseTheme(42)).toBeNull();
  });

  it("reads the retired 'system' value as no preference", () => {
    // Older builds stored a third choice. Those users should quietly carry on
    // following their OS rather than getting pinned to a stale value.
    expect(parseTheme("system")).toBeNull();
  });
});

describe("resolveTheme", () => {
  it("uses the OS until someone picks a side", () => {
    expect(resolveTheme(null, "dark")).toBe("dark");
    expect(resolveTheme(null, "light")).toBe("light");
  });

  it("lets an explicit choice win over the OS", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("dark", "light")).toBe("dark");
  });
});

describe("toggleTheme", () => {
  it("flips, and flipping twice is a round trip", () => {
    expect(toggleTheme("light")).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
    expect(toggleTheme(toggleTheme("light"))).toBe("light");
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

  it("applies the stored theme, falling back to the OS", () => {
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
    // The retired value defers to the OS rather than pinning anyone.
    expect(run("system", true)).toBe("dark");
    expect(run("system", false)).toBe("light");
  });
});
