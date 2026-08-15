// The playground is an infinite canvas, not a single artboard. Frames and text
// layers both live in unbounded canvas coordinates; a frame is just a painted
// rectangle that text can sit on (or next to). Membership is geometric — a
// layer belongs to the topmost frame whose bounds contain the layer's centre —
// so there is no parent/child bookkeeping to keep in sync while dragging.

export type PlaygroundTextAlign = "left" | "center" | "right";

export interface PlaygroundTextLayer {
  id: string;
  name: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontId: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  textAlign: PlaygroundTextAlign;
}

export interface PlaygroundFrame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
}

export interface PlaygroundDocument {
  frames: PlaygroundFrame[];
  layers: PlaygroundTextLayer[];
}

export interface PlaygroundRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PlaygroundAlignment = "left" | "center-x" | "right" | "top" | "center-y" | "bottom";
export type PlaygroundLayerMove = "forward" | "backward" | "front" | "back";
export type PlaygroundNodeType = "layer" | "frame";

export const MIN_LAYER_WIDTH = 40;
export const MIN_LAYER_HEIGHT = 24;
export const MIN_FRAME_SIZE = 160;
export const MAX_FRAME_SIZE = 4000;
export const MAX_FRAMES = 12;
export const MAX_LAYERS = 80;

const MAX_COORD = 20000;

export const DEFAULT_PLAYGROUND: PlaygroundDocument = {
  frames: [
    {
      id: "frame-hero",
      name: "Hero",
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
      background: "#f4f1ea",
    },
    {
      id: "frame-square",
      name: "Square",
      x: 1320,
      y: 0,
      width: 720,
      height: 720,
      background: "#111827",
    },
  ],
  layers: [
    {
      id: "playground-kicker",
      name: "Kicker",
      text: "TYPE STUDY / 01",
      x: 80,
      y: 76,
      width: 520,
      height: 36,
      fontId: "ibm-plex-mono",
      fontSize: 17,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: 0.14,
      color: "#2563eb",
      textAlign: "left",
    },
    {
      id: "playground-heading",
      name: "Headline",
      text: "Make type\nmove people.",
      x: 76,
      y: 154,
      width: 1040,
      height: 260,
      fontId: "space-grotesk",
      fontSize: 112,
      fontWeight: 700,
      lineHeight: 0.92,
      letterSpacing: -0.055,
      color: "#111827",
      textAlign: "left",
    },
    {
      id: "playground-body",
      name: "Body copy",
      text: "A freeform canvas for testing hierarchy, rhythm, contrast, and the tiny decisions that make a type system feel alive.",
      x: 80,
      y: 520,
      width: 610,
      height: 140,
      fontId: "inter",
      fontSize: 27,
      fontWeight: 400,
      lineHeight: 1.45,
      letterSpacing: -0.015,
      color: "#374151",
      textAlign: "left",
    },
    {
      id: "playground-note",
      name: "Canvas note",
      text: "DOUBLE-CLICK TO EDIT\nDRAG TO COMPOSE",
      x: 850,
      y: 615,
      width: 260,
      height: 72,
      fontId: "ibm-plex-mono",
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: 0.08,
      color: "#6b7280",
      textAlign: "right",
    },
    {
      id: "playground-square-mark",
      name: "Square headline",
      text: "Set it\nloose.",
      x: 1392,
      y: 200,
      width: 580,
      height: 300,
      fontId: "space-grotesk",
      fontSize: 118,
      fontWeight: 700,
      lineHeight: 0.94,
      letterSpacing: -0.05,
      color: "#f9fafb",
      textAlign: "left",
    },
    {
      id: "playground-square-note",
      name: "Square caption",
      text: "SECOND FRAME · SAME CANVAS",
      x: 1392,
      y: 552,
      width: 520,
      height: 32,
      fontId: "ibm-plex-mono",
      fontSize: 14,
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: 0.12,
      color: "#9ca3af",
      textAlign: "left",
    },
    {
      id: "playground-loose",
      name: "Loose note",
      text: "Text can live outside any frame — the canvas is infinite.",
      x: 80,
      y: 880,
      width: 900,
      height: 60,
      fontId: "inter",
      fontSize: 30,
      fontWeight: 500,
      lineHeight: 1.3,
      letterSpacing: -0.02,
      color: "#9ca3af",
      textAlign: "left",
    },
  ],
};

function finite(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function uid(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newPlaygroundLayerId(): string {
  return uid("text");
}

export function newPlaygroundFrameId(): string {
  return uid("frame");
}

export function createPlaygroundTextLayer(
  partial: Partial<PlaygroundTextLayer> = {}
): PlaygroundTextLayer {
  return {
    id: partial.id ?? newPlaygroundLayerId(),
    name: partial.name ?? "Text layer",
    text: partial.text ?? "New text layer",
    x: partial.x ?? 96,
    y: partial.y ?? 96,
    width: partial.width ?? 460,
    height: partial.height ?? 120,
    fontId: partial.fontId ?? "geist-sans",
    fontSize: partial.fontSize ?? 64,
    fontWeight: partial.fontWeight ?? 700,
    lineHeight: partial.lineHeight ?? 1.05,
    letterSpacing: partial.letterSpacing ?? -0.03,
    color: partial.color ?? "#111827",
    textAlign: partial.textAlign ?? "left",
  };
}

export function createPlaygroundFrame(partial: Partial<PlaygroundFrame> = {}): PlaygroundFrame {
  return {
    id: partial.id ?? newPlaygroundFrameId(),
    name: partial.name ?? "Frame",
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? 1200,
    height: partial.height ?? 800,
    background: partial.background ?? "#ffffff",
  };
}

function clampLayer(layer: PlaygroundTextLayer): PlaygroundTextLayer {
  return {
    ...layer,
    x: finite(layer.x, 0, -MAX_COORD, MAX_COORD),
    y: finite(layer.y, 0, -MAX_COORD, MAX_COORD),
    width: finite(layer.width, MIN_LAYER_WIDTH, MIN_LAYER_WIDTH, MAX_COORD),
    height: finite(layer.height, MIN_LAYER_HEIGHT, MIN_LAYER_HEIGHT, MAX_COORD),
  };
}

function clampFrame(frame: PlaygroundFrame): PlaygroundFrame {
  return {
    ...frame,
    x: finite(frame.x, 0, -MAX_COORD, MAX_COORD),
    y: finite(frame.y, 0, -MAX_COORD, MAX_COORD),
    width: finite(frame.width, MIN_FRAME_SIZE, MIN_FRAME_SIZE, MAX_FRAME_SIZE),
    height: finite(frame.height, MIN_FRAME_SIZE, MIN_FRAME_SIZE, MAX_FRAME_SIZE),
  };
}

export function rectOf(node: PlaygroundRect): PlaygroundRect {
  return { x: node.x, y: node.y, width: node.width, height: node.height };
}

function contains(frame: PlaygroundRect, x: number, y: number): boolean {
  return x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height;
}

export function rectsIntersect(a: PlaygroundRect, b: PlaygroundRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function rectContainsRect(outer: PlaygroundRect, inner: PlaygroundRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** The frame a layer belongs to: topmost frame containing the layer's centre. */
export function frameForLayer(
  document: PlaygroundDocument,
  layer: PlaygroundTextLayer
): PlaygroundFrame | null {
  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;
  for (let index = document.frames.length - 1; index >= 0; index -= 1) {
    if (contains(document.frames[index], cx, cy)) return document.frames[index];
  }
  return null;
}

export function layersInFrame(
  document: PlaygroundDocument,
  frameId: string
): PlaygroundTextLayer[] {
  return document.layers.filter((layer) => frameForLayer(document, layer)?.id === frameId);
}

export function looseLayers(document: PlaygroundDocument): PlaygroundTextLayer[] {
  return document.layers.filter((layer) => !frameForLayer(document, layer));
}

export function findPlaygroundNode(
  document: PlaygroundDocument,
  id: string
): { type: PlaygroundNodeType; node: PlaygroundTextLayer | PlaygroundFrame } | null {
  const layer = document.layers.find((item) => item.id === id);
  if (layer) return { type: "layer", node: layer };
  const frame = document.frames.find((item) => item.id === id);
  if (frame) return { type: "frame", node: frame };
  return null;
}

export function updatePlaygroundLayer(
  document: PlaygroundDocument,
  id: string,
  patch: Partial<PlaygroundTextLayer>
): PlaygroundDocument {
  return updatePlaygroundLayers(document, [id], patch);
}

export function updatePlaygroundLayers(
  document: PlaygroundDocument,
  ids: string[],
  patch: Partial<PlaygroundTextLayer>
): PlaygroundDocument {
  const targets = new Set(ids);
  return {
    ...document,
    layers: document.layers.map((layer) =>
      targets.has(layer.id) ? clampLayer({ ...layer, ...patch, id: layer.id }) : layer
    ),
  };
}

export function updatePlaygroundFrame(
  document: PlaygroundDocument,
  id: string,
  patch: Partial<PlaygroundFrame>
): PlaygroundDocument {
  return {
    ...document,
    frames: document.frames.map((frame) =>
      frame.id === id ? clampFrame({ ...frame, ...patch, id: frame.id }) : frame
    ),
  };
}

/** Apply a batch of geometry changes from one drag/resize gesture. */
export function patchPlaygroundNodes(
  document: PlaygroundDocument,
  patches: Record<string, Partial<PlaygroundRect>>
): PlaygroundDocument {
  return {
    frames: document.frames.map((frame) =>
      patches[frame.id] ? clampFrame({ ...frame, ...patches[frame.id] }) : frame
    ),
    layers: document.layers.map((layer) =>
      patches[layer.id] ? clampLayer({ ...layer, ...patches[layer.id] }) : layer
    ),
  };
}

/** Deleting a frame deletes the text sitting on it, as in Figma. */
export function removePlaygroundNodes(
  document: PlaygroundDocument,
  ids: string[]
): PlaygroundDocument {
  const doomed = new Set(ids);
  document.frames.forEach((frame) => {
    if (!doomed.has(frame.id)) return;
    layersInFrame(document, frame.id).forEach((layer) => doomed.add(layer.id));
  });
  return {
    frames: document.frames.filter((frame) => !doomed.has(frame.id)),
    layers: document.layers.filter((layer) => !doomed.has(layer.id)),
  };
}

export function duplicatePlaygroundNodes(
  document: PlaygroundDocument,
  ids: string[],
  offset = 32
): { document: PlaygroundDocument; ids: string[] } {
  const wanted = new Set(ids);
  const copiedLayerIds = new Set<string>();
  const frames = [...document.frames];
  const layers = [...document.layers];
  const created: string[] = [];

  // Frame membership is geometric, so a duplicate dropped on top of a
  // neighbouring frame would silently adopt that frame's text. Park copies
  // clear of everything instead.
  const bounds = playgroundBounds(document);
  let cursorX = bounds.x + bounds.width + 120;

  document.frames.forEach((frame) => {
    if (!wanted.has(frame.id) || frames.length >= MAX_FRAMES) return;
    const dx = cursorX - frame.x;
    cursorX += frame.width + 120;
    const copy = {
      ...frame,
      id: newPlaygroundFrameId(),
      name: `${frame.name} copy`,
      x: frame.x + dx,
    };
    frames.push(copy);
    created.push(copy.id);
    layersInFrame(document, frame.id).forEach((layer) => {
      if (layers.length >= MAX_LAYERS) return;
      copiedLayerIds.add(layer.id);
      layers.push({ ...layer, id: newPlaygroundLayerId(), x: layer.x + dx });
    });
  });

  document.layers.forEach((layer) => {
    if (!wanted.has(layer.id) || copiedLayerIds.has(layer.id) || layers.length >= MAX_LAYERS)
      return;
    const copy = {
      ...layer,
      id: newPlaygroundLayerId(),
      name: `${layer.name} copy`,
      x: layer.x + offset,
      y: layer.y + offset,
    };
    layers.push(copy);
    created.push(copy.id);
  });

  return { document: { frames, layers }, ids: created };
}

export function reorderPlaygroundLayer(
  document: PlaygroundDocument,
  id: string,
  move: PlaygroundLayerMove
): PlaygroundDocument {
  const from = document.layers.findIndex((layer) => layer.id === id);
  if (from < 0) return document;
  const last = document.layers.length - 1;
  const to =
    move === "front"
      ? last
      : move === "back"
        ? 0
        : move === "forward"
          ? Math.min(last, from + 1)
          : Math.max(0, from - 1);
  if (from === to) return document;
  const layers = [...document.layers];
  const [layer] = layers.splice(from, 1);
  layers.splice(to, 0, layer);
  return { ...document, layers };
}

/** Align a layer inside the frame it sits on. Loose layers have nothing to
 * align to, so they are left alone. */
export function alignPlaygroundLayer(
  document: PlaygroundDocument,
  id: string,
  alignment: PlaygroundAlignment
): PlaygroundDocument {
  const layer = document.layers.find((item) => item.id === id);
  if (!layer) return document;
  const frame = frameForLayer(document, layer);
  if (!frame) return document;
  const patch: Partial<PlaygroundTextLayer> = {};
  if (alignment === "left") patch.x = frame.x;
  if (alignment === "center-x") patch.x = frame.x + (frame.width - layer.width) / 2;
  if (alignment === "right") patch.x = frame.x + frame.width - layer.width;
  if (alignment === "top") patch.y = frame.y;
  if (alignment === "center-y") patch.y = frame.y + (frame.height - layer.height) / 2;
  if (alignment === "bottom") patch.y = frame.y + frame.height - layer.height;
  return updatePlaygroundLayer(document, id, patch);
}

export function resizePlaygroundFrame(
  document: PlaygroundDocument,
  id: string,
  width: number,
  height: number
): PlaygroundDocument {
  return updatePlaygroundFrame(document, id, { width, height });
}

function unionRects(rects: PlaygroundRect[]): PlaygroundRect | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Bounding box of everything on the canvas — used for zoom-to-fit and export. */
export function playgroundBounds(document: PlaygroundDocument): PlaygroundRect {
  return (
    unionRects([...document.frames.map(rectOf), ...document.layers.map(rectOf)]) ?? {
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
    }
  );
}

export function playgroundNodesBounds(
  document: PlaygroundDocument,
  ids: string[]
): PlaygroundRect | null {
  const wanted = new Set(ids);
  return unionRects(
    [...document.frames, ...document.layers].filter((node) => wanted.has(node.id)).map(rectOf)
  );
}

/** Where a new frame should land: to the right of everything already placed. */
export function nextFrameOrigin(document: PlaygroundDocument): { x: number; y: number } {
  if (document.frames.length === 0) return { x: 0, y: 0 };
  const bounds = playgroundBounds(document);
  return { x: bounds.x + bounds.width + 120, y: document.frames[0].y };
}

function normalizeFrame(raw: unknown, fallback: PlaygroundFrame): PlaygroundFrame {
  const item = (raw ?? {}) as Partial<PlaygroundFrame>;
  return clampFrame({
    id: text(item.id, newPlaygroundFrameId()),
    name: text(item.name, fallback.name),
    x: finite(item.x, fallback.x, -MAX_COORD, MAX_COORD),
    y: finite(item.y, fallback.y, -MAX_COORD, MAX_COORD),
    width: finite(item.width, fallback.width, MIN_FRAME_SIZE, MAX_FRAME_SIZE),
    height: finite(item.height, fallback.height, MIN_FRAME_SIZE, MAX_FRAME_SIZE),
    background: isHex(item.background) ? item.background : fallback.background,
  });
}

function normalizeLayer(raw: unknown, fallback: PlaygroundTextLayer): PlaygroundTextLayer {
  const item = (raw ?? {}) as Partial<PlaygroundTextLayer>;
  const align: PlaygroundTextAlign = ["left", "center", "right"].includes(item.textAlign as string)
    ? (item.textAlign as PlaygroundTextAlign)
    : fallback.textAlign;
  return clampLayer({
    id: text(item.id, newPlaygroundLayerId()),
    name: text(item.name, fallback.name),
    text: text(item.text, fallback.text),
    x: finite(item.x, fallback.x, -MAX_COORD, MAX_COORD),
    y: finite(item.y, fallback.y, -MAX_COORD, MAX_COORD),
    width: finite(item.width, fallback.width, MIN_LAYER_WIDTH, MAX_COORD),
    height: finite(item.height, fallback.height, MIN_LAYER_HEIGHT, MAX_COORD),
    fontId: text(item.fontId, fallback.fontId),
    fontSize: finite(item.fontSize, fallback.fontSize, 8, 400),
    fontWeight: finite(item.fontWeight, fallback.fontWeight, 100, 900),
    lineHeight: finite(item.lineHeight, fallback.lineHeight, 0.7, 3),
    letterSpacing: finite(item.letterSpacing, fallback.letterSpacing, -0.2, 1),
    color: isHex(item.color) ? item.color : fallback.color,
    textAlign: align,
  });
}

function clonedDefault(): PlaygroundDocument {
  return {
    frames: DEFAULT_PLAYGROUND.frames.map((frame) => ({ ...frame })),
    layers: DEFAULT_PLAYGROUND.layers.map((layer) => ({ ...layer })),
  };
}

/** Legacy documents were a single artboard (`{ width, height, background }`)
 * with layers positioned inside it. Those coordinates are already canvas
 * coordinates once the artboard becomes a frame at the origin. */
export function normalizePlayground(value: unknown): PlaygroundDocument {
  if (!value || typeof value !== "object") return clonedDefault();
  const raw = value as Partial<PlaygroundDocument> & {
    width?: unknown;
    height?: unknown;
    background?: unknown;
  };

  const rawFrames = Array.isArray(raw.frames)
    ? raw.frames.slice(0, MAX_FRAMES)
    : raw.width !== undefined || raw.height !== undefined
      ? [
          {
            id: "frame-artboard",
            name: "Artboard",
            x: 0,
            y: 0,
            width: raw.width,
            height: raw.height,
            background: raw.background,
          },
        ]
      : DEFAULT_PLAYGROUND.frames;

  const frames = rawFrames.map((frame, index) =>
    normalizeFrame(frame, DEFAULT_PLAYGROUND.frames[index] ?? createPlaygroundFrame())
  );

  const rawLayers = Array.isArray(raw.layers)
    ? raw.layers.slice(0, MAX_LAYERS)
    : DEFAULT_PLAYGROUND.layers;
  const layers = rawLayers
    .filter((item) => Boolean(item && typeof item === "object"))
    .map((item, index) =>
      normalizeLayer(item, DEFAULT_PLAYGROUND.layers[index] ?? createPlaygroundTextLayer())
    );

  return { frames, layers };
}
