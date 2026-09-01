import { describe, it, expect } from "vitest";
import {
  DEFAULT_PLAYGROUND,
  MIN_FRAME_SIZE,
  MIN_LAYER_WIDTH,
  alignPlaygroundLayer,
  createPlaygroundFrame,
  createPlaygroundTextLayer,
  alignPlaygroundNodes,
  copyPlaygroundNodes,
  distributePlaygroundNodes,
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
  pastePlaygroundNodes,
  removePlaygroundNodes,
  reorderPlaygroundLayer,
  reorderPlaygroundNode,
  resizePlaygroundRect,
  rotateDelta,
  rotatedBounds,
  setPlaygroundNodeFlags,
  snapRect,
  snapTargets,
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

describe("rotation geometry", () => {
  const rect = { x: 0, y: 0, width: 200, height: 100 };

  it("leaves an unrotated rect alone", () => {
    expect(rotatedBounds(rect, 0)).toEqual(rect);
  });

  it("swaps the axes at a quarter turn, about the same centre", () => {
    const turned = rotatedBounds(rect, 90);
    expect(turned.width).toBeCloseTo(100, 6);
    expect(turned.height).toBeCloseTo(200, 6);
    expect(turned.x + turned.width / 2).toBeCloseTo(rect.x + rect.width / 2, 6);
    expect(turned.y + turned.height / 2).toBeCloseTo(rect.y + rect.height / 2, 6);
  });

  it("grows the box on the diagonal", () => {
    const turned = rotatedBounds({ x: 0, y: 0, width: 100, height: 100 }, 45);
    expect(turned.width).toBeCloseTo(Math.SQRT2 * 100, 6);
  });

  it("maps a drag into the node's own axes", () => {
    // At 90°, dragging right in screen space pushes "up" in the node's frame.
    const local = rotateDelta(10, 0, 90);
    expect(local.dx).toBeCloseTo(0, 6);
    expect(local.dy).toBeCloseTo(-10, 6);
    expect(rotateDelta(10, 5, 0)).toEqual({ dx: 10, dy: 5 });
  });

  it("wraps rather than clamps, so 370 and -350 agree", () => {
    const a = createPlaygroundFrame({ rotation: 370 });
    const b = createPlaygroundFrame({ rotation: -350 });
    expect(a.rotation).toBeCloseTo(10, 6);
    expect(b.rotation).toBeCloseTo(10, 6);
    expect(createPlaygroundFrame({ rotation: 190 }).rotation).toBeCloseTo(-170, 6);
  });

  it("counts a rotated node's real extent in the canvas bounds", () => {
    const document: PlaygroundDocument = {
      frames: [
        createPlaygroundFrame({ id: "f", x: 0, y: 0, width: 200, height: 100, rotation: 90 }),
      ],
      layers: [],
    };
    expect(playgroundBounds(document).width).toBeCloseTo(100, 6);
    expect(playgroundBounds(document).height).toBeCloseTo(200, 6);
  });
});

describe("snapping", () => {
  const target = { x: 100, y: 100, width: 200, height: 200 };

  it("pulls a near edge into line and reports a guide", () => {
    const result = snapRect({ x: 103, y: 400, width: 50, height: 50 }, [target]);
    expect(result.rect.x).toBe(100);
    expect(result.guides.some((g) => g.axis === "x" && g.position === 100)).toBe(true);
  });

  it("snaps centres, not just edges", () => {
    // Target centre is 200; a 50-wide rect centres there from x = 175.
    const result = snapRect({ x: 173, y: 400, width: 50, height: 50 }, [target]);
    expect(result.rect.x).toBe(175);
  });

  it("leaves a rect alone once it is beyond tolerance", () => {
    const rect = { x: 140, y: 400, width: 50, height: 50 };
    const result = snapRect(rect, [target]);
    expect(result.rect).toEqual(rect);
    expect(result.guides).toHaveLength(0);
  });

  it("snaps each axis independently", () => {
    const result = snapRect({ x: 103, y: 297, width: 50, height: 50 }, [target]);
    expect(result.rect.x).toBe(100);
    expect(result.rect.y).toBe(300);
    expect(result.guides).toHaveLength(2);
  });

  it("does not offer the dragged node or hidden nodes as targets", () => {
    const document: PlaygroundDocument = {
      frames: [
        createPlaygroundFrame({ id: "f1" }),
        createPlaygroundFrame({ id: "f2", hidden: true }),
      ],
      layers: [createPlaygroundTextLayer({ id: "t1" })],
    };
    const ids = snapTargets(document, ["f1"]).length;
    expect(ids).toBe(1); // f1 excluded, f2 hidden, t1 remains
  });
});

describe("align and distribute", () => {
  function spread(): PlaygroundDocument {
    return {
      frames: [],
      layers: [
        createPlaygroundTextLayer({ id: "a", x: 0, y: 0, width: 100, height: 50 }),
        createPlaygroundTextLayer({ id: "b", x: 250, y: 80, width: 100, height: 50 }),
        createPlaygroundTextLayer({ id: "c", x: 500, y: 160, width: 100, height: 50 }),
      ],
    };
  }

  it("aligns a multi-selection to its own bounds", () => {
    const next = alignPlaygroundNodes(spread(), ["a", "b", "c"], "left");
    expect(next.layers.map((l) => l.x)).toEqual([0, 0, 0]);
  });

  it("centres a multi-selection on the selection's midline", () => {
    const next = alignPlaygroundNodes(spread(), ["a", "b", "c"], "center-y");
    const centres = next.layers.map((l) => l.y + l.height / 2);
    expect(new Set(centres).size).toBe(1);
  });

  it("evens the gaps and leaves the outer two put", () => {
    const next = distributePlaygroundNodes(spread(), ["a", "b", "c"], "horizontal");
    const [a, b, c] = next.layers;
    expect(a.x).toBe(0);
    expect(c.x).toBe(500);
    expect(b.x - (a.x + a.width)).toBe(c.x - (b.x + b.width));
  });

  it("needs three nodes before distributing means anything", () => {
    const document = spread();
    expect(distributePlaygroundNodes(document, ["a", "b"], "horizontal")).toBe(document);
  });

  it("never moves a locked node", () => {
    const document = setPlaygroundNodeFlags(spread(), ["b"], { locked: true });
    const next = alignPlaygroundNodes(document, ["a", "b", "c"], "left");
    expect(next.layers.find((l) => l.id === "b")?.x).toBe(250);
  });
});

describe("lock, hide, and z-order", () => {
  it("flags any mix of frames and text", () => {
    const document: PlaygroundDocument = {
      frames: [createPlaygroundFrame({ id: "f" })],
      layers: [createPlaygroundTextLayer({ id: "t" })],
    };
    const next = setPlaygroundNodeFlags(document, ["f", "t"], { hidden: true });
    expect(next.frames[0].hidden).toBe(true);
    expect(next.layers[0].hidden).toBe(true);
  });

  it("reorders frames among frames, not into the text list", () => {
    const document: PlaygroundDocument = {
      frames: [createPlaygroundFrame({ id: "f1" }), createPlaygroundFrame({ id: "f2" })],
      layers: [createPlaygroundTextLayer({ id: "t" })],
    };
    const next = reorderPlaygroundNode(document, "f1", "front");
    expect(next.frames.map((f) => f.id)).toEqual(["f2", "f1"]);
    expect(next.layers).toHaveLength(1);
  });

  it("still routes text through the layer reorder", () => {
    const document: PlaygroundDocument = {
      frames: [],
      layers: [createPlaygroundTextLayer({ id: "t1" }), createPlaygroundTextLayer({ id: "t2" })],
    };
    expect(reorderPlaygroundNode(document, "t1", "front").layers.map((l) => l.id)).toEqual([
      "t2",
      "t1",
    ]);
  });
});

describe("copy and paste", () => {
  function doc(): PlaygroundDocument {
    return {
      frames: [createPlaygroundFrame({ id: "f", x: 0, y: 0, width: 400, height: 400 })],
      layers: [
        createPlaygroundTextLayer({ id: "inside", x: 50, y: 50, width: 100, height: 40 }),
        createPlaygroundTextLayer({ id: "loose", x: 900, y: 900, width: 100, height: 40 }),
      ],
    };
  }

  it("carries the text sitting on a copied frame", () => {
    const clip = copyPlaygroundNodes(doc(), ["f"]);
    expect(clip.frames).toHaveLength(1);
    expect(clip.layers.map((l) => l.id)).toEqual(["inside"]);
  });

  it("pastes with fresh ids and an offset", () => {
    const source = doc();
    const clip = copyPlaygroundNodes(source, ["loose"]);
    const { document: next, ids } = pastePlaygroundNodes(source, clip, 32);
    expect(next.layers).toHaveLength(3);
    expect(ids[0]).not.toBe("loose");
    const pasted = next.layers.find((l) => l.id === ids[0]);
    expect(pasted?.x).toBe(932);
  });

  it("pasting twice keeps making new nodes rather than replacing", () => {
    const source = doc();
    const clip = copyPlaygroundNodes(source, ["loose"]);
    const once = pastePlaygroundNodes(source, clip);
    const twice = pastePlaygroundNodes(once.document, clip);
    expect(twice.document.layers).toHaveLength(4);
  });
});
