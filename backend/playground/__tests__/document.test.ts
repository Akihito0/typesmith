import { describe, it, expect } from "vitest";
import {
  DEFAULT_PLAYGROUND,
  MIN_FRAME_SIZE,
  MIN_LAYER_WIDTH,
  alignPlaygroundLayer,
  createPlaygroundFrame,
  createPlaygroundTextLayer,
  drawnRect,
  duplicatePlaygroundNodes,
  fitFrameToContents,
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
  resizePlaygroundRect,
  updatePlaygroundFrame,
  updatePlaygroundLayers,
  type PlaygroundDocument,
} from "@/backend/playground/document";

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

describe("drawnRect", () => {
  it("builds a rect from a drag in any direction", () => {
    expect(drawnRect(100, 100, 340, 260)).toEqual({ x: 100, y: 100, width: 240, height: 160 });
    // Dragging up and to the left anchors on the release point instead.
    expect(drawnRect(340, 260, 100, 100)).toEqual({ x: 100, y: 100, width: 240, height: 160 });
  });

  it("locks both axes together when square is asked for", () => {
    const rect = drawnRect(0, 0, 300, 90, { square: true });
    expect(rect.width).toBe(300);
    expect(rect.height).toBe(300);
  });

  it("grows out of the anchor when drawing from the centre", () => {
    expect(drawnRect(200, 200, 300, 250, { fromCenter: true })).toEqual({
      x: 100,
      y: 150,
      width: 200,
      height: 100,
    });
  });

  it("never collapses below the requested minimum", () => {
    const rect = drawnRect(50, 50, 50, 50, { minWidth: 8, minHeight: 8 });
    expect(rect.width).toBe(8);
    expect(rect.height).toBe(8);
  });
});

describe("resizePlaygroundRect", () => {
  const origin = { x: 100, y: 100, width: 400, height: 200 };

  it("moves only the dragged edge", () => {
    expect(resizePlaygroundRect(origin, "e", 60, 999)).toEqual({
      x: 100,
      y: 100,
      width: 460,
      height: 200,
    });
    expect(resizePlaygroundRect(origin, "s", 999, 40)).toEqual({
      x: 100,
      y: 100,
      width: 400,
      height: 240,
    });
  });

  it("anchors the opposite edge when dragging north or west", () => {
    expect(resizePlaygroundRect(origin, "nw", 50, 50)).toEqual({
      x: 150,
      y: 150,
      width: 350,
      height: 150,
    });
  });

  it("leaves width and height independent by default", () => {
    const rect = resizePlaygroundRect(origin, "se", 200, 0);
    expect(rect.width).toBe(600);
    expect(rect.height).toBe(200);
  });

  it("keeps the starting ratio when aspect is requested", () => {
    const rect = resizePlaygroundRect(origin, "se", 200, 0, { aspect: true });
    expect(rect.width / rect.height).toBeCloseTo(origin.width / origin.height, 5);
  });

  it("resizes about the centre when asked", () => {
    const rect = resizePlaygroundRect(origin, "e", 50, 0, { fromCenter: true });
    expect(rect.width).toBe(500);
    expect(rect.x).toBe(50);
    expect(rect.x + rect.width / 2).toBe(origin.x + origin.width / 2);
  });

  it("respects the minimum size instead of inverting", () => {
    const rect = resizePlaygroundRect(origin, "se", -999, -999, { minWidth: 8, minHeight: 8 });
    expect(rect.width).toBe(8);
    expect(rect.height).toBe(8);
  });
});

describe("frame shapes", () => {
  it("defaults to a rectangle with no corner radius", () => {
    const frame = createPlaygroundFrame();
    expect(frame.shape).toBe("rectangle");
    expect(frame.radius).toBe(0);
  });

  it("caps the corner radius at half the short side", () => {
    const next = updatePlaygroundFrame(
      { frames: [createPlaygroundFrame({ id: "f", width: 300, height: 120 })], layers: [] },
      "f",
      { radius: 999 }
    );
    expect(next.frames[0].radius).toBe(60);
  });

  it("keeps an ellipse from claiming text in the corner of its box", () => {
    const document: PlaygroundDocument = {
      frames: [
        createPlaygroundFrame({
          id: "oval",
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          shape: "ellipse",
        }),
      ],
      layers: [
        createPlaygroundTextLayer({ id: "middle", x: 180, y: 180, width: 40, height: 40 }),
        createPlaygroundTextLayer({ id: "corner", x: 0, y: 0, width: 20, height: 20 }),
      ],
    };
    expect(frameForLayer(document, document.layers[0])?.id).toBe("oval");
    expect(frameForLayer(document, document.layers[1])).toBeNull();
  });

  it("restores shape and radius from stored documents", () => {
    const restored = normalizePlayground({
      frames: [{ id: "f", name: "F", x: 0, y: 0, width: 200, height: 200, shape: "ellipse" }],
      layers: [],
    });
    expect(restored.frames[0].shape).toBe("ellipse");
    // An unknown shape falls back to a rectangle rather than rendering nothing.
    expect(normalizePlayground({ frames: [{ id: "g" }], layers: [] }).frames[0].shape).toBe(
      "rectangle"
    );
  });
});

describe("fitFrameToContents", () => {
  it("hugs the text on the frame, padding included", () => {
    const document: PlaygroundDocument = {
      frames: [createPlaygroundFrame({ id: "f", x: 0, y: 0, width: 1200, height: 800 })],
      layers: [createPlaygroundTextLayer({ id: "t", x: 400, y: 300, width: 200, height: 100 })],
    };
    const next = fitFrameToContents(document, "f", 20);
    expect(next.frames[0]).toMatchObject({ x: 380, y: 280, width: 240, height: 140 });
  });

  it("leaves an empty frame alone", () => {
    const document: PlaygroundDocument = {
      frames: [createPlaygroundFrame({ id: "f", x: 0, y: 0, width: 500, height: 500 })],
      layers: [],
    };
    expect(fitFrameToContents(document, "f")).toBe(document);
  });
});
