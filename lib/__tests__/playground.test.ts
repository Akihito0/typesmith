import { describe, it, expect } from "vitest";
import {
  DEFAULT_PLAYGROUND,
  MIN_FRAME_SIZE,
  MIN_LAYER_WIDTH,
  alignPlaygroundLayer,
  createPlaygroundFrame,
  createPlaygroundTextLayer,
  duplicatePlaygroundNodes,
  frameForLayer,
  layersInFrame,
  looseLayers,
  nextFrameOrigin,
  normalizePlayground,
  patchPlaygroundNodes,
  playgroundBounds,
  playgroundNodesBounds,
  removePlaygroundNodes,
  reorderPlaygroundLayer,
  updatePlaygroundFrame,
  updatePlaygroundLayers,
  type PlaygroundDocument,
} from "../playground";

function doc(): PlaygroundDocument {
  return {
    frames: [
      createPlaygroundFrame({ id: "f1", name: "One", x: 0, y: 0, width: 400, height: 400 }),
      createPlaygroundFrame({ id: "f2", name: "Two", x: 600, y: 0, width: 400, height: 400 }),
    ],
    layers: [
      createPlaygroundTextLayer({ id: "a", x: 20, y: 20, width: 100, height: 40 }),
      createPlaygroundTextLayer({ id: "b", x: 620, y: 20, width: 100, height: 40 }),
      createPlaygroundTextLayer({ id: "c", x: 0, y: 900, width: 100, height: 40 }),
    ],
  };
}

describe("frame membership", () => {
  it("assigns a layer to the frame containing its centre", () => {
    const d = doc();
    expect(frameForLayer(d, d.layers[0])?.id).toBe("f1");
    expect(frameForLayer(d, d.layers[1])?.id).toBe("f2");
    expect(frameForLayer(d, d.layers[2])).toBeNull();
  });

  it("lists a frame's layers and the ones loose on the canvas", () => {
    const d = doc();
    expect(layersInFrame(d, "f1").map((l) => l.id)).toEqual(["a"]);
    expect(looseLayers(d).map((l) => l.id)).toEqual(["c"]);
  });

  it("re-homes a layer when it is dragged onto another frame", () => {
    const d = patchPlaygroundNodes(doc(), { a: { x: 620, y: 20, width: 100, height: 40 } });
    expect(frameForLayer(d, d.layers[0])?.id).toBe("f2");
    expect(layersInFrame(d, "f1")).toHaveLength(0);
  });
});

describe("geometry", () => {
  it("does not clamp layers to any frame — the canvas is unbounded", () => {
    const d = updatePlaygroundLayers(doc(), ["a"], { x: -900, y: -1200 });
    expect(d.layers[0].x).toBe(-900);
    expect(d.layers[0].y).toBe(-1200);
  });

  it("enforces minimum sizes", () => {
    const d = updatePlaygroundLayers(doc(), ["a"], { width: 1, height: 1 });
    expect(d.layers[0].width).toBe(MIN_LAYER_WIDTH);
    const framed = updatePlaygroundFrame(doc(), "f1", { width: 1 });
    expect(framed.frames[0].width).toBe(MIN_FRAME_SIZE);
  });

  it("patches frames and layers in one batch", () => {
    const d = patchPlaygroundNodes(doc(), { f1: { x: 50 }, a: { x: 70 } });
    expect(d.frames[0].x).toBe(50);
    expect(d.layers[0].x).toBe(70);
  });

  it("measures canvas and selection bounds", () => {
    const d = doc();
    expect(playgroundBounds(d)).toEqual({ x: 0, y: 0, width: 1000, height: 940 });
    expect(playgroundNodesBounds(d, ["f2"])).toEqual({ x: 600, y: 0, width: 400, height: 400 });
    expect(playgroundNodesBounds(d, ["nope"])).toBeNull();
  });

  it("places a new frame clear of everything already on the canvas", () => {
    expect(nextFrameOrigin(doc())).toEqual({ x: 1120, y: 0 });
    expect(nextFrameOrigin({ frames: [], layers: [] })).toEqual({ x: 0, y: 0 });
  });
});

describe("alignment", () => {
  it("aligns a layer inside its own frame, not the origin", () => {
    const d = alignPlaygroundLayer(doc(), "b", "center-x");
    expect(d.layers[1].x).toBe(600 + (400 - 100) / 2);
  });

  it("leaves loose layers alone", () => {
    const d = alignPlaygroundLayer(doc(), "c", "left");
    expect(d.layers[2].x).toBe(0);
  });
});

describe("structure", () => {
  it("deleting a frame deletes the text sitting on it", () => {
    const d = removePlaygroundNodes(doc(), ["f1"]);
    expect(d.frames.map((f) => f.id)).toEqual(["f2"]);
    expect(d.layers.map((l) => l.id)).toEqual(["b", "c"]);
  });

  it("duplicating a frame copies its layers and parks it clear of the canvas", () => {
    const { document: d, ids } = duplicatePlaygroundNodes(doc(), ["f1"]);
    expect(d.frames).toHaveLength(3);
    expect(d.layers).toHaveLength(4);
    const copy = d.frames[2];
    // Right of everything, so it cannot adopt another frame's text.
    expect(copy.x).toBe(1120);
    expect(ids).toContain(copy.id);
    expect(layersInFrame(d, copy.id)).toHaveLength(1);
    expect(layersInFrame(d, "f2").map((l) => l.id)).toEqual(["b"]);
  });

  it("duplicates a loose layer with an offset", () => {
    const { document: d, ids } = duplicatePlaygroundNodes(doc(), ["c"]);
    const copy = d.layers.find((l) => l.id === ids[0])!;
    expect(copy.x).toBe(32);
    expect(copy.y).toBe(932);
  });

  it("reorders layers for z-order", () => {
    const d = reorderPlaygroundLayer(doc(), "a", "front");
    expect(d.layers.map((l) => l.id)).toEqual(["b", "c", "a"]);
  });
});

describe("normalizePlayground", () => {
  it("migrates a legacy single-artboard document into one frame", () => {
    const d = normalizePlayground({
      width: 1000,
      height: 700,
      background: "#fef3c7",
      layers: [{ id: "old", name: "Old", text: "hi", x: 60, y: 60, width: 200, height: 50 }],
    });
    expect(d.frames).toHaveLength(1);
    expect(d.frames[0]).toMatchObject({
      x: 0,
      y: 0,
      width: 1000,
      height: 700,
      background: "#fef3c7",
    });
    // Artboard coordinates are already canvas coordinates once it sits at the origin.
    expect(d.layers[0]).toMatchObject({ id: "old", x: 60, y: 60 });
    expect(frameForLayer(d, d.layers[0])?.id).toBe(d.frames[0].id);
  });

  it("round-trips a multi-frame document", () => {
    const d = normalizePlayground(doc());
    expect(d.frames.map((f) => f.id)).toEqual(["f1", "f2"]);
    expect(d.layers.map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("falls back to the default canvas for junk input", () => {
    expect(normalizePlayground(null).frames).toHaveLength(DEFAULT_PLAYGROUND.frames.length);
    expect(normalizePlayground("nope").layers).toHaveLength(DEFAULT_PLAYGROUND.layers.length);
  });

  it("drops invalid values instead of the whole document", () => {
    const d = normalizePlayground({
      frames: [{ id: "f", name: "F", x: 0, y: 0, width: "wide", height: 500, background: "red" }],
      layers: [{ id: "l", x: 10, y: 10, fontSize: 9999, color: "#00ff00" }],
    });
    expect(d.frames[0].background).toBe(DEFAULT_PLAYGROUND.frames[0].background);
    expect(d.frames[0].height).toBe(500);
    expect(d.layers[0].fontSize).toBe(400);
    expect(d.layers[0].color).toBe("#00ff00");
  });
});
