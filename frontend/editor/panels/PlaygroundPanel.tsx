"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  CursorIcon,
  DuplicateIcon,
  EllipseIcon,
  FrameIcon,
  KeyboardIcon,
  MagnetIcon,
  Segmented,
  Select,
  TextIcon,
  TrashIcon,
} from "@/frontend/ui";
import { FontPicker } from "@/frontend/editor/FontPicker";
import { fontById } from "@/backend/fonts/catalog";
import { ensureGoogleFont, gfFamilyFromId } from "@/backend/fonts/google";
import {
  MAX_FRAMES,
  MAX_FRAME_SIZE,
  MAX_LAYERS,
  MIN_FRAME_SIZE,
  MIN_LAYER_HEIGHT,
  MIN_LAYER_WIDTH,
  PLAYGROUND_HANDLES,
  createPlaygroundFrame,
  createPlaygroundTextLayer,
  alignPlaygroundNodes,
  copyPlaygroundNodes,
  distributePlaygroundNodes,
  drawnRect,
  duplicatePlaygroundNodes,
  fitFrameToContents,
  layersInFrame,
  pastePlaygroundNodes,
  looseLayers,
  patchPlaygroundNodes,
  playgroundBounds,
  playgroundNodesBounds,
  rectContainsRect,
  rectOf,
  rectsIntersect,
  removePlaygroundNodes,
  reorderPlaygroundNode,
  resizePlaygroundRect,
  rotateDelta,
  setPlaygroundNodeFlags,
  snapRect,
  snapTargets,
  updatePlaygroundFrame,
  updatePlaygroundLayers,
  updatePlaygroundNodes,
  type PlaygroundAlignment,
  type PlaygroundDistribute,
  type PlaygroundDocument,
  type PlaygroundFrame,
  type PlaygroundGuide,
  type PlaygroundHandle,
  type PlaygroundLayerMove,
  type PlaygroundNodeBase,
  type PlaygroundRect,
  type PlaygroundShape,
  type PlaygroundTextAlign,
  type PlaygroundTextLayer,
} from "@/backend/playground/document";
import { exportPlaygroundPng } from "@/backend/playground/export";
import { useProject } from "@/backend/project/store";

const ZOOM_MIN = 0.05;
const ZOOM_MAX = 4;
const FIT_PADDING = 72;

// Shortcuts, not a menu of allowed sizes — a frame keeps whatever width and
// height it was drawn or dragged to, and reports "Custom" for it.
const FRAME_SIZES = [
  { label: "Landscape · 1200 × 800", width: 1200, height: 800 },
  { label: "Square · 1080 × 1080", width: 1080, height: 1080 },
  { label: "Presentation · 1200 × 675", width: 1200, height: 675 },
  { label: "Story · 1080 × 1920", width: 1080, height: 1920 },
  { label: "Poster · 800 × 1000", width: 800, height: 1000 },
];

const TOOLS = [
  { label: "Move", value: "move" as const, key: "V", Icon: CursorIcon },
  { label: "Text", value: "text" as const, key: "T", Icon: TextIcon },
  { label: "Frame", value: "frame" as const, key: "F", Icon: FrameIcon },
  { label: "Ellipse", value: "ellipse" as const, key: "O", Icon: EllipseIcon },
];

/** Grouped for the shortcuts sheet behind the dock's ⌨ button. */
const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  {
    group: "Tools",
    items: [
      ["V", "Move"],
      ["T", "Text"],
      ["F", "Frame"],
      ["O", "Ellipse"],
      ["S", "Toggle snapping"],
    ],
  },
  {
    group: "Canvas",
    items: [
      ["Scroll", "Pan"],
      ["⌘ / ctrl + scroll", "Zoom"],
      ["Space + drag", "Grab"],
      ["1", "Zoom to fit"],
      ["2", "Zoom to selection"],
    ],
  },
  {
    group: "Drawing",
    items: [
      ["⇧ drag", "Square / keep ratio"],
      ["⌥ drag", "From the centre"],
      ["⌥ drag node", "Duplicate"],
      ["⌘ / ctrl drag", "Ignore snapping"],
      ["Esc", "Cancel"],
    ],
  },
  {
    group: "Editing",
    items: [
      ["⌘C / ⌘X / ⌘V", "Copy, cut, paste"],
      ["⌘D", "Duplicate"],
      ["⌘⇧L", "Lock"],
      ["⌘⇧H", "Hide"],
      ["Arrows", "Nudge (⇧ ×10)"],
    ],
  },
];

const SHAPE_OPTIONS: { label: string; value: PlaygroundShape }[] = [
  { label: "Rectangle", value: "rectangle" },
  { label: "Ellipse", value: "ellipse" },
];

/** A drag shorter than this is a click: drop a default-sized node instead of
 * a hairline one the user then has to fix. */
const DRAW_THRESHOLD = 4;

const FRAME_BACKGROUNDS = ["#ffffff", "#f4f1ea", "#111827", "#2563eb", "#f8f9fb"];

type View = { x: number; y: number; zoom: number };
type Draft = Record<string, PlaygroundRect>;
type Tool = "move" | "text" | "frame" | "ellipse";
type DrawTool = Exclude<Tool, "move">;

type Gesture =
  | { kind: "pan"; startX: number; startY: number; view: View }
  | { kind: "marquee"; startX: number; startY: number; base: string[] }
  | { kind: "move"; startX: number; startY: number; origins: Draft }
  | {
      kind: "draw";
      tool: DrawTool;
      startX: number;
      startY: number;
      anchor: { x: number; y: number };
    }
  | {
      kind: "resize";
      startX: number;
      startY: number;
      id: string;
      handle: PlaygroundHandle;
      origin: PlaygroundRect;
      rotation: number;
      minWidth: number;
      minHeight: number;
    };

/** Bounding box of a set of rects — the box a multi-node drag snaps with. */
function unionOf(rects: PlaygroundRect[]): PlaygroundRect {
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function DockDivider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-canvas-line" />;
}

/** One dock control. Dark by design: the canvas behind it is light, so this is
 * the one piece of chrome that should read as "on top of" the artwork. */
function DockButton({
  label,
  hint,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  hint: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={`${label} (${hint})`}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-35 ${
        active ? "bg-brand-600 text-white" : "text-gray-300 hover:bg-canvas-panel hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 min-w-8 place-items-center rounded-md border border-line bg-panel px-2 text-xs font-medium text-muted hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function PlaygroundPanel() {
  const playground = useProject((state) => state.playground);
  const setPlayground = useProject((state) => state.setPlayground);
  const headingFont = useProject((state) => state.headingFont);
  const headingWeight = useProject((state) => state.headingWeight);
  const foreground = useProject((state) => state.foreground);
  const projectName = useProject((state) => state.projectName);

  const [selection, setSelection] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("move");
  const [drawRect, setDrawRect] = useState<PlaygroundRect | null>(null);
  const [guides, setGuides] = useState<PlaygroundGuide[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [marquee, setMarquee] = useState<PlaygroundRect | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 0.5 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [gestureKind, setGestureKind] = useState<Gesture["kind"] | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportTarget, setExportTarget] = useState<string>("canvas");

  const viewportRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const drawRectRef = useRef<PlaygroundRect | null>(null);
  const toolRef = useRef(tool);
  const snapEnabledRef = useRef(snapEnabled);
  // Cut/copy lives in the component, not the document: it should survive
  // switching panels but has no business in the shared project state.
  const clipboardRef = useRef<ReturnType<typeof copyPlaygroundNodes> | null>(null);
  const playgroundRef = useRef(playground);
  const viewRef = useRef(view);
  const selectionRef = useRef(selection);
  const didFitRef = useRef(false);

  playgroundRef.current = playground;
  toolRef.current = tool;
  snapEnabledRef.current = snapEnabled;
  viewRef.current = view;
  selectionRef.current = selection;

  const commit = useCallback(
    (next: PlaygroundDocument, coalesce = false) => setPlayground(next, coalesce),
    [setPlayground]
  );

  const selectedLayers = useMemo(
    () => playground.layers.filter((layer) => selection.includes(layer.id)),
    [playground.layers, selection]
  );
  const selectedFrames = useMemo(
    () => playground.frames.filter((frame) => selection.includes(frame.id)),
    [playground.frames, selection]
  );
  const activeLayer = selectedLayers.length === 1 ? selectedLayers[0] : null;
  const activeFrame =
    selectedFrames.length === 1 && selectedLayers.length === 0 ? selectedFrames[0] : null;
  /** Everything selected, of either kind — for controls that apply to both. */
  const selectedNodes: PlaygroundNodeBase[] = useMemo(
    () => [...selectedFrames, ...selectedLayers],
    [selectedFrames, selectedLayers]
  );
  const activeNode: PlaygroundNodeBase | null =
    selection.length === 1 ? (activeLayer ?? activeFrame) : null;

  // Prune ids that history/undo removed from the document.
  useEffect(() => {
    setSelection((current) => {
      const live = current.filter(
        (id) =>
          playground.layers.some((layer) => layer.id === id) ||
          playground.frames.some((frame) => frame.id === id)
      );
      return live.length === current.length ? current : live;
    });
  }, [playground]);

  useEffect(() => {
    const googleFonts = new Set(
      playground.layers
        .filter((layer) => layer.fontId.startsWith("gf:"))
        .map((layer) => layer.fontId)
    );
    googleFonts.forEach((id) => ensureGoogleFont(gfFamilyFromId(id)));
  }, [playground.layers]);

  useEffect(() => {
    if (!playground.frames.some((frame) => frame.id === exportTarget)) setExportTarget("canvas");
  }, [exportTarget, playground.frames]);

  // --- viewport helpers ------------------------------------------------------

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const element = viewportRef.current;
    if (!element) return { x: 0, y: 0 };
    const bounds = element.getBoundingClientRect();
    const current = viewRef.current;
    return {
      x: (clientX - bounds.left - current.x) / current.zoom,
      y: (clientY - bounds.top - current.y) / current.zoom,
    };
  }, []);

  const zoomAround = useCallback((clientX: number, clientY: number, nextZoom: number) => {
    const element = viewportRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const current = viewRef.current;
    const zoom = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX);
    const px = clientX - bounds.left;
    const py = clientY - bounds.top;
    const cx = (px - current.x) / current.zoom;
    const cy = (py - current.y) / current.zoom;
    setView({ zoom, x: px - cx * zoom, y: py - cy * zoom });
  }, []);

  const zoomByStep = useCallback((factor: number) => {
    const element = viewportRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const current = viewRef.current;
    const zoom = clamp(current.zoom * factor, ZOOM_MIN, ZOOM_MAX);
    const cx = (bounds.width / 2 - current.x) / current.zoom;
    const cy = (bounds.height / 2 - current.y) / current.zoom;
    setView({ zoom, x: bounds.width / 2 - cx * zoom, y: bounds.height / 2 - cy * zoom });
  }, []);

  const focusRect = useCallback((rect: PlaygroundRect, maxZoom = 1) => {
    const element = viewportRef.current;
    if (!element || rect.width <= 0 || rect.height <= 0) return;
    const width = Math.max(240, element.clientWidth);
    const height = Math.max(240, element.clientHeight);
    const zoom = clamp(
      Math.min((width - FIT_PADDING * 2) / rect.width, (height - FIT_PADDING * 2) / rect.height),
      ZOOM_MIN,
      maxZoom
    );
    setView({
      zoom,
      x: (width - rect.width * zoom) / 2 - rect.x * zoom,
      y: (height - rect.height * zoom) / 2 - rect.y * zoom,
    });
  }, []);

  const fitAll = useCallback(() => focusRect(playgroundBounds(playgroundRef.current)), [focusRect]);

  const fitSelection = useCallback(() => {
    const rect = playgroundNodesBounds(playgroundRef.current, selectionRef.current);
    if (rect) focusRect(rect, 2);
    else fitAll();
  }, [fitAll, focusRect]);

  // Guard inside the frame callback, not around it: StrictMode's double-invoke
  // would otherwise cancel the only scheduled fit and leave the canvas unframed.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (didFitRef.current) return;
      didFitRef.current = true;
      fitAll();
    });
    return () => cancelAnimationFrame(frame);
  }, [fitAll]);

  // Wheel needs a non-passive listener so trackpad pinch/scroll can be captured.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        zoomAround(
          event.clientX,
          event.clientY,
          viewRef.current.zoom * Math.exp(-event.deltaY / 220)
        );
        return;
      }
      setView((current) => ({
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      }));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [zoomAround]);

  // --- gestures --------------------------------------------------------------

  const gatherOriginsIn = useCallback((doc: PlaygroundDocument, ids: string[]): Draft => {
    const origins: Draft = {};
    ids.forEach((id) => {
      const frame = doc.frames.find((item) => item.id === id);
      if (frame) {
        if (frame.locked) return;
        origins[frame.id] = rectOf(frame);
        // Dragging a frame carries the text sitting on it.
        layersInFrame(doc, frame.id).forEach((layer) => {
          origins[layer.id] = rectOf(layer);
        });
        return;
      }
      const layer = doc.layers.find((item) => item.id === id);
      if (layer && !layer.locked) origins[layer.id] = rectOf(layer);
    });
    return origins;
  }, []);

  const gatherOrigins = useCallback(
    (ids: string[]): Draft => gatherOriginsIn(playgroundRef.current, ids),
    [gatherOriginsIn]
  );

  const beginGesture = useCallback((gesture: Gesture) => {
    gestureRef.current = gesture;
    setGestureKind(gesture.kind);
  }, []);

  const applyDraft = useCallback((next: Draft | null) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const applyDrawRect = useCallback((next: PlaygroundRect | null) => {
    drawRectRef.current = next;
    setDrawRect(next);
  }, []);

  /** Turn a finished draw gesture into a node. The drawn rect is used as-is —
   * whatever the pointer described is the size. A click (no meaningful drag)
   * drops a sensible default at that spot instead. */
  const commitDraw = useCallback(
    (drawTool: DrawTool, rect: PlaygroundRect | null, anchor: { x: number; y: number }) => {
      const doc = playgroundRef.current;
      const drawn =
        rect && rect.width >= DRAW_THRESHOLD && rect.height >= DRAW_THRESHOLD ? rect : null;

      if (drawTool === "text") {
        if (doc.layers.length >= MAX_LAYERS) return;
        const width = drawn?.width ?? 460;
        const height = drawn?.height ?? 120;
        const layer = createPlaygroundTextLayer({
          name: `Text ${doc.layers.length + 1}`,
          x: Math.round(drawn ? drawn.x : anchor.x - width / 2),
          y: Math.round(drawn ? drawn.y : anchor.y - height / 2),
          width,
          height,
          fontId: headingFont,
          fontWeight: headingWeight,
          color: foreground,
        });
        commit({ ...doc, layers: [...doc.layers, layer] });
        setSelection([layer.id]);
        return;
      }

      if (doc.frames.length >= MAX_FRAMES) return;
      const width = drawn?.width ?? 1200;
      const height = drawn?.height ?? 800;
      const frame = createPlaygroundFrame({
        name: `${drawTool === "ellipse" ? "Ellipse" : "Frame"} ${doc.frames.length + 1}`,
        x: Math.round(drawn ? drawn.x : anchor.x - width / 2),
        y: Math.round(drawn ? drawn.y : anchor.y - height / 2),
        width,
        height,
        shape: drawTool === "ellipse" ? "ellipse" : "rectangle",
        background: "#ffffff",
      });
      commit({ ...doc, frames: [...doc.frames, frame] });
      setSelection([frame.id]);
    },
    [commit, foreground, headingFont, headingWeight]
  );

  useEffect(() => {
    if (!gestureKind) return;

    const onMove = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      const zoom = viewRef.current.zoom;

      if (gesture.kind === "pan") {
        setView({
          ...gesture.view,
          x: gesture.view.x + (event.clientX - gesture.startX),
          y: gesture.view.y + (event.clientY - gesture.startY),
        });
        return;
      }

      if (gesture.kind === "marquee") {
        const element = viewportRef.current;
        if (!element) return;
        const bounds = element.getBoundingClientRect();
        const rect = {
          x: Math.min(gesture.startX, event.clientX) - bounds.left,
          y: Math.min(gesture.startY, event.clientY) - bounds.top,
          width: Math.abs(event.clientX - gesture.startX),
          height: Math.abs(event.clientY - gesture.startY),
        };
        setMarquee(rect);
        const start = toCanvas(gesture.startX, gesture.startY);
        const end = toCanvas(event.clientX, event.clientY);
        const canvasRect: PlaygroundRect = {
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
        };
        const doc = playgroundRef.current;
        const selectable = (node: PlaygroundNodeBase) => !node.locked && !node.hidden;
        const hits = [
          // Frames only join the selection when fully enclosed, so a marquee
          // drawn inside a frame grabs its text instead of the frame.
          ...doc.frames.filter(
            (frame) => selectable(frame) && rectContainsRect(canvasRect, rectOf(frame))
          ),
          ...doc.layers.filter(
            (layer) => selectable(layer) && rectsIntersect(canvasRect, rectOf(layer))
          ),
        ].map((node) => node.id);
        setSelection(Array.from(new Set([...gesture.base, ...hits])));
        return;
      }

      if (gesture.kind === "draw") {
        const pointer = toCanvas(event.clientX, event.clientY);
        const drawn = drawnRect(gesture.anchor.x, gesture.anchor.y, pointer.x, pointer.y, {
          square: event.shiftKey,
          fromCenter: event.altKey,
        });
        if (snapEnabledRef.current && !event.metaKey && !event.ctrlKey) {
          const snapped = snapRect(drawn, snapTargets(playgroundRef.current, []));
          setGuides(snapped.guides);
        } else {
          setGuides([]);
        }
        applyDrawRect(drawn);
        return;
      }

      const dx = (event.clientX - gesture.startX) / zoom;
      const dy = (event.clientY - gesture.startY) / zoom;

      if (gesture.kind === "move") {
        const moved: Draft = {};
        Object.entries(gesture.origins).forEach(([id, rect]) => {
          moved[id] = { ...rect, x: Math.round(rect.x + dx), y: Math.round(rect.y + dy) };
        });

        // Snap the selection as a whole — union box against everything else —
        // then shift every dragged node by the same correction, so their
        // relative layout survives the drag. Ctrl/⌘ suspends it.
        const ids = Object.keys(moved);
        const snapping = snapEnabledRef.current && !event.metaKey && !event.ctrlKey;
        if (snapping && ids.length > 0) {
          const union = unionOf(ids.map((id) => moved[id]));
          const snapped = snapRect(union, snapTargets(playgroundRef.current, ids));
          const shiftX = snapped.rect.x - union.x;
          const shiftY = snapped.rect.y - union.y;
          if (shiftX || shiftY) {
            ids.forEach((id) => {
              moved[id] = { ...moved[id], x: moved[id].x + shiftX, y: moved[id].y + shiftY };
            });
          }
          setGuides(snapped.guides);
        } else {
          setGuides([]);
        }

        applyDraft(moved);
        return;
      }

      // A rotated node resizes along its own edges, so the screen-space drag
      // is mapped into its local frame first.
      const local = rotateDelta(dx, dy, gesture.rotation);
      applyDraft({
        [gesture.id]: resizePlaygroundRect(gesture.origin, gesture.handle, local.dx, local.dy, {
          minWidth: gesture.minWidth,
          minHeight: gesture.minHeight,
          // Free in both axes by default; Shift opts into the starting ratio
          // and Alt resizes about the centre.
          aspect: event.shiftKey,
          fromCenter: event.altKey,
        }),
      });
    };

    const onUp = () => {
      const gesture = gestureRef.current;
      const pending = draftRef.current;
      const drawn = drawRectRef.current;
      gestureRef.current = null;
      setGestureKind(null);
      setMarquee(null);
      applyDraft(null);
      applyDrawRect(null);
      setGuides([]);
      if (!gesture) return;
      if (gesture.kind === "draw") {
        commitDraw(gesture.tool, drawn, gesture.anchor);
        // Figma-style: the tool returns to Move once the thing exists.
        setTool("move");
        return;
      }
      if (!pending) return;
      if (gesture.kind !== "move" && gesture.kind !== "resize") return;
      const changed = Object.entries(pending).some(([id, rect]) => {
        const origin =
          gesture.kind === "move" ? gesture.origins[id] : (gesture.origin as PlaygroundRect);
        return (
          origin.x !== rect.x ||
          origin.y !== rect.y ||
          origin.width !== rect.width ||
          origin.height !== rect.height
        );
      });
      if (changed) commit(patchPlaygroundNodes(playgroundRef.current, pending));
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [applyDraft, applyDrawRect, commit, commitDraw, gestureKind, toCanvas]);

  /** Arm-and-drag: with any tool but Move, a press anywhere starts drawing —
   * including on top of an existing frame, so shapes can be nested freely. */
  const beginDraw = (event: React.PointerEvent<HTMLElement>) => {
    const activeTool = toolRef.current;
    if (activeTool === "move" || event.button !== 0 || spaceDown) return false;
    event.preventDefault();
    event.stopPropagation();
    setSelection([]);
    setEditingId(null);
    beginGesture({
      kind: "draw",
      tool: activeTool,
      startX: event.clientX,
      startY: event.clientY,
      anchor: toCanvas(event.clientX, event.clientY),
    });
    return true;
  };

  const onCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget && !(event.target as HTMLElement).dataset.surface) {
      return;
    }
    if (event.button === 1 || spaceDown) {
      event.preventDefault();
      beginGesture({
        kind: "pan",
        startX: event.clientX,
        startY: event.clientY,
        view: viewRef.current,
      });
      return;
    }
    if (event.button !== 0) return;
    if (beginDraw(event)) return;
    setEditingId(null);
    const base = event.shiftKey ? selectionRef.current : [];
    if (!event.shiftKey) setSelection([]);
    beginGesture({ kind: "marquee", startX: event.clientX, startY: event.clientY, base });
  };

  const onNodePointerDown = (event: React.PointerEvent<HTMLElement>, id: string) => {
    if (event.button === 1 || spaceDown) return;
    if (event.button !== 0 || editingId === id) return;
    if (beginDraw(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const current = selectionRef.current;
    const next = event.shiftKey
      ? current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
      : current.includes(id)
        ? current
        : [id];
    setSelection(next);
    if (editingId && editingId !== id) setEditingId(null);

    // ⌥-drag leaves a copy behind and drags the copy, as in Figma.
    if (event.altKey) {
      const result = duplicatePlaygroundNodes(playgroundRef.current, next, 0);
      if (result.ids.length > 0) {
        commit(result.document);
        setSelection(result.ids);
        beginGesture({
          kind: "move",
          startX: event.clientX,
          startY: event.clientY,
          origins: gatherOriginsIn(result.document, result.ids),
        });
        return;
      }
    }

    beginGesture({
      kind: "move",
      startX: event.clientX,
      startY: event.clientY,
      origins: gatherOrigins(next),
    });
  };

  const onHandlePointerDown = (
    event: React.PointerEvent<HTMLElement>,
    id: string,
    handle: PlaygroundHandle,
    origin: PlaygroundRect,
    rotation: number,
    minWidth: number,
    minHeight: number
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    beginGesture({
      kind: "resize",
      startX: event.clientX,
      startY: event.clientY,
      id,
      handle,
      origin,
      rotation,
      minWidth,
      minHeight,
    });
  };

  // --- commands --------------------------------------------------------------

  const deleteSelection = useCallback(() => {
    const ids = selectionRef.current;
    if (ids.length === 0) return;
    commit(removePlaygroundNodes(playgroundRef.current, ids));
    setSelection([]);
    setEditingId(null);
  }, [commit]);

  const duplicateSelection = useCallback(() => {
    const ids = selectionRef.current;
    if (ids.length === 0) return;
    const result = duplicatePlaygroundNodes(playgroundRef.current, ids);
    if (result.ids.length === 0) return;
    commit(result.document);
    setSelection(result.ids);
  }, [commit]);

  const selectAll = useCallback(() => {
    const doc = playgroundRef.current;
    // Locked and hidden nodes aren't selectable by pointer, so Select All
    // shouldn't sweep them up either.
    setSelection(
      [...doc.frames, ...doc.layers]
        .filter((node) => !node.locked && !node.hidden)
        .map((node) => node.id)
    );
  }, []);

  const toggleFlag = useCallback(
    (flag: "locked" | "hidden") => {
      const ids = selectionRef.current;
      if (ids.length === 0) return;
      const doc = playgroundRef.current;
      const nodes = [...doc.frames, ...doc.layers].filter((node) => ids.includes(node.id));
      // Mixed selections resolve to "turn it on for everything".
      const next = !nodes.every((node) => node[flag]);
      commit(setPlaygroundNodeFlags(doc, ids, { [flag]: next }));
      if (flag === "hidden" && next) setSelection([]);
    },
    [commit]
  );

  const copySelection = useCallback(
    (cut = false) => {
      const ids = selectionRef.current;
      if (ids.length === 0) return;
      clipboardRef.current = copyPlaygroundNodes(playgroundRef.current, ids);
      if (cut) {
        commit(removePlaygroundNodes(playgroundRef.current, ids));
        setSelection([]);
      }
    },
    [commit]
  );

  const pasteClipboard = useCallback(() => {
    const clipboard = clipboardRef.current;
    if (!clipboard) return;
    const result = pastePlaygroundNodes(playgroundRef.current, clipboard);
    if (result.ids.length === 0) return;
    commit(result.document);
    setSelection(result.ids);
  }, [commit]);

  const alignSelection = useCallback(
    (alignment: PlaygroundAlignment) => {
      const ids = selectionRef.current;
      if (ids.length === 0) return;
      const next = alignPlaygroundNodes(playgroundRef.current, ids, alignment);
      if (next !== playgroundRef.current) commit(next);
    },
    [commit]
  );

  const distributeSelection = useCallback(
    (axis: PlaygroundDistribute) => {
      const ids = selectionRef.current;
      const next = distributePlaygroundNodes(playgroundRef.current, ids, axis);
      if (next !== playgroundRef.current) commit(next);
    },
    [commit]
  );

  const patchLayers = useCallback(
    (patch: Partial<PlaygroundTextLayer>, coalesce = true) => {
      const ids = selectionRef.current.filter((id) =>
        playgroundRef.current.layers.some((layer) => layer.id === id)
      );
      if (ids.length === 0) return;
      commit(updatePlaygroundLayers(playgroundRef.current, ids, patch), coalesce);
    },
    [commit]
  );

  const patchFrame = useCallback(
    (id: string, patch: Partial<PlaygroundFrame>, coalesce = true) =>
      commit(updatePlaygroundFrame(playgroundRef.current, id, patch), coalesce),
    [commit]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        Boolean(editingId) ||
        Boolean(
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        );
      if (typing) return;

      const meta = event.metaKey || event.ctrlKey;
      if (event.key === " ") {
        event.preventDefault();
        setSpaceDown(true);
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen((open) => !open);
        return;
      }
      if (event.key === "Escape") {
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        // Abandon a half-drawn shape rather than committing it on release:
        // dropping the gesture tears down the pointer listeners, so the
        // pending rect never reaches commitDraw.
        if (gestureRef.current?.kind === "draw") {
          gestureRef.current = null;
          setGestureKind(null);
          applyDrawRect(null);
        }
        setSelection([]);
        setTool("move");
        setInspectorOpen(false);
        return;
      }
      if (meta && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAll();
        return;
      }
      if (meta && event.key === "0") {
        event.preventDefault();
        zoomByStep(1 / viewRef.current.zoom);
        return;
      }
      if (!meta && event.key === "1") {
        event.preventDefault();
        fitAll();
        return;
      }
      if (!meta && event.key === "2") {
        event.preventDefault();
        fitSelection();
        return;
      }
      const shortcut: Record<string, Tool> = { v: "move", t: "text", f: "frame", o: "ellipse" };
      const picked = meta ? undefined : shortcut[event.key.toLowerCase()];
      if (picked) {
        event.preventDefault();
        setTool(picked);
        return;
      }
      if (meta && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelection();
        return;
      }
      if (meta && event.key.toLowerCase() === "x") {
        event.preventDefault();
        copySelection(true);
        return;
      }
      if (meta && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
        return;
      }
      if (meta && event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        toggleFlag("hidden");
        return;
      }
      if (meta && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        toggleFlag("locked");
        return;
      }
      if (!meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setSnapEnabled((current) => !current);
        return;
      }
      if (selectionRef.current.length === 0) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
        return;
      }
      if (meta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      const delta = event.shiftKey ? 10 : 1;
      const nudge: Record<string, { dx: number; dy: number }> = {
        ArrowLeft: { dx: -delta, dy: 0 },
        ArrowRight: { dx: delta, dy: 0 },
        ArrowUp: { dx: 0, dy: -delta },
        ArrowDown: { dx: 0, dy: delta },
      };
      const step = nudge[event.key];
      if (!step) return;
      event.preventDefault();
      const origins = gatherOrigins(selectionRef.current);
      const patches: Draft = {};
      Object.entries(origins).forEach(([id, rect]) => {
        patches[id] = { ...rect, x: rect.x + step.dx, y: rect.y + step.dy };
      });
      commit(patchPlaygroundNodes(playgroundRef.current, patches), true);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") setSpaceDown(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    applyDrawRect,
    commit,
    copySelection,
    pasteClipboard,
    toggleFlag,
    deleteSelection,
    duplicateSelection,
    editingId,
    fitAll,
    fitSelection,
    gatherOrigins,
    selectAll,
    shortcutsOpen,
    zoomByStep,
  ]);

  const runExport = async () => {
    setExporting(true);
    try {
      const safeName = projectName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const frameId = exportTarget === "canvas" ? null : exportTarget;
      const frame = playground.frames.find((item) => item.id === frameId);
      const suffix = frame
        ? frame.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        : "canvas";
      await exportPlaygroundPng(
        playground,
        frameId,
        `${safeName || "typesmith"}-${suffix || "frame"}.png`
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "The PNG could not be exported.");
    } finally {
      setExporting(false);
    }
  };

  const rectFor = (node: PlaygroundRect & { id: string }): PlaygroundRect =>
    draft?.[node.id] ?? rectOf(node);

  const inspectorProps: InspectorProps = {
    doc: playground,
    selectedLayers,
    activeLayer,
    activeFrame,
    selection,
    onSelect: (id, additive) =>
      setSelection((current) =>
        additive
          ? current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id]
          : [id]
      ),
    onPatchLayers: patchLayers,
    onPatchFrame: patchFrame,
    selectedNodes,
    activeNode,
    onFitFrame: (id) => commit(fitFrameToContents(playgroundRef.current, id)),
    onPatchNodes: (patch, coalesce = true) => {
      const ids = selectionRef.current;
      if (ids.length === 0) return;
      commit(updatePlaygroundNodes(playgroundRef.current, ids, patch), coalesce);
    },
    onToggleFlag: toggleFlag,
    onSelectFlag: (id, flag) => {
      const doc = playgroundRef.current;
      const node = [...doc.frames, ...doc.layers].find((item) => item.id === id);
      if (!node) return;
      commit(setPlaygroundNodeFlags(doc, [id], { [flag]: !node[flag] }));
    },
    onDistribute: distributeSelection,
    onAlign: alignSelection,
    onReorder: (move) =>
      activeNode && commit(reorderPlaygroundNode(playground, activeNode.id, move)),
    onDelete: deleteSelection,
  };

  const cursor = spaceDown
    ? gestureKind === "pan"
      ? "grabbing"
      : "grab"
    : tool === "move"
      ? "default"
      : "crosshair";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-card border border-line bg-panel shadow-panel">
      <header className="flex min-h-12 flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <div className="mr-1 hidden lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            Playground
          </p>
          <p className="text-xs text-muted">Infinite canvas</p>
        </div>
        <span className="hidden text-xs text-muted lg:inline">
          {playground.frames.length} {playground.frames.length === 1 ? "frame" : "frames"} ·{" "}
          {playground.layers.length} text
        </span>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Zoom out" onClick={() => zoomByStep(1 / 1.2)}>
            −
          </IconButton>
          <button
            onClick={fitAll}
            className="h-8 min-w-14 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
            title="Zoom to fit (1)"
          >
            {Math.round(view.zoom * 100)}%
          </button>
          <IconButton label="Zoom in" onClick={() => zoomByStep(1.2)}>
            +
          </IconButton>
          <Select
            aria-label="Export target"
            value={exportTarget}
            onChange={(event) => setExportTarget(event.target.value)}
            className="ml-1 hidden w-36 sm:block"
          >
            <option value="canvas">Entire canvas</option>
            {playground.frames.map((frame) => (
              <option key={frame.id} value={frame.id}>
                {frame.name}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            onClick={runExport}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "PNG"}
          </Button>
          <Button
            variant="outline"
            className="h-8 px-3 text-xs xl:hidden"
            onClick={() => setInspectorOpen(true)}
          >
            Inspect
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          ref={viewportRef}
          data-testid="playground-canvas"
          className="relative min-w-0 flex-1 touch-none overflow-hidden bg-plane"
          style={{
            cursor,
            backgroundImage:
              "radial-gradient(circle, rgb(var(--c-plane-dot) / var(--c-plane-dot-alpha)) 1px, transparent 1px)",
            backgroundSize: `${Math.max(8, 40 * view.zoom)}px ${Math.max(8, 40 * view.zoom)}px`,
            backgroundPosition: `${view.x}px ${view.y}px`,
          }}
          onPointerDown={onCanvasPointerDown}
        >
          <div
            data-surface="true"
            className="absolute left-0 top-0 h-0 w-0 origin-top-left"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
          >
            {playground.frames.map((frame) => {
              const rect = rectFor(frame);
              const active = selection.includes(frame.id);
              if (frame.hidden) return null;
              const spin = frame.rotation ? `rotate(${frame.rotation}deg)` : undefined;
              return (
                <div key={frame.id}>
                  <button
                    type="button"
                    className="absolute origin-bottom-left whitespace-nowrap text-left font-medium"
                    style={{
                      left: rect.x,
                      top: rect.y,
                      transform: `translateY(-100%) scale(${1 / view.zoom})`,
                      transformOrigin: "left bottom",
                      paddingBottom: 6,
                      fontSize: 12,
                      color: active ? "#2563eb" : "rgb(var(--c-muted))",
                    }}
                    onPointerDown={(event) => onNodePointerDown(event, frame.id)}
                  >
                    {frame.locked ? "🔒 " : ""}
                    {frame.name}
                    <span className="ml-2 text-[10px] font-normal opacity-70">
                      {Math.round(rect.width)} × {Math.round(rect.height)}
                    </span>
                  </button>
                  <div
                    className="absolute"
                    style={{
                      left: rect.x,
                      top: rect.y,
                      width: rect.width,
                      height: rect.height,
                      background: frame.background,
                      opacity: frame.opacity,
                      transform: spin,
                      pointerEvents: frame.locked ? "none" : undefined,
                      borderRadius:
                        frame.shape === "ellipse"
                          ? "50%"
                          : Math.min(frame.radius, rect.width / 2, rect.height / 2),
                      boxShadow: active
                        ? `0 0 0 ${2 / view.zoom}px #2563eb, 0 18px 45px rgb(var(--c-plane-shadow) / var(--c-plane-shadow-alpha))`
                        : "0 18px 45px rgb(var(--c-plane-shadow) / var(--c-plane-shadow-alpha))",
                    }}
                    onPointerDown={(event) => onNodePointerDown(event, frame.id)}
                    aria-label={`${frame.name} frame`}
                  />
                  {active && selection.length === 1 && tool === "move" && !frame.locked && (
                    <ResizeHandles
                      rect={rect}
                      rotation={frame.rotation}
                      zoom={view.zoom}
                      onStart={(event, handle) =>
                        onHandlePointerDown(
                          event,
                          frame.id,
                          handle,
                          rect,
                          frame.rotation,
                          MIN_FRAME_SIZE,
                          MIN_FRAME_SIZE
                        )
                      }
                    />
                  )}
                </div>
              );
            })}

            {playground.layers.map((layer) => {
              const rect = rectFor(layer);
              const active = selection.includes(layer.id);
              const editing = editingId === layer.id;
              if (layer.hidden) return null;
              return (
                <div key={layer.id}>
                  <div
                    data-layer-id={layer.id}
                    className={`absolute whitespace-pre-wrap outline-none ${editing ? "cursor-text select-text" : "cursor-move select-none"}`}
                    style={{
                      left: rect.x,
                      top: rect.y,
                      width: rect.width,
                      height: rect.height,
                      color: layer.color,
                      fontFamily: fontById(layer.fontId).stack,
                      fontSize: layer.fontSize,
                      fontWeight: layer.fontWeight,
                      lineHeight: layer.lineHeight,
                      letterSpacing: `${layer.letterSpacing}em`,
                      textAlign: layer.textAlign,
                      opacity: layer.opacity,
                      transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                      pointerEvents: layer.locked ? "none" : undefined,
                      overflow: "hidden",
                      touchAction: "none",
                      boxShadow: active ? `0 0 0 ${1.5 / view.zoom}px #2563eb` : undefined,
                    }}
                    onPointerDown={(event) => onNodePointerDown(event, layer.id)}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      setSelection([layer.id]);
                      setEditingId(layer.id);
                      const element = event.currentTarget as HTMLDivElement;
                      requestAnimationFrame(() => element.focus());
                    }}
                    contentEditable={editing}
                    suppressContentEditableWarning
                    role="textbox"
                    aria-label={layer.name}
                    tabIndex={active ? 0 : -1}
                    onBlur={(event) => {
                      if (!editing) return;
                      const value = event.currentTarget.innerText.replace(/\n$/, "");
                      setEditingId(null);
                      if (value !== layer.text) {
                        commit(
                          updatePlaygroundLayers(playground, [layer.id], { text: value || " " })
                        );
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.currentTarget.innerText = layer.text;
                        event.currentTarget.blur();
                      }
                      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                  >
                    {layer.text}
                  </div>
                  {active &&
                    selection.length === 1 &&
                    !editing &&
                    tool === "move" &&
                    !layer.locked && (
                      <ResizeHandles
                        rect={rect}
                        rotation={layer.rotation}
                        zoom={view.zoom}
                        onStart={(event, handle) =>
                          onHandlePointerDown(
                            event,
                            layer.id,
                            handle,
                            rect,
                            layer.rotation,
                            MIN_LAYER_WIDTH,
                            MIN_LAYER_HEIGHT
                          )
                        }
                      />
                    )}
                </div>
              );
            })}

            {guides.map((guide, index) => (
              <div
                key={`${guide.axis}-${guide.position}-${index}`}
                data-testid="snap-guide"
                className="pointer-events-none absolute bg-brand-600"
                style={
                  guide.axis === "x"
                    ? {
                        left: guide.position,
                        top: guide.start,
                        width: Math.max(1 / view.zoom, 1 / view.zoom),
                        height: guide.end - guide.start,
                      }
                    : {
                        left: guide.start,
                        top: guide.position,
                        width: guide.end - guide.start,
                        height: Math.max(1 / view.zoom, 1 / view.zoom),
                      }
                }
              />
            ))}

            {drawRect && (
              <div
                className="pointer-events-none absolute border-brand-600 bg-brand-600/5"
                style={{
                  left: drawRect.x,
                  top: drawRect.y,
                  width: drawRect.width,
                  height: drawRect.height,
                  borderWidth: 1.5 / view.zoom,
                  borderStyle: "dashed",
                  borderRadius: tool === "ellipse" ? "50%" : undefined,
                }}
              />
            )}
          </div>

          {marquee && (
            <div
              className="pointer-events-none absolute border border-brand-600 bg-brand-600/10"
              style={{
                left: marquee.x,
                top: marquee.y,
                width: marquee.width,
                height: marquee.height,
              }}
            />
          )}

          {/* Floating dock: the tools are the primary action here, so they sit
              over the canvas rather than in the panel header. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-3">
            {tool !== "move" && !shortcutsOpen && (
              <p className="pointer-events-none rounded-full bg-canvas/90 px-3 py-1 text-[11px] font-medium text-white shadow-modal backdrop-blur">
                Drag to draw a {tool === "text" ? "text box" : tool} at any size · ⇧ square · ⌥ from
                centre · Esc to cancel
              </p>
            )}

            {shortcutsOpen && (
              <div className="pointer-events-auto max-h-[46vh] w-[min(92vw,560px)] overflow-y-auto rounded-card border border-canvas-line bg-canvas/95 p-4 text-white shadow-modal backdrop-blur ts-scroll">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Shortcuts
                  </h3>
                  <button
                    onClick={() => setShortcutsOpen(false)}
                    aria-label="Close shortcuts"
                    className="grid h-6 w-6 place-items-center rounded text-gray-400 hover:bg-canvas-panel hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {SHORTCUTS.map((section) => (
                    <div key={section.group}>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-500">
                        {section.group}
                      </p>
                      <dl className="space-y-1">
                        {section.items.map(([keys, action]) => (
                          <div key={keys} className="flex items-baseline justify-between gap-3">
                            <dt className="shrink-0 font-mono text-[11px] text-gray-300">{keys}</dt>
                            <dd className="min-w-0 truncate text-[11px] text-gray-400">{action}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-canvas-line bg-canvas/95 p-1.5 shadow-modal backdrop-blur">
              {TOOLS.map(({ label, value, key, Icon }) => (
                <DockButton
                  key={value}
                  label={`${label} tool`}
                  hint={key}
                  active={tool === value}
                  onClick={() => setTool(value)}
                >
                  <Icon />
                </DockButton>
              ))}

              <DockDivider />

              <DockButton
                label="Snap to objects"
                hint="S"
                active={snapEnabled}
                onClick={() => setSnapEnabled((current) => !current)}
              >
                <MagnetIcon />
              </DockButton>

              <DockDivider />

              <DockButton
                label="Duplicate selection"
                hint="⌘D"
                disabled={selection.length === 0}
                onClick={duplicateSelection}
              >
                <DuplicateIcon />
              </DockButton>
              <DockButton
                label="Delete selection"
                hint="⌫"
                disabled={selection.length === 0}
                onClick={deleteSelection}
              >
                <TrashIcon />
              </DockButton>

              <DockDivider />

              <DockButton
                label="Shortcuts"
                hint="?"
                active={shortcutsOpen}
                onClick={() => setShortcutsOpen((open) => !open)}
              >
                <KeyboardIcon />
              </DockButton>
            </div>
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 border-l border-line bg-sidebar xl:flex xl:flex-col">
          <Inspector {...inspectorProps} />
        </aside>
      </div>

      {inspectorOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            className="absolute inset-0 bg-ink/40"
            onClick={() => setInspectorOpen(false)}
            aria-label="Close inspector"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(90vw,320px)] flex-col bg-sidebar shadow-modal">
            <div className="flex h-12 items-center justify-between border-b border-line px-4">
              <span className="text-sm font-semibold text-ink">Inspector</span>
              <button
                onClick={() => setInspectorOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface"
              >
                ×
              </button>
            </div>
            <Inspector {...inspectorProps} />
          </aside>
        </div>
      )}
    </section>
  );
}

// Eight handles: the four corners move both axes, the four edges move one.
// `dx`/`dy` are fractions of the rect, so 0.5 means "centre of that side".
const HANDLE_POSITIONS: Record<PlaygroundHandle, { cursor: string; dx: number; dy: number }> = {
  nw: { cursor: "nwse-resize", dx: 0, dy: 0 },
  n: { cursor: "ns-resize", dx: 0.5, dy: 0 },
  ne: { cursor: "nesw-resize", dx: 1, dy: 0 },
  e: { cursor: "ew-resize", dx: 1, dy: 0.5 },
  se: { cursor: "nwse-resize", dx: 1, dy: 1 },
  s: { cursor: "ns-resize", dx: 0.5, dy: 1 },
  sw: { cursor: "nesw-resize", dx: 0, dy: 1 },
  w: { cursor: "ew-resize", dx: 0, dy: 0.5 },
};

const HANDLE_LABELS: Record<PlaygroundHandle, string> = {
  nw: "top left",
  n: "top",
  ne: "top right",
  e: "right",
  se: "bottom right",
  s: "bottom",
  sw: "bottom left",
  w: "left",
};

function ResizeHandles({
  rect,
  rotation,
  zoom,
  onStart,
}: {
  rect: PlaygroundRect;
  rotation: number;
  zoom: number;
  onStart: (event: React.PointerEvent<HTMLElement>, handle: PlaygroundHandle) => void;
}) {
  const size = 10 / zoom;
  return (
    // Rotated about the same centre as the node, so the handles stay on its
    // corners and edges rather than on its upright bounding box.
    <div
      className="pointer-events-none absolute"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
      }}
    >
      {PLAYGROUND_HANDLES.map((handle) => {
        const spot = HANDLE_POSITIONS[handle];
        const corner = handle.length === 2;
        // Edge handles are invisible grab strips running the length of the
        // side, so a side can be dragged without hunting for a dot.
        const width = corner || spot.dx !== 0.5 ? size : Math.max(size, rect.width - size * 2);
        const height = corner || spot.dy !== 0.5 ? size : Math.max(size, rect.height - size * 2);
        return (
          <span
            key={handle}
            role="button"
            aria-label={`Resize ${HANDLE_LABELS[handle]}`}
            className="pointer-events-auto absolute z-10"
            style={{
              left: spot.dx * rect.width - width / 2,
              top: spot.dy * rect.height - height / 2,
              width,
              height,
              background: corner ? "#ffffff" : "transparent",
              border: corner ? `${1.5 / zoom}px solid #2563eb` : "none",
              borderRadius: corner ? 2 / zoom : 0,
              cursor: spot.cursor,
              touchAction: "none",
            }}
            onPointerDown={(event) => onStart(event, handle)}
          />
        );
      })}
    </div>
  );
}

type InspectorProps = {
  doc: PlaygroundDocument;
  selectedNodes: PlaygroundNodeBase[];
  activeNode: PlaygroundNodeBase | null;
  selectedLayers: PlaygroundTextLayer[];
  activeLayer: PlaygroundTextLayer | null;
  activeFrame: PlaygroundFrame | null;
  selection: string[];
  onSelect: (id: string, additive: boolean) => void;
  onPatchLayers: (patch: Partial<PlaygroundTextLayer>, coalesce?: boolean) => void;
  onPatchFrame: (id: string, patch: Partial<PlaygroundFrame>, coalesce?: boolean) => void;
  onFitFrame: (id: string) => void;
  onPatchNodes: (patch: { rotation?: number; opacity?: number }, coalesce?: boolean) => void;
  onToggleFlag: (flag: "locked" | "hidden") => void;
  onSelectFlag: (id: string, flag: "locked" | "hidden") => void;
  onDistribute: (axis: PlaygroundDistribute) => void;
  onAlign: (alignment: PlaygroundAlignment) => void;
  onReorder: (move: PlaygroundLayerMove) => void;
  onDelete: () => void;
};

function Inspector({
  doc,
  selectedNodes,
  activeNode,
  selectedLayers,
  activeLayer,
  activeFrame,
  selection,
  onSelect,
  onPatchLayers,
  onPatchFrame,
  onFitFrame,
  onPatchNodes,
  onToggleFlag,
  onSelectFlag,
  onDistribute,
  onAlign,
  onReorder,
  onDelete,
}: InspectorProps) {
  const loose = looseLayers(doc);
  const selectedLayerCount = selectedLayers.length;
  // With a multi-selection the fields show the first layer's values and edits
  // apply to everything selected, so "mixed" is only a display concern.
  const primary = selectedLayers[0] ?? null;
  const shares = <K extends keyof PlaygroundTextLayer>(key: K) =>
    selectedLayers.every((layer) => layer[key] === primary?.[key]);
  const anyLocked = selectedNodes.some((node) => node.locked);
  const anyHidden = selectedNodes.some((node) => node.hidden);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto ts-scroll">
      {selectedNodes.length > 0 && (
        <InspectorSection
          title={selectedNodes.length > 1 ? `Object · ${selectedNodes.length}` : "Object"}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Rotation (°)">
                <NumberInput
                  value={activeNode?.rotation ?? 0}
                  min={-180}
                  max={180}
                  onChange={(rotation) => onPatchNodes({ rotation })}
                />
              </Field>
              <Field label="Opacity (%)">
                <NumberInput
                  value={Math.round((activeNode?.opacity ?? 1) * 100)}
                  min={0}
                  max={100}
                  onChange={(value) => onPatchNodes({ opacity: value / 100 })}
                />
              </Field>
            </div>
            <FieldGroup label="Rotate by">
              <div className="grid grid-cols-4 gap-1">
                {[-90, -15, 15, 90].map((step) => (
                  <button
                    key={step}
                    onClick={() =>
                      onPatchNodes({ rotation: (activeNode?.rotation ?? 0) + step }, false)
                    }
                    className="h-8 rounded-md border border-line bg-panel text-[10px] text-muted hover:bg-surface hover:text-ink"
                  >
                    {step > 0 ? `+${step}` : step}
                  </button>
                ))}
              </div>
            </FieldGroup>
            <FieldGroup label="Align">
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    ["left", "Left"],
                    ["center-x", "H center"],
                    ["right", "Right"],
                    ["top", "Top"],
                    ["center-y", "V center"],
                    ["bottom", "Bottom"],
                  ] as [PlaygroundAlignment, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => onAlign(value)}
                    className="h-8 rounded-md border border-line bg-panel px-1 text-[10px] text-muted hover:bg-surface hover:text-ink"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                {selectedNodes.length > 1
                  ? "Aligns the selection to its own bounds."
                  : "Aligns to the frame this sits on."}
              </p>
            </FieldGroup>
            <FieldGroup label="Distribute">
              <div className="grid grid-cols-2 gap-1">
                {(
                  [
                    ["horizontal", "Horizontal"],
                    ["vertical", "Vertical"],
                  ] as [PlaygroundDistribute, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => onDistribute(value)}
                    disabled={selectedNodes.length < 3}
                    className="h-8 rounded-md border border-line bg-panel text-[10px] text-muted hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FieldGroup>
            <FieldGroup label="Order">
              <div className="grid grid-cols-4 gap-1">
                {(["front", "forward", "backward", "back"] as PlaygroundLayerMove[]).map((move) => (
                  <button
                    key={move}
                    onClick={() => onReorder(move)}
                    disabled={!activeNode}
                    className="h-8 rounded-md border border-line bg-panel text-[10px] capitalize text-muted hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                  >
                    {move}
                  </button>
                ))}
              </div>
            </FieldGroup>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => onToggleFlag("locked")}
                className={`h-8 rounded-md border text-[10px] ${anyLocked ? "border-brand-600 bg-brand-50 text-accent" : "border-line bg-panel text-muted hover:bg-surface hover:text-ink"}`}
              >
                {anyLocked ? "Unlock" : "Lock"}
              </button>
              <button
                onClick={() => onToggleFlag("hidden")}
                className={`h-8 rounded-md border text-[10px] ${anyHidden ? "border-brand-600 bg-brand-50 text-accent" : "border-line bg-panel text-muted hover:bg-surface hover:text-ink"}`}
              >
                {anyHidden ? "Show" : "Hide"}
              </button>
            </div>
          </div>
        </InspectorSection>
      )}

      {activeFrame ? (
        <InspectorSection title="Frame">
          <div className="space-y-3">
            <Field label="Name">
              <input
                value={activeFrame.name}
                onChange={(event) => onPatchFrame(activeFrame.id, { name: event.target.value })}
                className="h-8 w-full rounded-md border border-line bg-panel px-2.5 text-sm text-ink"
              />
            </Field>
            <FieldGroup label="Shape">
              <Segmented
                options={SHAPE_OPTIONS}
                value={activeFrame.shape}
                onChange={(shape) => onPatchFrame(activeFrame.id, { shape }, false)}
                size="sm"
              />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-2">
              <Field label="X">
                <NumberInput
                  value={activeFrame.x}
                  min={-20000}
                  max={20000}
                  onChange={(x) => onPatchFrame(activeFrame.id, { x })}
                />
              </Field>
              <Field label="Y">
                <NumberInput
                  value={activeFrame.y}
                  min={-20000}
                  max={20000}
                  onChange={(y) => onPatchFrame(activeFrame.id, { y })}
                />
              </Field>
              <Field label="Width">
                <NumberInput
                  value={activeFrame.width}
                  min={MIN_FRAME_SIZE}
                  max={MAX_FRAME_SIZE}
                  onChange={(width) => onPatchFrame(activeFrame.id, { width })}
                />
              </Field>
              <Field label="Height">
                <NumberInput
                  value={activeFrame.height}
                  min={MIN_FRAME_SIZE}
                  max={MAX_FRAME_SIZE}
                  onChange={(height) => onPatchFrame(activeFrame.id, { height })}
                />
              </Field>
            </div>
            {activeFrame.shape === "rectangle" && (
              <Field label="Corner radius">
                <NumberInput
                  value={activeFrame.radius}
                  min={0}
                  max={Math.min(activeFrame.width, activeFrame.height) / 2}
                  onChange={(radius) => onPatchFrame(activeFrame.id, { radius })}
                />
              </Field>
            )}
            <Field label="Quick size">
              <Select
                aria-label="Frame quick size"
                value=""
                onChange={(event) => {
                  const size = FRAME_SIZES.find((item) => item.label === event.target.value);
                  if (size) {
                    onPatchFrame(activeFrame.id, { width: size.width, height: size.height }, false);
                  }
                }}
              >
                <option value="">
                  Custom · {Math.round(activeFrame.width)} × {Math.round(activeFrame.height)}
                </option>
                {FRAME_SIZES.map((size) => (
                  <option key={size.label} value={size.label}>
                    {size.label}
                  </option>
                ))}
              </Select>
            </Field>
            <button
              onClick={() => onFitFrame(activeFrame.id)}
              className="h-8 w-full rounded-md border border-line bg-panel text-xs text-muted hover:bg-surface hover:text-ink"
            >
              Fit frame to its text
            </button>
            <Field label="Background">
              <div className="flex h-8 items-center gap-2 rounded-md border border-line bg-panel px-2">
                <input
                  type="color"
                  value={activeFrame.background}
                  onChange={(event) =>
                    onPatchFrame(activeFrame.id, { background: event.target.value })
                  }
                  className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                  aria-label="Frame background"
                />
                <span className="font-mono text-xs uppercase text-muted">
                  {activeFrame.background}
                </span>
              </div>
            </Field>
            <div className="flex gap-1">
              {FRAME_BACKGROUNDS.map((color) => (
                <button
                  key={color}
                  onClick={() => onPatchFrame(activeFrame.id, { background: color }, false)}
                  className="h-6 w-6 rounded border border-line"
                  style={{ background: color }}
                  aria-label={`Set frame background ${color}`}
                />
              ))}
            </div>
            <button
              onClick={onDelete}
              className="h-8 w-full rounded-md border border-line bg-panel text-xs text-muted hover:border-fail hover:text-fail"
            >
              Delete frame and its text
            </button>
          </div>
        </InspectorSection>
      ) : null}

      <InspectorSection
        title={selectedLayerCount > 1 ? `Text · ${selectedLayerCount} selected` : "Text"}
      >
        {selectedLayerCount === 0 ? (
          <p className="rounded-md border border-dashed border-line p-4 text-center text-xs leading-relaxed text-muted">
            Select text on the canvas to edit its typography. Pick the Frame or Ellipse tool and
            drag to draw an artboard at any size — nothing here is a fixed shape.
          </p>
        ) : (
          <div className="space-y-3">
            {activeLayer && (
              <Field label="Layer name">
                <input
                  value={activeLayer.name}
                  onChange={(event) => onPatchLayers({ name: event.target.value })}
                  className="h-8 w-full rounded-md border border-line bg-panel px-2.5 text-sm text-ink"
                />
              </Field>
            )}
            <Field label={shares("fontId") ? "Font" : "Font · mixed"}>
              <FontPicker
                value={primary?.fontId ?? "geist-sans"}
                onChange={(fontId) => onPatchLayers({ fontId }, false)}
                label="Layer font"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={shares("fontSize") ? "Size" : "Size · mixed"}>
                <NumberInput
                  value={primary?.fontSize ?? 64}
                  min={8}
                  max={400}
                  onChange={(fontSize) => onPatchLayers({ fontSize })}
                />
              </Field>
              <Field label={shares("fontWeight") ? "Weight" : "Weight · mixed"}>
                <NumberInput
                  value={primary?.fontWeight ?? 400}
                  min={100}
                  max={900}
                  step={100}
                  onChange={(fontWeight) => onPatchLayers({ fontWeight })}
                />
              </Field>
              <Field label={shares("lineHeight") ? "Line height" : "Line height · mixed"}>
                <NumberInput
                  value={primary?.lineHeight ?? 1.2}
                  min={0.7}
                  max={3}
                  step={0.05}
                  onChange={(lineHeight) => onPatchLayers({ lineHeight })}
                />
              </Field>
              <Field label={shares("letterSpacing") ? "Tracking (em)" : "Tracking · mixed"}>
                <NumberInput
                  value={primary?.letterSpacing ?? 0}
                  min={-0.2}
                  max={1}
                  step={0.005}
                  onChange={(letterSpacing) => onPatchLayers({ letterSpacing })}
                />
              </Field>
            </div>
            <Field label="Text color">
              <div className="flex h-8 items-center gap-2 rounded-md border border-line bg-panel px-2">
                <input
                  type="color"
                  value={primary?.color ?? "#111827"}
                  onChange={(event) => onPatchLayers({ color: event.target.value })}
                  className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                  aria-label="Text color"
                />
                <span className="font-mono text-xs uppercase text-muted">
                  {shares("color") ? primary?.color : "Mixed"}
                </span>
              </div>
            </Field>
            <FieldGroup label="Text align">
              <div className="grid grid-cols-3 gap-1">
                {(["left", "center", "right"] as PlaygroundTextAlign[]).map((alignment) => (
                  <button
                    key={alignment}
                    onClick={() => onPatchLayers({ textAlign: alignment }, false)}
                    className={`h-8 rounded-md border text-xs capitalize ${shares("textAlign") && primary?.textAlign === alignment ? "border-brand-600 bg-brand-50 text-accent" : "border-line bg-panel text-muted hover:bg-surface"}`}
                  >
                    {alignment}
                  </button>
                ))}
              </div>
            </FieldGroup>
          </div>
        )}
      </InspectorSection>

      <InspectorSection title={`Canvas · ${doc.frames.length + doc.layers.length}`}>
        <div className="space-y-2">
          {doc.frames.map((frame) => (
            <div key={frame.id}>
              <LayerRow
                label={frame.name}
                caption={`${frame.shape === "ellipse" ? "Ellipse" : "Rect"} · ${Math.round(frame.width)} × ${Math.round(frame.height)}`}
                glyph={frame.shape === "ellipse" ? "◯" : "▢"}
                selected={selection.includes(frame.id)}
                locked={frame.locked}
                hidden={frame.hidden}
                onSelect={(additive) => onSelect(frame.id, additive)}
                onToggle={(flag) => onSelectFlag(frame.id, flag)}
              />
              <div className="ml-3 border-l border-line pl-2">
                {layersInFrame(doc, frame.id).map((layer) => (
                  <LayerRow
                    key={layer.id}
                    label={layer.name}
                    caption={layer.text.replace(/\n/g, " ")}
                    glyph="T"
                    selected={selection.includes(layer.id)}
                    locked={layer.locked}
                    hidden={layer.hidden}
                    onSelect={(additive) => onSelect(layer.id, additive)}
                    onToggle={(flag) => onSelectFlag(layer.id, flag)}
                  />
                ))}
                {layersInFrame(doc, frame.id).length === 0 && (
                  <p className="py-2 text-[10px] text-muted">Empty frame</p>
                )}
              </div>
            </div>
          ))}
          {loose.length > 0 && (
            <div>
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                On the canvas
              </p>
              {loose.map((layer) => (
                <LayerRow
                  key={layer.id}
                  label={layer.name}
                  caption={layer.text.replace(/\n/g, " ")}
                  glyph="T"
                  selected={selection.includes(layer.id)}
                  locked={layer.locked}
                  hidden={layer.hidden}
                  onSelect={(additive) => onSelect(layer.id, additive)}
                  onToggle={(flag) => onSelectFlag(layer.id, flag)}
                />
              ))}
            </div>
          )}
          {doc.frames.length === 0 && loose.length === 0 && (
            <p className="py-4 text-center text-xs text-muted">
              Nothing here yet. Add a frame or some text.
            </p>
          )}
        </div>
      </InspectorSection>
    </div>
  );
}

function LayerRow({
  label,
  caption,
  glyph,
  selected,
  locked,
  hidden,
  onSelect,
  onToggle,
}: {
  label: string;
  caption: string;
  glyph: string;
  selected: boolean;
  locked: boolean;
  hidden: boolean;
  onSelect: (additive: boolean) => void;
  onToggle: (flag: "locked" | "hidden") => void;
}) {
  return (
    <div
      className={`group flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left ${selected ? "border-brand-600 bg-brand-50" : "border-transparent hover:border-line hover:bg-panel"}`}
    >
      <button
        onClick={(event) => onSelect(event.shiftKey)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-panel font-serif text-xs font-bold text-ink shadow-sm">
          {glyph}
        </span>
        <span className={`min-w-0 flex-1 ${hidden ? "opacity-50" : ""}`}>
          <span className="block truncate text-xs font-medium text-ink">{label}</span>
          <span className="block truncate text-[10px] text-muted">{caption}</span>
        </span>
      </button>
      {/* Always rendered so they stay reachable by keyboard; only the resting
          opacity changes on hover. */}
      <button
        aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
        onClick={() => onToggle("hidden")}
        className={`shrink-0 rounded px-1 text-[11px] leading-none text-muted hover:text-ink ${hidden || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"}`}
      >
        {hidden ? "🙈" : "👁"}
      </button>
      <button
        aria-label={locked ? `Unlock ${label}` : `Lock ${label}`}
        onClick={() => onToggle("locked")}
        className={`shrink-0 rounded px-1 text-[11px] leading-none text-muted hover:text-ink ${locked || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"}`}
      >
        {locked ? "🔒" : "🔓"}
      </button>
    </div>
  );
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line p-4">
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Same look as `Field`, but for a set of buttons rather than one input — a
 * <label> would fold its caption into every button's accessible name. */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <span className="mb-1 block text-[10px] font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={Number(value.toFixed(3))}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(clamp(numberValue(event.target.value, value), min, max))}
      className="h-8 w-full rounded-md border border-line bg-panel px-2.5 text-sm text-ink"
    />
  );
}
