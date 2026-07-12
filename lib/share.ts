// Shareable links, per the proposal: the entire project state lives in the URL,
// so there's no database and hosting stays free. We compact the state to short
// keys, JSON-stringify, then base64url-encode into a `?s=` param.

import type { ProjectState } from "./store";
import { DEFAULT_PROJECT } from "./store";

type Packed = Record<string, unknown>;

const KEY_MAP: Record<keyof ProjectState, string> = {
  projectName: "pn",
  author: "au",
  headingFont: "hf",
  bodyFont: "bf",
  base: "bs",
  ratio: "rt",
  unit: "un",
  previewText: "pt",
  foreground: "fg",
  background: "bg",
  accent: "ac",
  headline: "hl",
  subhead: "sh",
  body: "bd",
  mode: "md",
};

const REVERSE = Object.fromEntries(
  Object.entries(KEY_MAP).map(([full, short]) => [short, full])
) as Record<string, keyof ProjectState>;

function b64urlEncode(str: string): string {
  const b64 = typeof window === "undefined"
    ? Buffer.from(str, "utf-8").toString("base64")
    : window.btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): string {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof window === "undefined") {
    return Buffer.from(b64, "base64").toString("utf-8");
  }
  return decodeURIComponent(escape(window.atob(b64)));
}

export function encodeState(state: ProjectState): string {
  const packed: Packed = {};
  (Object.keys(KEY_MAP) as (keyof ProjectState)[]).forEach((k) => {
    packed[KEY_MAP[k]] = state[k];
  });
  return b64urlEncode(JSON.stringify(packed));
}

export function decodeState(param: string): Partial<ProjectState> | null {
  try {
    const packed = JSON.parse(b64urlDecode(param)) as Packed;
    const out: Partial<ProjectState> = {};
    Object.entries(packed).forEach(([short, value]) => {
      const full = REVERSE[short];
      if (full) (out as Record<string, unknown>)[full] = value;
    });
    return out;
  } catch {
    return null;
  }
}

/** Build a full shareable URL for the current origin. */
export function buildShareUrl(state: ProjectState): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/editor?s=${encodeState(state)}`;
}

export { DEFAULT_PROJECT };
