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
  stepOverrides: "so",
  headingLeading: "hlh",
  bodyLeading: "blh",
  headingTracking: "htk",
  headingWeight: "hw",
  bodyWeight: "bw",
  fluidMinVw: "fnv",
  fluidMaxVw: "fxv",
  fluidMinScale: "fms",
  mutedColor: "mc",
  surfaceColor: "sfc",
  foreground: "fg",
  background: "bg",
  accent: "ac",
  headline: "hl",
  subhead: "sh",
  body: "bd",
  playground: "pg",
  mode: "md",
};

const REVERSE = Object.fromEntries(
  Object.entries(KEY_MAP).map(([full, short]) => [short, full])
) as Record<string, keyof ProjectState>;

function b64urlEncode(str: string): string {
  const b64 =
    typeof window === "undefined"
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

function pack(state: ProjectState): string {
  const packed: Packed = {};
  (Object.keys(KEY_MAP) as (keyof ProjectState)[]).forEach((k) => {
    packed[KEY_MAP[k]] = state[k];
  });
  return JSON.stringify(packed);
}

function unpack(json: string): Partial<ProjectState> {
  const packed = JSON.parse(json) as Packed;
  const out: Partial<ProjectState> = {};
  Object.entries(packed).forEach(([short, value]) => {
    const full = REVERSE[short];
    if (full) (out as Record<string, unknown>)[full] = value;
  });
  return out;
}

/** Legacy (uncompressed) encoding — kept so old share links keep working. */
export function encodeState(state: ProjectState): string {
  return b64urlEncode(pack(state));
}

export function decodeState(param: string): Partial<ProjectState> | null {
  try {
    return unpack(b64urlDecode(param));
  } catch {
    return null;
  }
}

// --- Compressed encoding ----------------------------------------------------
// Native deflate roughly halves the URL length. Params are versioned with a
// "1." prefix; anything else falls back to the legacy base64url JSON decoder,
// and browsers without CompressionStream keep emitting legacy links.

const COMPACT_PREFIX = "1.";

function bytesToB64url(bytes: Uint8Array): string {
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(bytes).toString("base64")
      : window.btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof window === "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  return Uint8Array.from(window.atob(b64), (c) => c.charCodeAt(0));
}

async function deflate(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

export async function encodeStateCompact(state: ProjectState): Promise<string> {
  const json = pack(state);
  if (typeof CompressionStream === "undefined") return b64urlEncode(json);
  try {
    return COMPACT_PREFIX + bytesToB64url(await deflate(json));
  } catch {
    return b64urlEncode(json);
  }
}

/** Decode either encoding: "1."-prefixed compressed or legacy base64url. */
export async function decodeStateCompat(param: string): Promise<Partial<ProjectState> | null> {
  if (param.startsWith(COMPACT_PREFIX)) {
    try {
      return unpack(await inflate(b64urlToBytes(param.slice(COMPACT_PREFIX.length))));
    } catch {
      return null;
    }
  }
  return decodeState(param);
}

/** Build a full shareable URL for the current origin (compressed encoding). */
export async function buildShareUrl(state: ProjectState): Promise<string> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${origin}${base}/editor?s=${await encodeStateCompact(state)}`;
}

export { DEFAULT_PROJECT };
