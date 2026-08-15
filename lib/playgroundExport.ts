"use client";

import { fontById } from "./fonts";
import {
  frameForLayer,
  playgroundBounds,
  type PlaygroundDocument,
  type PlaygroundFrame,
  type PlaygroundRect,
  type PlaygroundTextLayer,
} from "./playground";

const CANVAS_EXPORT_PADDING = 80;
const CANVAS_EXPORT_BACKGROUND = "#eceef1";

function resolvedFontStack(stack: string): string {
  if (typeof document === "undefined") return stack;
  const styles = getComputedStyle(document.documentElement);
  return stack.replace(
    /var\((--[\w-]+)\)/g,
    (_, name: string) => styles.getPropertyValue(name).trim() || "sans-serif"
  );
}

function measuredWidth(ctx: CanvasRenderingContext2D, value: string, tracking: number): number {
  return ctx.measureText(value).width + Math.max(0, value.length - 1) * tracking;
}

function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  tracking: number
): string[] {
  if (!value.trim()) return [""];
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || measuredWidth(ctx, candidate, tracking) <= maxWidth) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTrackedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  layer: PlaygroundTextLayer,
  left: number,
  top: number,
  tracking: number,
  scale: number
) {
  const width = measuredWidth(ctx, line, tracking);
  let x = left;
  if (layer.textAlign === "center") x += (layer.width * scale - width) / 2;
  if (layer.textAlign === "right") x += layer.width * scale - width;
  for (const character of line) {
    ctx.fillText(character, x, top);
    x += ctx.measureText(character).width + tracking;
  }
}

async function loadLayerFont(layer: PlaygroundTextLayer) {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const stack = resolvedFontStack(fontById(layer.fontId).stack);
  try {
    await document.fonts.load(`${layer.fontWeight} ${layer.fontSize}px ${stack}`);
  } catch {
    // Canvas will use the font stack fallback when a remote or uploaded face is unavailable.
  }
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: PlaygroundTextLayer,
  origin: PlaygroundRect,
  scale: number
) {
  const left = (layer.x - origin.x) * scale;
  const top = (layer.y - origin.y) * scale;
  const fontSize = layer.fontSize * scale;
  const lineHeight = fontSize * layer.lineHeight;
  const tracking = layer.letterSpacing * fontSize;
  const stack = resolvedFontStack(fontById(layer.fontId).stack);

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, layer.width * scale, layer.height * scale);
  ctx.clip();
  ctx.font = `${layer.fontWeight} ${fontSize}px ${stack}`;
  ctx.fillStyle = layer.color;
  const lines = layer.text
    .split("\n")
    .flatMap((paragraph) => wrapParagraph(ctx, paragraph, layer.width * scale, tracking));
  const maxLines = Math.max(1, Math.floor((layer.height * scale) / lineHeight));
  lines.slice(0, maxLines).forEach((line, index) => {
    drawTrackedLine(ctx, line, layer, left, top + index * lineHeight, tracking, scale);
  });
  ctx.restore();
}

function download(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

/** Render one frame, or the whole canvas when `frameId` is null, to a PNG. */
export async function exportPlaygroundPng(
  documentState: PlaygroundDocument,
  frameId: string | null = null,
  filename = "typesmith-playground.png"
): Promise<void> {
  const frame = frameId ? documentState.frames.find((item) => item.id === frameId) : null;
  if (frameId && !frame) throw new Error("That frame is no longer on the canvas.");

  const origin: PlaygroundRect = frame
    ? { x: frame.x, y: frame.y, width: frame.width, height: frame.height }
    : (() => {
        const bounds = playgroundBounds(documentState);
        return {
          x: bounds.x - CANVAS_EXPORT_PADDING,
          y: bounds.y - CANVAS_EXPORT_PADDING,
          width: bounds.width + CANVAS_EXPORT_PADDING * 2,
          height: bounds.height + CANVAS_EXPORT_PADDING * 2,
        };
      })();

  const paintedFrames: PlaygroundFrame[] = frame ? [] : documentState.frames;
  const layers = frame
    ? documentState.layers.filter((layer) => frameForLayer(documentState, layer)?.id === frame.id)
    : documentState.layers;

  await Promise.all(layers.map(loadLayerFont));

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(origin.width * scale);
  canvas.height = Math.round(origin.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas export is not available in this browser.");

  ctx.fillStyle = frame ? frame.background : CANVAS_EXPORT_BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = "top";

  paintedFrames.forEach((item) => {
    ctx.fillStyle = item.background;
    ctx.fillRect(
      (item.x - origin.x) * scale,
      (item.y - origin.y) * scale,
      item.width * scale,
      item.height * scale
    );
  });

  layers.forEach((layer) => drawLayer(ctx, layer, origin, scale));

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The PNG could not be created.");
  download(blob, filename);
}
