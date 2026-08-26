// Minimal QR Code encoder — byte mode, versions 1–40, all four ECC levels.
//
// Hand-rolled on purpose: the share flow wants a scannable code and CLAUDE.md
// rules out a new runtime dependency for it. Follows ISO/IEC 18004 (the same
// structure as the well-known reference implementations): pick the smallest
// version that fits, Reed–Solomon the data, interleave the blocks, draw the
// function patterns, then choose the mask with the lowest penalty score.
//
// Framework-free and synchronous — safe to call during render.

export type Ecc = "L" | "M" | "Q" | "H";

export interface QrCode {
  /** Width/height in modules (21 for version 1, +4 per version). */
  size: number;
  /** modules[y][x] — true is a dark module. */
  modules: boolean[][];
  version: number;
  ecc: Ecc;
}

// --- Spec tables ------------------------------------------------------------
// Indexed by version; index 0 is unused padding so version N reads at [N].

const ECC_CODEWORDS_PER_BLOCK: Record<Ecc, number[]> = {
  L: [
    -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30,
    30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  M: [
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  ],
  Q: [
    -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30,
    30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  H: [
    -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
};

const NUM_ERROR_CORRECTION_BLOCKS: Record<Ecc, number[]> = {
  L: [
    -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14,
    15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
  ],
  M: [
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23,
    25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
  Q: [
    -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34,
    34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68,
  ],
  H: [
    -1, 1, 1, 2, 4, 4, 4, 5, 5, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35,
    37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81,
  ],
};

/** Format-info bits per ECC level (not the same order as the enum). */
const ECC_FORMAT_BITS: Record<Ecc, number> = { L: 1, M: 0, Q: 3, H: 2 };

const MIN_VERSION = 1;
const MAX_VERSION = 40;

// --- Galois field GF(256), primitive polynomial 0x11D -----------------------

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

/** Reed–Solomon generator polynomial of the given degree (coefficients only). */
function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((d, i) => {
      result[i] ^= gfMul(d, factor);
    });
  }
  return result;
}

// --- Capacity ---------------------------------------------------------------

/** Data + ECC modules available (excludes function patterns and format info). */
function numRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

function numDataCodewords(ver: number, ecc: Ecc): number {
  return (
    Math.floor(numRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecc][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecc][ver]
  );
}

/** Byte-mode character-count field width for this version. */
function charCountBits(ver: number): number {
  return ver <= 9 ? 8 : 16;
}

/**
 * Maximum byte-mode payload for a version/level — the numbers published in the
 * spec's capacity tables. Exported so the unit tests can pin the tables above
 * against known-good values (a single wrong entry silently produces codes that
 * no scanner can read).
 */
export function byteCapacity(ver: number, ecc: Ecc): number {
  return Math.floor((numDataCodewords(ver, ecc) * 8 - 4 - charCountBits(ver)) / 8);
}

/** How the codewords are split into Reed–Solomon blocks for a version/level. */
export function blockLayout(ver: number, ecc: Ecc) {
  return {
    numBlocks: NUM_ERROR_CORRECTION_BLOCKS[ecc][ver],
    eccPerBlock: ECC_CODEWORDS_PER_BLOCK[ecc][ver],
    rawCodewords: Math.floor(numRawDataModules(ver) / 8),
  };
}

// --- Bit buffer -------------------------------------------------------------

function appendBits(bits: number[], value: number, len: number): void {
  for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

// --- Block layout -----------------------------------------------------------

function addEccAndInterleave(data: number[], ver: number, ecc: Ecc): number[] {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecc][ver];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecc][ver];
  const rawCodewords = Math.floor(numRawDataModules(ver) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks: number[][] = [];
  const divisor = rsDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const parity = rsRemainder(dat, divisor);
    // Short blocks get a placeholder so every block is the same length while
    // interleaving; the padding column is skipped below.
    if (i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(parity));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

// --- Drawing ----------------------------------------------------------------

function alignmentPatternPositions(ver: number): number[] {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  for (let pos = ver * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

class Drawing {
  readonly size: number;
  readonly modules: boolean[][];
  private readonly isFunction: boolean[][];

  constructor(
    private readonly version: number,
    private readonly ecc: Ecc
  ) {
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false)
    );
    this.isFunction = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false)
    );
  }

  private setFunction(x: number, y: number, dark: boolean): void {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  }

  drawFunctionPatterns(): void {
    // Timing patterns
    for (let i = 0; i < this.size; i++) {
      this.setFunction(6, i, i % 2 === 0);
      this.setFunction(i, 6, i % 2 === 0);
    }

    // Finders (with their separators)
    this.drawFinder(3, 3);
    this.drawFinder(this.size - 4, 3);
    this.drawFinder(3, this.size - 4);

    // Alignment patterns, skipping the three finder corners
    const pos = alignmentPatternPositions(this.version);
    const n = pos.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        this.drawAlignment(pos[i], pos[j]);
      }
    }

    // Reserve format/version areas (real bits are written per-mask later)
    this.drawFormatBits(0);
    this.drawVersionBits();
  }

  private drawFinder(cx: number, cy: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
          this.setFunction(x, y, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  private drawAlignment(cx: number, cy: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  drawFormatBits(mask: number): void {
    const data = (ECC_FORMAT_BITS[this.ecc] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;

    const bit = (i: number) => ((bits >>> i) & 1) !== 0;

    // Top-left copy
    for (let i = 0; i <= 5; i++) this.setFunction(8, i, bit(i));
    this.setFunction(8, 7, bit(6));
    this.setFunction(8, 8, bit(7));
    this.setFunction(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.setFunction(14 - i, 8, bit(i));

    // Second copy, split across the other two finders
    for (let i = 0; i < 8; i++) this.setFunction(this.size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.setFunction(8, this.size - 15 + i, bit(i));
    this.setFunction(8, this.size - 8, true); // always-dark module
  }

  private drawVersionBits(): void {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;

    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunction(a, b, dark);
      this.setFunction(b, a, dark);
    }
  }

  /** Zigzag placement of the interleaved codewords. */
  drawCodewords(data: number[]): void {
    let i = 0; // bit index
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; // skip the vertical timing column
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
          // Remaining modules past the data stream stay light, per the spec.
        }
      }
    }
  }

  /** XOR the mask over every non-function module (its own inverse). */
  applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.isFunction[y][x]) continue;
        let invert: boolean;
        switch (mask) {
          case 0:
            invert = (x + y) % 2 === 0;
            break;
          case 1:
            invert = y % 2 === 0;
            break;
          case 2:
            invert = x % 3 === 0;
            break;
          case 3:
            invert = (x + y) % 3 === 0;
            break;
          case 4:
            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          case 5:
            invert = ((x * y) % 2) + ((x * y) % 3) === 0;
            break;
          case 6:
            invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
          default:
            invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
        }
        if (invert) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  /**
   * The four penalty rules from the spec; lower is better. Rule 3 uses the
   * common literal-pattern formulation (scan each line for the two 11-module
   * finder-lookalike sequences) rather than run-length bookkeeping — same
   * intent, far easier to read and verify.
   */
  penaltyScore(): number {
    const N1 = 3;
    const N2 = 3;
    const N3 = 40;
    const N4 = 10;
    let result = 0;

    const lines: boolean[][] = [];
    for (let y = 0; y < this.size; y++) lines.push(this.modules[y].slice());
    for (let x = 0; x < this.size; x++) {
      lines.push(this.modules.map((row) => row[x]));
    }

    // 1 — runs of five or more same-coloured modules
    for (const line of lines) {
      let runLength = 1;
      for (let i = 1; i <= line.length; i++) {
        if (i < line.length && line[i] === line[i - 1]) {
          runLength++;
        } else {
          if (runLength >= 5) result += N1 + (runLength - 5);
          runLength = 1;
        }
      }
    }

    // 3 — 1:1:3:1:1 finder-lookalikes with a light margin on either side
    const P1 = [true, false, true, true, true, false, true, false, false, false, false];
    const P2 = [false, false, false, false, true, false, true, true, true, false, true];
    for (const line of lines) {
      for (let i = 0; i + 11 <= line.length; i++) {
        const window = line.slice(i, i + 11);
        if (window.every((v, j) => v === P1[j])) result += N3;
        if (window.every((v, j) => v === P2[j])) result += N3;
      }
    }

    // 2 — 2×2 blocks of one colour
    for (let y = 0; y < this.size - 1; y++) {
      for (let x = 0; x < this.size - 1; x++) {
        const c = this.modules[y][x];
        if (
          c === this.modules[y][x + 1] &&
          c === this.modules[y + 1][x] &&
          c === this.modules[y + 1][x + 1]
        ) {
          result += N2;
        }
      }
    }

    // 4 — deviation from a 50% dark ratio
    let dark = 0;
    for (const row of this.modules) for (const cell of row) if (cell) dark++;
    const total = this.size * this.size;
    const k = Math.floor(Math.abs(dark * 100 - total * 50) / total / 5);
    result += k * N4;

    return result;
  }
}

// --- Public API -------------------------------------------------------------

/**
 * Encode text (UTF-8, byte mode) as a QR code.
 * Throws if the text is too long for version 40 at the requested ECC level.
 */
export function encodeQr(text: string, ecc: Ecc = "M"): QrCode {
  const bytes = Array.from(new TextEncoder().encode(text));

  let version = MIN_VERSION;
  for (; ; version++) {
    if (version > MAX_VERSION) {
      throw new Error(`Text too long for a QR code (${bytes.length} bytes at level ${ecc})`);
    }
    const capacityBits = numDataCodewords(version, ecc) * 8;
    if (4 + charCountBits(version) + bytes.length * 8 <= capacityBits) break;
  }

  const dataCapacityBits = numDataCodewords(version, ecc) * 8;
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4); // byte mode
  appendBits(bits, bytes.length, charCountBits(version));
  bytes.forEach((b) => appendBits(bits, b, 8));

  // Terminator, byte alignment, then the alternating pad bytes.
  appendBits(bits, 0, Math.min(4, dataCapacityBits - bits.length));
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < dataCapacityBits; pad ^= 0xec ^ 0x11) {
    appendBits(bits, pad, 8);
  }

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    dataCodewords.push(byte);
  }

  const drawing = new Drawing(version, ecc);
  drawing.drawFunctionPatterns();
  drawing.drawCodewords(addEccAndInterleave(dataCodewords, version, ecc));

  // Pick the mask with the lowest penalty (mask is its own inverse, so we can
  // try each in place).
  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    drawing.applyMask(mask);
    drawing.drawFormatBits(mask);
    const score = drawing.penaltyScore();
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    drawing.applyMask(mask);
  }
  drawing.applyMask(bestMask);
  drawing.drawFormatBits(bestMask);

  return { size: drawing.size, modules: drawing.modules, version, ecc };
}

export interface QrSvgOptions {
  /** Quiet-zone width in modules. The spec asks for 4; don't go below it. */
  margin?: number;
  dark?: string;
  light?: string;
  /** Rendered edge length in px (the viewBox stays in module units). */
  pixelSize?: number;
}

/** Render a QR code as a standalone SVG string (one path, no dependencies). */
export function qrToSvg(qr: QrCode, opts: QrSvgOptions = {}): string {
  const margin = opts.margin ?? 4;
  const dark = opts.dark ?? "#111111";
  const light = opts.light ?? "#ffffff";
  const dim = qr.size + margin * 2;

  let path = "";
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) path += `M${x + margin} ${y + margin}h1v1h-1z`;
    }
  }

  const sizeAttr = opts.pixelSize ? ` width="${opts.pixelSize}" height="${opts.pixelSize}"` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}"${sizeAttr} ` +
    `shape-rendering="crispEdges" role="img" aria-label="QR code">` +
    `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/>` +
    `</svg>`
  );
}

/** Convenience: text straight to an SVG data URI, usable as an <img> src. */
export function qrDataUri(text: string, ecc: Ecc = "M", opts: QrSvgOptions = {}): string {
  const svg = qrToSvg(encodeQr(text, ecc), opts);
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
