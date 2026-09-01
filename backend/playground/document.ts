// The playground is an infinite canvas, not a single artboard. Frames and text
// layers both live in unbounded canvas coordinates; a frame is just a painted
// shape that text can sit on (or next to). Membership is geometric — a layer
// belongs to the topmost frame whose shape contains the layer's centre — so
// there is no parent/child bookkeeping to keep in sync while dragging.
//
// Nothing here is fixed-size: frames are drawn at whatever size the pointer
// describes, resize from any of eight handles, and can be a rectangle (with
// any corner radius) or an ellipse. The presets in the inspector are shortcuts,
// never the set of allowed shapes.

export type PlaygroundTextAlign = "left" | "center" | "right";
export type PlaygroundShape = "rectangle" | "ellipse";
export const PLAYGROUND_SHAPES: PlaygroundShape[] = ["rectangle", "ellipse"];

/** What every node carries, whatever its kind. */
export interface PlaygroundNodeBase {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees clockwise about the node's own centre. */
  rotation: number;
  /** 0–1, applied to the whole node — fill and text alike. */
  opacity: number;
  /** Locked nodes still render, but ignore pointer input and marquee. */
  locked: boolean;
  hidden: boolean;
}

export interface PlaygroundTextLayer extends PlaygroundNodeBase {
  text: string;
  fontId: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  textAlign: PlaygroundTextAlign;
}

export interface PlaygroundFrame extends PlaygroundNodeBase {
  background: string;
  shape: PlaygroundShape;
  /** Corner radius in px. Ignored while `shape` is "ellipse". */
  radius: number;
}

export type PlaygroundNode = PlaygroundTextLayer | PlaygroundFrame;

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
export type PlaygroundDistribute = "horizontal" | "vertical";

/** One alignment line, drawn while a drag is snapped to something. */
export interface PlaygroundGuide {
  axis: "x" | "y";
  /** Canvas coordinate of the line on the axis it is perpendicular to. */
  position: number;
  /** Extent along the other axis, so the line spans both nodes. */
  start: number;
  end: number;
}

/** How close (canvas px) an edge must come before it snaps. */
export const SNAP_TOLERANCE = 6;

/** Every edge and corner resizes, so a frame is free in one axis or both. */
export type PlaygroundHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export const PLAYGROUND_HANDLES: PlaygroundHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

// Floors exist only so a node can't collapse to something unclickable, and
// ceilings only so a stray drag can't push geometry out to infinity. Between
// them any size is fair game — there is no preset list to conform to.
export const MIN_LAYER_WIDTH = 8;
export const MIN_LAYER_HEIGHT = 8;
export const MIN_FRAME_SIZE = 8;
export const MAX_FRAME_SIZE = 20000;
export const MAX_FRAMES = 60;
export const MAX_LAYERS = 300;

const MAX_COORD = 20000;

// Declared as partials and built through the factories, so a new node
// property picks up its default here too instead of having to be added to
// every literal below.
const DEFAULT_FRAMES: Partial<PlaygroundFrame>[] = [
  {
    id: "frame-hero",
    name: "Hero",
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
    background: "#f4f1ea",
    shape: "rectangle",
    radius: 0,
  },
  {
    id: "frame-square",
    name: "Square",
    x: 1320,
    y: 0,
    width: 720,
    height: 720,
    background: "#111827",
    shape: "rectangle",
    radius: 24,
  },
];

const DEFAULT_LAYERS: Partial<PlaygroundTextLayer>[] = [
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
];

export const DEFAULT_PLAYGROUND: PlaygroundDocument = {
  frames: DEFAULT_FRAMES.map((frame) => createPlaygroundFrame(frame)),
  layers: DEFAULT_LAYERS.map((layer) => createPlaygroundTextLayer(layer)),
};

function finite(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

/** Rotation wraps rather than clamps, so 370 and -350 mean the same thing. */
function normalizeRotation(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const wrapped = ((value % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
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
    // Normalised here, not just in the clamps, so a node is never constructed
    // with a rotation or opacity the rest of the code would have to re-check.
    rotation: normalizeRotation(partial.rotation ?? 0),
    opacity: finite(partial.opacity, 1, 0, 1),
    locked: partial.locked ?? false,
    hidden: partial.hidden ?? false,
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
    shape: partial.shape ?? "rectangle",
    radius: partial.radius ?? 0,
    // Normalised here, not just in the clamps, so a node is never constructed
    // with a rotation or opacity the rest of the code would have to re-check.
    rotation: normalizeRotation(partial.rotation ?? 0),
    opacity: finite(partial.opacity, 1, 0, 1),
    locked: partial.locked ?? false,
    hidden: partial.hidden ?? false,
  };
}

function clampLayer(layer: PlaygroundTextLayer): PlaygroundTextLayer {
  return {
    ...layer,
    rotation: normalizeRotation(layer.rotation),
    opacity: finite(layer.opacity, 1, 0, 1),
    locked: layer.locked === true,
    hidden: layer.hidden === true,
    x: finite(layer.x, 0, -MAX_COORD, MAX_COORD),
    y: finite(layer.y, 0, -MAX_COORD, MAX_COORD),
    width: finite(layer.width, MIN_LAYER_WIDTH, MIN_LAYER_WIDTH, MAX_COORD),
    height: finite(layer.height, MIN_LAYER_HEIGHT, MIN_LAYER_HEIGHT, MAX_COORD),
  };
}

function clampFrame(frame: PlaygroundFrame): PlaygroundFrame {
  const width = finite(frame.width, MIN_FRAME_SIZE, MIN_FRAME_SIZE, MAX_FRAME_SIZE);
  const height = finite(frame.height, MIN_FRAME_SIZE, MIN_FRAME_SIZE, MAX_FRAME_SIZE);
  return {
    ...frame,
    x: finite(frame.x, 0, -MAX_COORD, MAX_COORD),
    y: finite(frame.y, 0, -MAX_COORD, MAX_COORD),
    width,
    height,
    rotation: normalizeRotation(frame.rotation),
    opacity: finite(frame.opacity, 1, 0, 1),
    locked: frame.locked === true,
    hidden: frame.hidden === true,
    shape: frame.shape === "ellipse" ? "ellipse" : "rectangle",
    // A radius past half the short side just rounds the shape fully, so cap it
    // there rather than letting the number drift away from what's drawn.
    radius: finite(frame.radius, 0, 0, Math.min(width, height) / 2),
  };
}

export function rectOf(node: PlaygroundRect): PlaygroundRect {
  return { x: node.x, y: node.y, width: node.width, height: node.height };
}

/** Point-in-frame, honouring the frame's shape so an ellipse doesn't claim
 * text sitting in the corner of its bounding box. */
function contains(frame: PlaygroundFrame, x: number, y: number): boolean {
  const withinBox =
    x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height;
  if (!withinBox || frame.shape !== "ellipse") return withinBox;
  const rx = frame.width / 2;
  const ry = frame.height / 2;
  if (rx === 0 || ry === 0) return false;
  const nx = (x - (frame.x + rx)) / rx;
  const ny = (y - (frame.y + ry)) / ry;
  return nx * nx + ny * ny <= 1;
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

/** Turn two pointer positions into a rect. Dragging in any direction works —
 * the anchor is wherever the gesture started, not the top-left. `square`
 * (Shift) locks the two axes together; `fromCenter` (Alt) grows out of the
 * anchor point instead of away from it. */
export function drawnRect(
  anchorX: number,
  anchorY: number,
  pointerX: number,
  pointerY: number,
  options: { square?: boolean; fromCenter?: boolean; minWidth?: number; minHeight?: number } = {}
): PlaygroundRect {
  const minWidth = options.minWidth ?? 1;
  const minHeight = options.minHeight ?? 1;
  let dx = pointerX - anchorX;
  let dy = pointerY - anchorY;

  if (options.square) {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * side;
    dy = Math.sign(dy || 1) * side;
  }

  const width = Math.max(minWidth, Math.abs(dx) * (options.fromCenter ? 2 : 1));
  const height = Math.max(minHeight, Math.abs(dy) * (options.fromCenter ? 2 : 1));
  const x = options.fromCenter ? anchorX - width / 2 : Math.min(anchorX, anchorX + dx);
  const y = options.fromCenter ? anchorY - height / 2 : Math.min(anchorY, anchorY + dy);

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export interface ResizeOptions {
  minWidth?: number;
  minHeight?: number;
  /** Shift: keep the starting aspect ratio. Off by default — free by default. */
  aspect?: boolean;
  /** Alt: resize around the centre instead of the opposite edge. */
  fromCenter?: boolean;
}

/** Apply one resize drag to a rect. Any of the eight handles may be dragged,
 * and width and height are independent unless `aspect` asks otherwise. */
export function resizePlaygroundRect(
  origin: PlaygroundRect,
  handle: PlaygroundHandle,
  dx: number,
  dy: number,
  options: ResizeOptions = {}
): PlaygroundRect {
  const minWidth = options.minWidth ?? MIN_LAYER_WIDTH;
  const minHeight = options.minHeight ?? MIN_LAYER_HEIGHT;
  const west = handle.includes("w");
  const east = handle.includes("e");
  const north = handle.includes("n");
  const south = handle.includes("s");
  const factor = options.fromCenter ? 2 : 1;

  let width = origin.width;
  let height = origin.height;
  if (east) width = origin.width + dx * factor;
  if (west) width = origin.width - dx * factor;
  if (south) height = origin.height + dy * factor;
  if (north) height = origin.height - dy * factor;

  if (options.aspect && origin.width > 0 && origin.height > 0) {
    const ratio = origin.width / origin.height;
    if ((east || west) && (north || south)) {
      // Corner: let whichever axis the pointer pushed hardest drive the other.
      const drivenByWidth =
        Math.abs(width - origin.width) * origin.height >=
        Math.abs(height - origin.height) * origin.width;
      if (drivenByWidth) height = width / ratio;
      else width = height * ratio;
    } else if (east || west) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }
  }

  width = Math.max(minWidth, width);
  height = Math.max(minHeight, height);

  const x = options.fromCenter
    ? origin.x + (origin.width - width) / 2
    : west
      ? origin.x + origin.width - width
      : origin.x;
  const y = options.fromCenter
    ? origin.y + (origin.height - height) / 2
    : north
      ? origin.y + origin.height - height
      : origin.y;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** Axis-aligned box that a rotated rect actually occupies. Used for
 * zoom-to-fit and export, so a turned node isn't cropped. */
export function rotatedBounds(rect: PlaygroundRect, rotation: number): PlaygroundRect {
  if (!rotation) return rectOf(rect);
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const width = rect.width * cos + rect.height * sin;
  const height = rect.width * sin + rect.height * cos;
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

/** Turn a screen-space drag into the node's own axes, so a rotated node
 * resizes along its own edges rather than the canvas's. */
export function rotateDelta(dx: number, dy: number, rotation: number): { dx: number; dy: number } {
  if (!rotation) return { dx, dy };
  const radians = (-rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { dx: dx * cos - dy * sin, dy: dx * sin + dy * cos };
}

const EDGES = ["start", "center", "end"] as const;

function axisPoints(rect: PlaygroundRect, axis: "x" | "y"): Record<string, number> {
  const origin = axis === "x" ? rect.x : rect.y;
  const size = axis === "x" ? rect.width : rect.height;
  return { start: origin, center: origin + size / 2, end: origin + size };
}

/** Nudge a dragged rect onto the nearest edge or centre of anything else on the
 * canvas, and report the lines to draw for it. Each axis snaps independently,
 * and only within `tolerance` — beyond that the pointer wins. */
export function snapRect(
  rect: PlaygroundRect,
  targets: PlaygroundRect[],
  tolerance = SNAP_TOLERANCE
): { rect: PlaygroundRect; guides: PlaygroundGuide[] } {
  const guides: PlaygroundGuide[] = [];
  const offset = { x: 0, y: 0 };

  (["x", "y"] as const).forEach((axis) => {
    const moving = axisPoints(rect, axis);
    let best: { delta: number; position: number; target: PlaygroundRect } | null = null;

    targets.forEach((target) => {
      const fixed = axisPoints(target, axis);
      EDGES.forEach((movingEdge) => {
        EDGES.forEach((targetEdge) => {
          const delta = fixed[targetEdge] - moving[movingEdge];
          if (Math.abs(delta) > tolerance) return;
          if (best && Math.abs(delta) >= Math.abs(best.delta)) return;
          best = { delta, position: fixed[targetEdge], target };
        });
      });
    });

    if (!best) return;
    const hit = best as { delta: number; position: number; target: PlaygroundRect };
    offset[axis] = hit.delta;
    // The guide runs along the *other* axis, spanning both rects so the
    // relationship it represents is visible.
    const other = axis === "x" ? "y" : "x";
    const size = other === "x" ? "width" : "height";
    guides.push({
      axis,
      position: hit.position,
      start: Math.min(rect[other], hit.target[other]),
      end: Math.max(rect[other] + rect[size], hit.target[other] + hit.target[size]),
    });
  });

  return {
    rect: { ...rect, x: rect.x + offset.x, y: rect.y + offset.y },
    guides,
  };
}

/** Every node's rect except the ones being dragged — the things worth
 * snapping to. Hidden nodes are not on screen, so they don't attract. */
export function snapTargets(document: PlaygroundDocument, excludeIds: string[]): PlaygroundRect[] {
  const excluded = new Set(excludeIds);
  return [...document.frames, ...document.layers]
    .filter((node) => !excluded.has(node.id) && !node.hidden)
    .map(rectOf);
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

/** Align a multi-selection to its own bounding box — the Figma behaviour when
 * more than one thing is selected. A single layer instead aligns to the frame
 * it sits on, which is what `alignPlaygroundLayer` does. */
export function alignPlaygroundNodes(
  document: PlaygroundDocument,
  ids: string[],
  alignment: PlaygroundAlignment
): PlaygroundDocument {
  if (ids.length === 1) return alignPlaygroundLayer(document, ids[0], alignment);
  const bounds = playgroundNodesBounds(document, ids);
  if (!bounds || ids.length === 0) return document;

  const patches: Record<string, Partial<PlaygroundRect>> = {};
  const place = (node: PlaygroundNodeBase) => {
    if (node.locked) return;
    if (alignment === "left") patches[node.id] = { x: bounds.x };
    if (alignment === "center-x")
      patches[node.id] = { x: bounds.x + (bounds.width - node.width) / 2 };
    if (alignment === "right") patches[node.id] = { x: bounds.x + bounds.width - node.width };
    if (alignment === "top") patches[node.id] = { y: bounds.y };
    if (alignment === "center-y")
      patches[node.id] = { y: bounds.y + (bounds.height - node.height) / 2 };
    if (alignment === "bottom") patches[node.id] = { y: bounds.y + bounds.height - node.height };
  };

  const wanted = new Set(ids);
  document.frames.forEach((frame) => wanted.has(frame.id) && place(frame));
  document.layers.forEach((layer) => wanted.has(layer.id) && place(layer));
  return patchPlaygroundNodes(document, patches);
}

/** Even the gaps between three or more nodes, leaving the outermost two put. */
export function distributePlaygroundNodes(
  document: PlaygroundDocument,
  ids: string[],
  axis: PlaygroundDistribute
): PlaygroundDocument {
  const wanted = new Set(ids);
  const nodes: PlaygroundNodeBase[] = [...document.frames, ...document.layers].filter((node) =>
    wanted.has(node.id)
  );
  if (nodes.length < 3) return document;

  const along = axis === "horizontal" ? "x" : "y";
  const size = axis === "horizontal" ? "width" : "height";
  const sorted = [...nodes].sort((a, b) => a[along] - b[along]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = last[along] + last[size] - first[along];
  const occupied = sorted.reduce((total, node) => total + node[size], 0);
  const gap = (span - occupied) / (sorted.length - 1);

  const patches: Record<string, Partial<PlaygroundRect>> = {};
  let cursor = first[along] + first[size] + gap;
  sorted.slice(1, -1).forEach((node) => {
    if (!node.locked) patches[node.id] = { [along]: Math.round(cursor) } as Partial<PlaygroundRect>;
    cursor += node[size] + gap;
  });
  return patchPlaygroundNodes(document, patches);
}

/** Patch properties every node shares — rotation, opacity, name — across a
 * mixed selection, clamping as it goes. Geometry belongs in
 * `patchPlaygroundNodes`; this is for the rest of the base shape. */
export function updatePlaygroundNodes(
  document: PlaygroundDocument,
  ids: string[],
  patch: Partial<Pick<PlaygroundNodeBase, "rotation" | "opacity" | "name">>
): PlaygroundDocument {
  const wanted = new Set(ids);
  return {
    frames: document.frames.map((frame) =>
      wanted.has(frame.id) ? clampFrame({ ...frame, ...patch }) : frame
    ),
    layers: document.layers.map((layer) =>
      wanted.has(layer.id) ? clampLayer({ ...layer, ...patch }) : layer
    ),
  };
}

/** Toggle lock/hide on any mix of frames and text. */
export function setPlaygroundNodeFlags(
  document: PlaygroundDocument,
  ids: string[],
  patch: { locked?: boolean; hidden?: boolean }
): PlaygroundDocument {
  const wanted = new Set(ids);
  const apply = <T extends PlaygroundNodeBase>(node: T): T =>
    wanted.has(node.id) ? { ...node, ...patch } : node;
  return {
    frames: document.frames.map(apply),
    layers: document.layers.map(apply),
  };
}

/** Reorder either kind of node. Frames paint under text, so the two lists are
 * ordered independently — a frame can only move among frames. */
export function reorderPlaygroundNode(
  document: PlaygroundDocument,
  id: string,
  move: PlaygroundLayerMove
): PlaygroundDocument {
  if (document.layers.some((layer) => layer.id === id)) {
    return reorderPlaygroundLayer(document, id, move);
  }
  const from = document.frames.findIndex((frame) => frame.id === id);
  if (from < 0) return document;
  const last = document.frames.length - 1;
  const to =
    move === "front"
      ? last
      : move === "back"
        ? 0
        : move === "forward"
          ? Math.min(last, from + 1)
          : Math.max(0, from - 1);
  if (from === to) return document;
  const frames = [...document.frames];
  const [frame] = frames.splice(from, 1);
  frames.splice(to, 0, frame);
  return { ...document, frames };
}

/** Copy the selection out of the document, for a later paste. Copying a frame
 * takes the text sitting on it, matching what deleting a frame removes. */
export function copyPlaygroundNodes(
  document: PlaygroundDocument,
  ids: string[]
): { frames: PlaygroundFrame[]; layers: PlaygroundTextLayer[] } {
  const wanted = new Set(ids);
  const frames = document.frames.filter((frame) => wanted.has(frame.id));
  const carried = new Set<string>();
  frames.forEach((frame) =>
    layersInFrame(document, frame.id).forEach((layer) => carried.add(layer.id))
  );
  const layers = document.layers.filter((layer) => wanted.has(layer.id) || carried.has(layer.id));
  return {
    frames: frames.map((frame) => ({ ...frame })),
    layers: layers.map((layer) => ({ ...layer })),
  };
}

/** Paste a clipboard back in, offset so the copy is visible and selectable,
 * with fresh ids. Respects the document's node ceilings. */
export function pastePlaygroundNodes(
  document: PlaygroundDocument,
  clipboard: { frames: PlaygroundFrame[]; layers: PlaygroundTextLayer[] },
  offset = 32
): { document: PlaygroundDocument; ids: string[] } {
  const frames = [...document.frames];
  const layers = [...document.layers];
  const created: string[] = [];

  clipboard.frames.forEach((frame) => {
    if (frames.length >= MAX_FRAMES) return;
    const copy = clampFrame({
      ...frame,
      id: newPlaygroundFrameId(),
      x: frame.x + offset,
      y: frame.y + offset,
    });
    frames.push(copy);
    created.push(copy.id);
  });

  clipboard.layers.forEach((layer) => {
    if (layers.length >= MAX_LAYERS) return;
    const copy = clampLayer({
      ...layer,
      id: newPlaygroundLayerId(),
      x: layer.x + offset,
      y: layer.y + offset,
    });
    layers.push(copy);
    created.push(copy.id);
  });

  return { document: { frames, layers }, ids: created };
}

export function resizePlaygroundFrame(
  document: PlaygroundDocument,
  id: string,
  width: number,
  height: number
): PlaygroundDocument {
  return updatePlaygroundFrame(document, id, { width, height });
}

/** Shrink or grow a frame to hug the text sitting on it, plus padding. Lets a
 * frame take a size that came out of the composition rather than a preset. An
 * empty frame has nothing to hug, so it is left alone. */
export function fitFrameToContents(
  document: PlaygroundDocument,
  id: string,
  padding = 48
): PlaygroundDocument {
  const frame = document.frames.find((item) => item.id === id);
  if (!frame) return document;
  const contents = unionRects(layersInFrame(document, id).map(rectOf));
  if (!contents) return document;
  return updatePlaygroundFrame(document, id, {
    x: Math.round(contents.x - padding),
    y: Math.round(contents.y - padding),
    width: Math.round(contents.width + padding * 2),
    height: Math.round(contents.height + padding * 2),
  });
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
  const boxes = [...document.frames, ...document.layers].map((node) =>
    rotatedBounds(node, node.rotation)
  );
  return (
    unionRects(boxes) ?? {
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
    [...document.frames, ...document.layers]
      .filter((node) => wanted.has(node.id))
      .map((node) => rotatedBounds(node, node.rotation))
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
    shape: item.shape === "ellipse" ? "ellipse" : "rectangle",
    radius: finite(item.radius, fallback.radius ?? 0, 0, MAX_FRAME_SIZE),
    rotation: normalizeRotation(item.rotation),
    opacity: finite(item.opacity, fallback.opacity ?? 1, 0, 1),
    locked: item.locked === true,
    hidden: item.hidden === true,
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
    rotation: normalizeRotation(item.rotation),
    opacity: finite(item.opacity, fallback.opacity ?? 1, 0, 1),
    locked: item.locked === true,
    hidden: item.hidden === true,
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
