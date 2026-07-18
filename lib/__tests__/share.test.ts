import { describe, it, expect } from "vitest";
import { encodeState, decodeState, buildShareUrl, DEFAULT_PROJECT } from "../share";

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

  it("builds an /editor?s= URL", () => {
    expect(buildShareUrl(DEFAULT_PROJECT)).toMatch(/^\/editor\?s=.+/);
  });
});
