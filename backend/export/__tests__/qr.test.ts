import { describe, expect, it } from "vitest";
import {
  blockLayout,
  byteCapacity,
  encodeQr,
  qrToSvg,
  qrDataUri,
  type Ecc,
  type QrCode,
} from "@/backend/export/qr";

// The capacity tables in lib/qr.ts are the part most likely to hold a silent
// typo: a wrong entry still produces a plausible-looking grid that no scanner
// can read. These are the byte-mode capacities published in ISO/IEC 18004, so
// they check the ECC-codewords and block-count tables end to end.
const PUBLISHED_CAPACITY: [number, Ecc, number][] = [
  [1, "L", 17],
  [1, "M", 14],
  [1, "Q", 11],
  [1, "H", 7],
  [2, "L", 32],
  [2, "M", 26],
  [3, "H", 24],
  [4, "L", 78],
  [10, "L", 271],
  [10, "M", 213],
  [10, "H", 119],
  [13, "H", 177],
  [15, "L", 520],
  [22, "H", 439],
  [40, "L", 2953],
  [40, "M", 2331],
  [40, "Q", 1663],
  [40, "H", 1273],
];

describe("qr capacity tables", () => {
  it.each(PUBLISHED_CAPACITY)("version %i level %s holds %i bytes", (ver, ecc, expected) => {
    expect(byteCapacity(ver, ecc)).toBe(expected);
  });

  it("picks the smallest version that fits", () => {
    const cap = byteCapacity(1, "M");
    expect(encodeQr("a".repeat(cap), "M").version).toBe(1);
    expect(encodeQr("a".repeat(cap + 1), "M").version).toBe(2);
  });

  it("throws rather than truncating when the payload can't fit", () => {
    expect(() => encodeQr("a".repeat(byteCapacity(40, "H") + 1), "H")).toThrow(/too long/i);
  });
});

describe("qr structure", () => {
  const qr = encodeQr("https://typesmith.app/editor?s=1.abcdef", "M");

  it("sizes the grid as 4·version + 17", () => {
    expect(qr.size).toBe(qr.version * 4 + 17);
  });

  it("draws the three finder patterns", () => {
    const corners: [number, number][] = [
      [0, 0],
      [qr.size - 7, 0],
      [0, qr.size - 7],
    ];
    for (const [ox, oy] of corners) {
      for (let dy = 0; dy < 7; dy++) {
        for (let dx = 0; dx < 7; dx++) {
          const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
          expect(qr.modules[oy + dy][ox + dx]).toBe(ring !== 2);
        }
      }
    }
  });

  it("draws alternating timing patterns", () => {
    for (let i = 8; i < qr.size - 8; i++) {
      expect(qr.modules[6][i]).toBe(i % 2 === 0);
      expect(qr.modules[i][6]).toBe(i % 2 === 0);
    }
  });

  it("sets the always-dark module", () => {
    expect(qr.modules[qr.size - 8][8]).toBe(true);
  });

  it("is not blank or fully dark", () => {
    const dark = qr.modules.flat().filter(Boolean).length;
    const total = qr.size * qr.size;
    expect(dark).toBeGreaterThan(total * 0.3);
    expect(dark).toBeLessThan(total * 0.7);
  });
});

// --- Independent read-back ---------------------------------------------------
// Reverses the encoder without reusing its drawing code: rebuild the function
// module map from the spec, recover the mask from the format bits, walk the
// zigzag, de-interleave the blocks, and parse the byte-mode segment. This
// covers placement, masking, format info, and block layout together.

function functionMap(size: number, version: number): boolean[][] {
  const fn = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const mark = (x: number, y: number) => {
    if (x >= 0 && x < size && y >= 0 && y < size) fn[y][x] = true;
  };

  // Finders + separators + the format-info bands beside them
  for (const [ox, oy] of [
    [0, 0],
    [size - 8, 0],
    [0, size - 8],
  ]) {
    for (let dy = 0; dy < 9; dy++) for (let dx = 0; dx < 9; dx++) mark(ox + dx, oy + dy);
  }
  // Timing
  for (let i = 0; i < size; i++) {
    mark(6, i);
    mark(i, 6);
  }
  // Alignment
  const numAlign = Math.floor(version / 7) + 2;
  if (version > 1) {
    const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const pos: number[] = [6];
    for (let p = version * 4 + 10; pos.length < numAlign; p -= step) pos.splice(1, 0, p);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === pos.length - 1) ||
          (i === pos.length - 1 && j === 0)
        )
          continue;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) mark(pos[i] + dx, pos[j] + dy);
      }
    }
  }
  // Version blocks
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      mark(a, b);
      mark(b, a);
    }
  }
  return fn;
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

/** Recover the mask index from the top-left copy of the format information. */
function readMask(qr: QrCode): number {
  let raw = 0;
  const read = (x: number, y: number) => (qr.modules[y][x] ? 1 : 0);
  for (let i = 0; i <= 5; i++) raw |= read(8, i) << i;
  raw |= read(8, 7) << 6;
  raw |= read(8, 8) << 7;
  raw |= read(7, 8) << 8;
  for (let i = 9; i < 15; i++) raw |= read(14 - i, 8) << i;
  const bits = raw ^ 0x5412;
  return (bits >>> 10) & 0b111;
}

function decode(qr: QrCode): string {
  const { size, version, ecc } = qr;
  const fn = functionMap(size, version);
  const mask = readMask(qr);

  // Unmask and walk the zigzag back into the interleaved codeword stream.
  const bits: number[] = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (fn[y][x]) continue;
        const dark = qr.modules[y][x] !== maskBit(mask, x, y);
        bits.push(dark ? 1 : 0);
      }
    }
  }
  const stream: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    stream.push(byte);
  }

  // De-interleave: rebuild the per-block data sections, dropping ECC. The
  // block sizes come from the library (the capacity suite above already pins
  // those tables against published values); everything else here is derived
  // independently of the encoder.
  const { numBlocks, eccPerBlock: blockEccLen, rawCodewords } = blockLayout(version, ecc);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const shortDataLen = shortBlockLen - blockEccLen;

  const blocks: number[][] = Array.from({ length: numBlocks }, () => []);
  let idx = 0;
  for (let i = 0; i < shortDataLen + 1; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i === shortDataLen && b < numShortBlocks) continue;
      blocks[b].push(stream[idx++]);
    }
  }
  const data = blocks.flat();

  // Parse the byte-mode segment.
  const readBits = (offset: number, len: number) => {
    let value = 0;
    for (let i = 0; i < len; i++) {
      const bit = (data[(offset + i) >>> 3] >>> (7 - ((offset + i) & 7))) & 1;
      value = (value << 1) | bit;
    }
    return value;
  };
  expect(readBits(0, 4)).toBe(0b0100); // byte mode
  const ccBits = version <= 9 ? 8 : 16;
  const len = readBits(4, ccBits);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = readBits(4 + ccBits + i * 8, 8);
  return new TextDecoder().decode(out);
}

describe("qr round-trip", () => {
  const cases: [string, Ecc][] = [
    ["hi", "M"],
    ["https://typesmith.app/editor?s=1.eJyrVkrLz1eyUsrMSwcA", "M"],
    ["a".repeat(120), "L"],
    ["Ünïcödé — em dash, curly “quotes”", "Q"],
    ["x".repeat(300), "H"],
  ];

  it.each(cases)("recovers %s at level %s", (text, ecc) => {
    expect(decode(encodeQr(text, ecc))).toBe(text);
  });
});

describe("qr svg", () => {
  it("includes a 4-module quiet zone by default", () => {
    const qr = encodeQr("hello", "M");
    expect(qrToSvg(qr)).toContain(`viewBox="0 0 ${qr.size + 8} ${qr.size + 8}"`);
  });

  it("produces a usable data URI", () => {
    const uri = qrDataUri("hello");
    expect(uri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(uri.split(",")[1])).toContain("<svg");
  });
});
