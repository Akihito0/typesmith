"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Select } from "@/components/ui";
import { FontPicker } from "@/components/editor/FontPicker";
import { fontById } from "@/lib/fonts";
import { ensureGoogleFont, gfFamilyFromId } from "@/lib/googleFonts";
import {
  MAX_FRAMES,
  MAX_LAYERS,
  MIN_FRAME_SIZE,
  MIN_LAYER_HEIGHT,
  MIN_LAYER_WIDTH,
  alignPlaygroundLayer,
  createPlaygroundFrame,
  createPlaygroundTextLayer,
  duplicatePlaygroundNodes,
  layersInFrame,
  looseLayers,
  nextFrameOrigin,
  patchPlaygroundNodes,
  playgroundBounds,
  playgroundNodesBounds,
  rectContainsRect,
  rectOf,
  rectsIntersect,
  removePlaygroundNodes,
  reorderPlaygroundLayer,
  updatePlaygroundFrame,
  updatePlaygroundLayers,
  type PlaygroundAlignment,
  type PlaygroundDocument,
  type PlaygroundFrame,
  type PlaygroundLayerMove,
  type PlaygroundRect,
  type PlaygroundTextAlign,
  type PlaygroundTextLayer,
} from "@/lib/playground";
import { exportPlaygroundPng } from "@/lib/playgroundExport";
import { useProject } from "@/lib/store";

const ZOOM_MIN = 0.05;
const ZOOM_MAX = 4;
const FIT_PADDING = 72;

const FRAME_PRESETS = [
  { label: "Freeform · 1200 × 800", width: 1200, height: 800 },
  { label: "Square · 1080 × 1080", width: 1080, height: 1080 },
  { label: "Presentation · 1200 × 675", width: 1200, height: 675 },
  { label: "Story · 1080 × 1920", width: 1080, height: 1920 },
  { label: "Poster · 800 × 1000", width: 800, height: 1000 },
];

const FRAME_BACKGROUNDS = ["#ffffff", "#f4f1ea", "#111827", "#2563eb", "#f8f9fb"];

type View = { x: number; y: number; zoom: number };
type Handle = "nw" | "ne" | "sw" | "se";
type Draft = Record<string, PlaygroundRect>;

type Gesture =
  | { kind: "pan"; startX: number; startY: number; view: View }
  | { kind: "marquee"; startX: number; startY: number; base: string[] }
  | { kind: "move"; startX: number; startY: number; origins: Draft }
  | {
      kind: "resize";
      startX: number;
      startY: number;
      id: string;
      handle: Handle;
      origin: PlaygroundRect;
      minWidth: number;
      minHeight: number;
    };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resizeRect(
  origin: PlaygroundRect,
  handle: Handle,
  dx: number,
  dy: number,
  minWidth: number,
  minHeight: number
): PlaygroundRect {
  const rect = { ...origin };
  if (handle === "se" || handle === "ne") rect.width = Math.max(minWidth, origin.width + dx);
  if (handle === "sw" || handle === "nw") {
    rect.width = Math.max(minWidth, origin.width - dx);
    rect.x = origin.x + origin.width - rect.width;
  }
  if (handle === "se" || handle === "sw") rect.height = Math.max(minHeight, origin.height + dy);
  if (handle === "ne" || handle === "nw") {
    rect.height = Math.max(minHeight, origin.height - dy);
    rect.y = origin.y + origin.height - rect.height;
  }
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
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
      className="grid h-8 min-w-8 place-items-center rounded-md border border-line bg-white px-2 text-xs font-medium text-muted hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
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
  const playgroundRef = useRef(playground);
  const viewRef = useRef(view);
  const selectionRef = useRef(selection);
  const didFitRef = useRef(false);

  playgroundRef.current = playground;
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

  const gatherOrigins = useCallback((ids: string[]): Draft => {
    const doc = playgroundRef.current;
    const origins: Draft = {};
    ids.forEach((id) => {
      const frame = doc.frames.find((item) => item.id === id);
      if (frame) {
        origins[frame.id] = rectOf(frame);
        // Dragging a frame carries the text sitting on it.
        layersInFrame(doc, frame.id).forEach((layer) => {
          origins[layer.id] = rectOf(layer);
        });
        return;
      }
      const layer = doc.layers.find((item) => item.id === id);
      if (layer) origins[layer.id] = rectOf(layer);
    });
    return origins;
  }, []);

  const beginGesture = useCallback((gesture: Gesture) => {
    gestureRef.current = gesture;
    setGestureKind(gesture.kind);
  }, []);

  const applyDraft = useCallback((next: Draft | null) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

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
        const hits = [
          // Frames only join the selection when fully enclosed, so a marquee
          // drawn inside a frame grabs its text instead of the frame.
          ...doc.frames.filter((frame) => rectContainsRect(canvasRect, rectOf(frame))),
          ...doc.layers.filter((layer) => rectsIntersect(canvasRect, rectOf(layer))),
        ].map((node) => node.id);
        setSelection(Array.from(new Set([...gesture.base, ...hits])));
        return;
      }

      const dx = (event.clientX - gesture.startX) / zoom;
      const dy = (event.clientY - gesture.startY) / zoom;

      if (gesture.kind === "move") {
        const next: Draft = {};
        Object.entries(gesture.origins).forEach(([id, rect]) => {
          next[id] = { ...rect, x: Math.round(rect.x + dx), y: Math.round(rect.y + dy) };
        });
        applyDraft(next);
        return;
      }

      applyDraft({
        [gesture.id]: resizeRect(
          gesture.origin,
          gesture.handle,
          dx,
          dy,
          gesture.minWidth,
          gesture.minHeight
        ),
      });
    };

    const onUp = () => {
      const gesture = gestureRef.current;
      const pending = draftRef.current;
      gestureRef.current = null;
      setGestureKind(null);
      setMarquee(null);
      applyDraft(null);
      if (!gesture || !pending) return;
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
  }, [applyDraft, commit, gestureKind, toCanvas]);

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
    setEditingId(null);
    const base = event.shiftKey ? selectionRef.current : [];
    if (!event.shiftKey) setSelection([]);
    beginGesture({ kind: "marquee", startX: event.clientX, startY: event.clientY, base });
  };

  const onNodePointerDown = (event: React.PointerEvent<HTMLElement>, id: string) => {
    if (event.button === 1 || spaceDown) return;
    if (event.button !== 0 || editingId === id) return;
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
    handle: Handle,
    origin: PlaygroundRect,
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
      minWidth,
      minHeight,
    });
  };

  // --- commands --------------------------------------------------------------

  const addText = useCallback(() => {
    const doc = playgroundRef.current;
    if (doc.layers.length >= MAX_LAYERS) return;
    const element = viewportRef.current;
    const current = viewRef.current;
    const width = 460;
    const height = 120;
    const centre = element
      ? {
          x: (element.clientWidth / 2 - current.x) / current.zoom,
          y: (element.clientHeight / 2 - current.y) / current.zoom,
        }
      : { x: 0, y: 0 };
    const layer = createPlaygroundTextLayer({
      name: `Text ${doc.layers.length + 1}`,
      x: Math.round(centre.x - width / 2),
      y: Math.round(centre.y - height / 2),
      width,
      height,
      fontId: headingFont,
      fontWeight: headingWeight,
      color: foreground,
    });
    commit({ ...doc, layers: [...doc.layers, layer] });
    setSelection([layer.id]);
  }, [commit, foreground, headingFont, headingWeight]);

  const addFrame = useCallback(() => {
    const doc = playgroundRef.current;
    if (doc.frames.length >= MAX_FRAMES) return;
    const origin = nextFrameOrigin(doc);
    const frame = createPlaygroundFrame({
      name: `Frame ${doc.frames.length + 1}`,
      x: Math.round(origin.x),
      y: Math.round(origin.y),
      width: 1200,
      height: 800,
      background: "#ffffff",
    });
    commit({ ...doc, frames: [...doc.frames, frame] });
    setSelection([frame.id]);
    requestAnimationFrame(() => focusRect(rectOf(frame)));
  }, [commit, focusRect]);

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
    setSelection([...doc.frames.map((frame) => frame.id), ...doc.layers.map((layer) => layer.id)]);
  }, []);

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
      if (event.key === "Escape") {
        setSelection([]);
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
      if (!meta && event.key.toLowerCase() === "t") {
        event.preventDefault();
        addText();
        return;
      }
      if (!meta && event.key.toLowerCase() === "f") {
        event.preventDefault();
        addFrame();
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
    addFrame,
    addText,
    commit,
    deleteSelection,
    duplicateSelection,
    editingId,
    fitAll,
    fitSelection,
    gatherOrigins,
    selectAll,
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
    onAlign: (alignment) => {
      const ids = selectionRef.current.filter((id) =>
        playground.layers.some((layer) => layer.id === id)
      );
      let next = playground;
      ids.forEach((id) => {
        next = alignPlaygroundLayer(next, id, alignment);
      });
      if (next !== playground) commit(next);
    },
    onReorder: (move) =>
      activeLayer && commit(reorderPlaygroundLayer(playground, activeLayer.id, move)),
    onDelete: deleteSelection,
  };

  const cursor = spaceDown ? (gestureKind === "pan" ? "grabbing" : "grab") : "default";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-panel">
      <header className="flex min-h-12 flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <div className="mr-1 hidden lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600">
            Playground
          </p>
          <p className="text-xs text-muted">Infinite canvas</p>
        </div>
        <Button
          className="h-8 px-3 text-xs"
          onClick={addText}
          disabled={playground.layers.length >= MAX_LAYERS}
        >
          + Text
        </Button>
        <Button
          variant="outline"
          className="h-8 px-3 text-xs"
          onClick={addFrame}
          disabled={playground.frames.length >= MAX_FRAMES}
        >
          + Frame
        </Button>
        <Button
          variant="outline"
          className="hidden h-8 px-3 text-xs sm:inline-flex"
          onClick={duplicateSelection}
          disabled={selection.length === 0}
        >
          Duplicate
        </Button>
        <IconButton
          label="Delete selection"
          onClick={deleteSelection}
          disabled={selection.length === 0}
        >
          ⌫
        </IconButton>
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
          className="relative min-w-0 flex-1 touch-none overflow-hidden bg-[#eceef1]"
          style={{
            cursor,
            backgroundImage: "radial-gradient(circle, rgba(17,24,39,0.16) 1px, transparent 1px)",
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
                      color: active ? "#2563eb" : "#6b7280",
                    }}
                    onPointerDown={(event) => onNodePointerDown(event, frame.id)}
                  >
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
                      boxShadow: active
                        ? `0 0 0 ${2 / view.zoom}px #2563eb, 0 18px 45px rgba(17,24,39,0.16)`
                        : "0 18px 45px rgba(17,24,39,0.16)",
                    }}
                    onPointerDown={(event) => onNodePointerDown(event, frame.id)}
                    aria-label={`${frame.name} frame`}
                  />
                  {active && selection.length === 1 && (
                    <ResizeHandles
                      rect={rect}
                      zoom={view.zoom}
                      onStart={(event, handle) =>
                        onHandlePointerDown(
                          event,
                          frame.id,
                          handle,
                          rect,
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
                  {active && selection.length === 1 && !editing && (
                    <ResizeHandles
                      rect={rect}
                      zoom={view.zoom}
                      onStart={(event, handle) =>
                        onHandlePointerDown(
                          event,
                          layer.id,
                          handle,
                          rect,
                          MIN_LAYER_WIDTH,
                          MIN_LAYER_HEIGHT
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
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

          <div className="pointer-events-none absolute bottom-3 left-3 hidden rounded-md border border-black/10 bg-white/90 px-2.5 py-1.5 text-[10px] font-medium text-muted shadow-sm backdrop-blur md:block">
            Scroll to pan · ⌘/ctrl + scroll to zoom · Space + drag to grab · Drag empty canvas to
            marquee · T text · F frame · 1 fit
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

const HANDLE_POSITIONS: Record<Handle, { cursor: string; dx: number; dy: number }> = {
  nw: { cursor: "nwse-resize", dx: 0, dy: 0 },
  ne: { cursor: "nesw-resize", dx: 1, dy: 0 },
  sw: { cursor: "nesw-resize", dx: 0, dy: 1 },
  se: { cursor: "nwse-resize", dx: 1, dy: 1 },
};

function ResizeHandles({
  rect,
  zoom,
  onStart,
}: {
  rect: PlaygroundRect;
  zoom: number;
  onStart: (event: React.PointerEvent<HTMLElement>, handle: Handle) => void;
}) {
  const size = 10 / zoom;
  return (
    <>
      {(Object.keys(HANDLE_POSITIONS) as Handle[]).map((handle) => {
        const spot = HANDLE_POSITIONS[handle];
        return (
          <span
            key={handle}
            role="button"
            aria-label={`Resize ${handle}`}
            className="absolute z-10 bg-white"
            style={{
              left: rect.x + spot.dx * rect.width - size / 2,
              top: rect.y + spot.dy * rect.height - size / 2,
              width: size,
              height: size,
              border: `${1.5 / zoom}px solid #2563eb`,
              borderRadius: 2 / zoom,
              cursor: spot.cursor,
              touchAction: "none",
            }}
            onPointerDown={(event) => onStart(event, handle)}
          />
        );
      })}
    </>
  );
}

type InspectorProps = {
  doc: PlaygroundDocument;
  selectedLayers: PlaygroundTextLayer[];
  activeLayer: PlaygroundTextLayer | null;
  activeFrame: PlaygroundFrame | null;
  selection: string[];
  onSelect: (id: string, additive: boolean) => void;
  onPatchLayers: (patch: Partial<PlaygroundTextLayer>, coalesce?: boolean) => void;
  onPatchFrame: (id: string, patch: Partial<PlaygroundFrame>, coalesce?: boolean) => void;
  onAlign: (alignment: PlaygroundAlignment) => void;
  onReorder: (move: PlaygroundLayerMove) => void;
  onDelete: () => void;
};

function Inspector({
  doc,
  selectedLayers,
  activeLayer,
  activeFrame,
  selection,
  onSelect,
  onPatchLayers,
  onPatchFrame,
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
  return (
    <div className="min-h-0 flex-1 overflow-y-auto ts-scroll">
      {activeFrame ? (
        <InspectorSection title="Frame">
          <div className="space-y-3">
            <Field label="Name">
              <input
                value={activeFrame.name}
                onChange={(event) => onPatchFrame(activeFrame.id, { name: event.target.value })}
                className="h-8 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
              />
            </Field>
            <Field label="Preset">
              <Select
                aria-label="Frame preset"
                value={`${activeFrame.width}x${activeFrame.height}`}
                onChange={(event) => {
                  const preset = FRAME_PRESETS.find(
                    (item) => `${item.width}x${item.height}` === event.target.value
                  );
                  if (preset) {
                    onPatchFrame(
                      activeFrame.id,
                      { width: preset.width, height: preset.height },
                      false
                    );
                  }
                }}
              >
                {!FRAME_PRESETS.some(
                  (item) => item.width === activeFrame.width && item.height === activeFrame.height
                ) && (
                  <option value={`${activeFrame.width}x${activeFrame.height}`}>
                    Custom · {Math.round(activeFrame.width)} × {Math.round(activeFrame.height)}
                  </option>
                )}
                {FRAME_PRESETS.map((preset) => (
                  <option key={preset.label} value={`${preset.width}x${preset.height}`}>
                    {preset.label}
                  </option>
                ))}
              </Select>
            </Field>
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
                  max={4000}
                  onChange={(width) => onPatchFrame(activeFrame.id, { width })}
                />
              </Field>
              <Field label="Height">
                <NumberInput
                  value={activeFrame.height}
                  min={MIN_FRAME_SIZE}
                  max={4000}
                  onChange={(height) => onPatchFrame(activeFrame.id, { height })}
                />
              </Field>
            </div>
            <Field label="Background">
              <div className="flex h-8 items-center gap-2 rounded-md border border-line bg-white px-2">
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
              className="h-8 w-full rounded-md border border-line bg-white text-xs text-muted hover:border-fail hover:text-fail"
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
            Select text on the canvas to edit its typography. Add a frame for a new artboard —
            frames and text can go anywhere.
          </p>
        ) : (
          <div className="space-y-3">
            {activeLayer && (
              <Field label="Layer name">
                <input
                  value={activeLayer.name}
                  onChange={(event) => onPatchLayers({ name: event.target.value })}
                  className="h-8 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
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
              <div className="flex h-8 items-center gap-2 rounded-md border border-line bg-white px-2">
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
            <Field label="Text align">
              <div className="grid grid-cols-3 gap-1">
                {(["left", "center", "right"] as PlaygroundTextAlign[]).map((alignment) => (
                  <button
                    key={alignment}
                    onClick={() => onPatchLayers({ textAlign: alignment }, false)}
                    className={`h-8 rounded-md border text-xs capitalize ${shares("textAlign") && primary?.textAlign === alignment ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-white text-muted hover:bg-surface"}`}
                  >
                    {alignment}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Align inside frame">
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
                    className="h-8 rounded-md border border-line bg-white px-1 text-[10px] text-muted hover:bg-surface hover:text-ink"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            {activeLayer && (
              <Field label="Layer order">
                <div className="grid grid-cols-2 gap-1">
                  {(["front", "forward", "backward", "back"] as PlaygroundLayerMove[]).map(
                    (move) => (
                      <button
                        key={move}
                        onClick={() => onReorder(move)}
                        className="h-8 rounded-md border border-line bg-white text-[10px] capitalize text-muted hover:bg-surface hover:text-ink"
                      >
                        {move}
                      </button>
                    )
                  )}
                </div>
              </Field>
            )}
          </div>
        )}
      </InspectorSection>

      <InspectorSection title={`Canvas · ${doc.frames.length + doc.layers.length}`}>
        <div className="space-y-2">
          {doc.frames.map((frame) => (
            <div key={frame.id}>
              <LayerRow
                label={frame.name}
                caption={`${Math.round(frame.width)} × ${Math.round(frame.height)}`}
                glyph="▢"
                selected={selection.includes(frame.id)}
                onSelect={(additive) => onSelect(frame.id, additive)}
              />
              <div className="ml-3 border-l border-line pl-2">
                {layersInFrame(doc, frame.id).map((layer) => (
                  <LayerRow
                    key={layer.id}
                    label={layer.name}
                    caption={layer.text.replace(/\n/g, " ")}
                    glyph="T"
                    selected={selection.includes(layer.id)}
                    onSelect={(additive) => onSelect(layer.id, additive)}
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
                  onSelect={(additive) => onSelect(layer.id, additive)}
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
  onSelect,
}: {
  label: string;
  caption: string;
  glyph: string;
  selected: boolean;
  onSelect: (additive: boolean) => void;
}) {
  return (
    <button
      onClick={(event) => onSelect(event.shiftKey)}
      className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left ${selected ? "border-brand-600 bg-brand-50" : "border-transparent hover:border-line hover:bg-white"}`}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-white font-serif text-xs font-bold text-ink shadow-sm">
        {glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-ink">{label}</span>
        <span className="block truncate text-[10px] text-muted">{caption}</span>
      </span>
    </button>
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
      className="h-8 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
    />
  );
}
