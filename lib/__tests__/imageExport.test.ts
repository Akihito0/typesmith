import { describe, expect, it } from "vitest";
import { ARTBOARDS, initials, readableInk, resolveFontStack, wrapLines } from "../imageExport";

// A stand-in for ctx.measureText: every character is 10 units wide. Keeps the
// wrapping assertions readable without a canvas.
const measure = (s: string) => s.length * 10;

describe("wrapLines", () => {
  it("breaks on words that exceed the width", () => {
    expect(wrapLines("one two three four", 100, measure)).toEqual(["one two", "three four"]);
  });

  it("keeps everything on one line when it fits", () => {
    expect(wrapLines("short text", 1000, measure)).toEqual(["short text"]);
  });

  it("never drops a word that is wider than the line on its own", () => {
    const lines = wrapLines("supercalifragilistic ok", 50, measure);
    expect(lines[0]).toBe("supercalifragilistic");
  });

  it("ellipsises when the line budget runs out", () => {
    const lines = wrapLines("one two three four five six", 100, measure, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
  });

  it("does not ellipsise when everything fit within the budget", () => {
    const lines = wrapLines("one two", 100, measure, 2);
    expect(lines).toEqual(["one two"]);
  });

  it("handles empty text", () => {
    expect(wrapLines("", 100, measure)).toEqual([]);
  });
});

describe("resolveFontStack", () => {
  const lookup = (name: string) => (name === "--font-geist-sans" ? "Geist Sans" : "");

  it("substitutes CSS variables for their computed family", () => {
    expect(resolveFontStack("var(--font-geist-sans), system-ui, sans-serif", lookup)).toBe(
      "Geist Sans, system-ui, sans-serif"
    );
  });

  it("drops variables that do not resolve", () => {
    expect(resolveFontStack("var(--nope), Georgia, serif", lookup)).toBe("Georgia, serif");
  });

  it("leaves plain stacks untouched", () => {
    expect(resolveFontStack("'Inter', system-ui, sans-serif", lookup)).toBe(
      "'Inter', system-ui, sans-serif"
    );
  });

  it("falls back to sans-serif when nothing resolves", () => {
    expect(resolveFontStack("var(--nope)", lookup)).toBe("sans-serif");
  });
});

describe("readableInk", () => {
  it("uses dark ink on light backgrounds", () => {
    expect(readableInk("#ffffff")).toBe("#111827");
    expect(readableInk("#f8f9fb")).toBe("#111827");
  });

  it("uses light ink on dark backgrounds", () => {
    expect(readableInk("#0b0b0c")).toBe("#ffffff");
    expect(readableInk("#2563eb")).toBe("#ffffff");
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("TypeSmith Mobile")).toBe("TM");
    expect(initials("Design Team Alpha")).toBe("DT");
  });

  it("falls back for empty names", () => {
    expect(initials("   ")).toBe("TS");
  });
});

describe("artboard sizes", () => {
  it("uses the standard social dimensions", () => {
    expect(ARTBOARDS.post).toMatchObject({ width: 1080, height: 1080 });
    expect(ARTBOARDS.story).toMatchObject({ width: 1080, height: 1920 });
    expect(ARTBOARDS.card).toMatchObject({ width: 1200, height: 630 });
  });
});
