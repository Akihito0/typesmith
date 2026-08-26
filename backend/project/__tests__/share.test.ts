import { describe, it, expect } from "vitest";
import {
  encodeState,
  decodeState,
  encodeStateCompact,
  decodeStateCompat,
  buildShareUrl,
  DEFAULT_PROJECT,
} from "@/backend/project/share";

describe("share links", () => {
  it("round-trips the full project state", () => {
    const encoded = encodeState(DEFAULT_PROJECT);
    const decoded = decodeState(encoded);
    expect(decoded).toEqual(DEFAULT_PROJECT);
  });

  it("round-trips unicode preview text", () => {
    const state = { ...DEFAULT_PROJECT, previewText: "Tÿpogräphy — ✎ 活字" };
    expect(decodeState(encodeState(state))!.previewText).toBe("Tÿpogräphy — ✎ 活字");
  });

  it("produces a URL-safe param (no +, /, =)", () => {
    const encoded = encodeState(DEFAULT_PROJECT);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("returns null for garbage input instead of throwing", () => {
    expect(decodeState("!!!not-base64!!!")).toBeNull();
    expect(decodeState("")).toBeNull();
  });

  it("ignores unknown short keys", () => {
    const packed = Buffer.from(JSON.stringify({ pn: "X", zz: "junk" }), "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodeState(packed)).toEqual({ projectName: "X" });
  });

  it("builds an /editor?s= URL", async () => {
    expect(await buildShareUrl(DEFAULT_PROJECT)).toMatch(/^\/editor\?s=.+/);
  });

  it("compresses to a shorter param and round-trips", async () => {
    const compact = await encodeStateCompact(DEFAULT_PROJECT);
    expect(compact.startsWith("1.")).toBe(true);
    expect(compact.length).toBeLessThan(encodeState(DEFAULT_PROJECT).length);
    expect(await decodeStateCompat(compact)).toEqual(DEFAULT_PROJECT);
  });

  it("still decodes legacy uncompressed params", async () => {
    const legacy = encodeState(DEFAULT_PROJECT);
    expect(await decodeStateCompat(legacy)).toEqual(DEFAULT_PROJECT);
  });

  it("returns null for garbage compressed params", async () => {
    expect(await decodeStateCompat("1.!!!!")).toBeNull();
  });
});
