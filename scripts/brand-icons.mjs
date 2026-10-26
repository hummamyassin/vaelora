/**
 * Builds every app icon from the final VAELORA V artwork. The V is never
 * redrawn: the large dark tile is taken from the approved icon sheet
 * ("VAELORA — الأيقونة النهائية") and only cropped, masked and resized.
 *
 *   node scripts/brand-icons.mjs [sheet.pdf | docs/brand/vaelora-v-tile.png]
 *
 * With a PDF it first extracts the sheet's embedded 3840×2760 image and saves
 * the tile to docs/brand/vaelora-v-tile.png, which then serves as the source.
 * Icons are written to public/icons/v25/; new artwork gets a new folder so
 * browsers, the service worker and launchers never reuse a cached icon.
 */
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const TILE = "docs/brand/vaelora-v-tile.png";
const OUT = "public/icons/v25";
const input = process.argv[2] ?? TILE;

// The large dark tile on the sheet: top-left corner and size in sheet pixels.
const SHEET_TILE = { left: 2304, top: 693, size: 1320 };
// Trim the antialiased edge, which blends into the sheet's beige ground.
const INSET = 3;
const RADIUS = 290 / 1320; // corner radius as a share of the tile

function sheetFromPdf(path) {
  const pdf = readFileSync(path);
  const text = pdf.toString("latin1");
  const dict = text.indexOf("/Subtype /Image");
  const len = Number(/\/Length (\d+)/.exec(text.slice(dict, dict + 400))[1]);
  let start = text.indexOf("stream", dict) + 6;
  if (pdf[start] === 13) start++;
  if (pdf[start] === 10) start++;
  return pdf.subarray(start, start + len);
}

async function loadTile() {
  if (!input.endsWith(".pdf")) return sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const tile = sharp(sheetFromPdf(input)).extract({
    left: SHEET_TILE.left,
    top: SHEET_TILE.top,
    width: SHEET_TILE.size,
    height: SHEET_TILE.size,
  });
  mkdirSync("docs/brand", { recursive: true });
  await tile.clone().png({ compressionLevel: 9 }).toFile(TILE);
  return tile.removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

const { data: src, info } = await loadTile();
const S = info.width; // tile size
const art = { x: INSET, size: S - INSET * 2, radius: RADIUS * S - INSET };

/** Rounded-rectangle alpha mask, antialiased, `size` pixels square. */
const mask = (size, radius) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`,
    ),
  )
    .extractChannel(0)
    .raw()
    .toBuffer();

/** The tile artwork alone with transparent corners, `size` pixels square. */
async function roundedArt(size) {
  const art1 = sharp(src, { raw: { width: S, height: S, channels: 3 } })
    .extract({ left: art.x, top: art.x, width: art.size, height: art.size })
    .resize(size, size, { kernel: "lanczos3" });
  const alpha = await mask(size, (art.radius * size) / art.size);
  return art1.joinChannel(alpha, { raw: { width: size, height: size, channels: 1 } }).png().toBuffer();
}

/**
 * The tile's background gradient, fitted as a smooth cubic per colour
 * channel on pixels away from the V, its shadow and the stitches.
 */
function fitBackground() {
  const r = RADIUS * S, rows = [], vals = [[], [], []];
  for (let y = 16; y < S - 16; y += 4)
    for (let x = 16; x < S - 16; x += 4) {
      if (signedInside(x, y, r) < 16) continue;
      const i = (y * S + x) * 3, R = src[i], G = src[i + 1], B = src[i + 2];
      const lum = 0.3 * R + 0.59 * G + 0.11 * B, chroma = Math.max(R, G, B) - Math.min(R, G, B);
      if (lum > 62 || lum < 22 || chroma > 24) continue;
      rows.push(terms(x / S, y / S));
      vals[0].push(R); vals[1].push(G); vals[2].push(B);
    }
  return vals.map((v) => leastSquares(rows, v));
}
const terms = (u, v) => [1, u, v, u * u, u * v, v * v, u * u * u, u * u * v, u * v * v, v * v * v];
function leastSquares(rows, v) {
  const k = rows[0].length, A = Array.from({ length: k }, () => new Float64Array(k + 1));
  rows.forEach((row, n) => {
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) A[i][j] += row[i] * row[j];
      A[i][k] += row[i] * v[n];
    }
  });
  for (let i = 0; i < k; i++) {
    let p = i;
    for (let j = i + 1; j < k; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
    [A[i], A[p]] = [A[p], A[i]];
    for (let j = 0; j < k; j++) {
      if (j === i) continue;
      const m = A[j][i] / A[i][i];
      for (let c = i; c <= k; c++) A[j][c] -= m * A[i][c];
    }
  }
  return A.map((row, i) => row[k] / row[i]);
}
/** Signed distance from the tile's rounded edge, positive inside. */
function signedInside(x, y, r) {
  const cx = Math.min(Math.max(x, r), S - r), cy = Math.min(Math.max(y, r), S - r);
  if (cx !== x && cy !== y) return r - Math.hypot(x - cx, y - cy);
  return Math.min(x, y, S - x, S - y);
}

/**
 * An opaque square icon with the tile at `scale`: the fitted gradient fills
 * the square, and the tile's own detail (the V, its shadow, the stitches) is
 * added back pixel for pixel, fading out only at the tile's outer edge.
 */
async function fullBleed(scale, model) {
  const size = Math.round(S / scale), off = (size - S) / 2, r = RADIUS * S;
  const ground = Buffer.alloc(size * size * 3);
  const at = (u, v) => model.map((c) => terms(u, v).reduce((a, t, i) => a + t * c[i], 0));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const tx = x - off, ty = y - off;
      const base = at(Math.min(Math.max(tx / S, 0), 1), Math.min(Math.max(ty / S, 0), 1));
      const w = tx >= 0 && ty >= 0 && tx < S && ty < S ? Math.min(Math.max((signedInside(tx, ty, r) - INSET - 2) / 30, 0), 1) : 0;
      const i = (y * size + x) * 3;
      for (let c = 0; c < 3; c++) {
        let value = base[c];
        if (w > 0) {
          const t = (Math.floor(ty) * S + Math.floor(tx)) * 3 + c;
          value += w * (src[t] - at(tx / S, ty / S)[c]);
        }
        ground[i + c] = Math.round(Math.min(Math.max(value, 0), 255));
      }
    }
  return sharp(ground, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
}

mkdirSync(OUT, { recursive: true });
const model = fitBackground();
const MASTER = 1024;
const write = (buf, size, name) =>
  sharp(buf).resize(size, size, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}`);

const rounded = await roundedArt(MASTER);
// Maskable: the whole V sits inside the 80% safe circle, with margin.
const maskable = await fullBleed(0.76, model);
// Apple: opaque and full-bleed; iOS applies its own rounded mask.
const apple = await fullBleed(1, model);

await Promise.all([
  write(rounded, 512, "icon-512.png"),
  write(rounded, 192, "icon-192.png"),
  write(rounded, 96, "icon-96.png"),
  write(rounded, 32, "icon-32.png"),
  write(maskable, 512, "maskable-512.png"),
  write(maskable, 192, "maskable-192.png"),
  write(apple, 180, "apple-touch-icon-180.png"),
]);
console.log(`VAELORA icons written to ${OUT} from ${input}`);
