/**
 * Builds route geometry and derived figures for curated Jordan routes from
 * OpenStreetMap (ODbL) and Copernicus DEM elevation via the Open-Meteo
 * Elevation API (Copernicus GLO-90, ~90 m resolution).
 *
 *   node scripts/build-route-data.mjs [cacheDir]
 *
 * For every entry in ROUTES it downloads the OSM object (or reads cacheDir),
 * chains its ways into one line, measures it, samples elevation about every
 * 100 m and writes:
 *   public/routes/<id>.json     geometry + elevation profile, loaded on demand
 *   src/data/route-summaries.ts distance, route type and elevation figures
 * Nothing here is field-verified; figures are labelled as derived in the UI.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

/** Place id → OSM object. Kept in step with src/data/jordan-places.ts. */
export const ROUTES = {
  "dana-rummana-trail": "relation/8069054",
  "dana-white-dome-trail": "relation/8069055",
  "dana-shaq-al-reesh-trail": "relation/8069056",
  "mujib-ibex-trail": "relation/8123537",
  "jordan-trail-ajloun-104": "relation/19067480",
  "jordan-trail-balqa-301": "relation/19074508",
  "jordan-trail-amman-302": "relation/19094283",
  "jordan-trail-aqaba-806": "relation/19313687",
  "wadi-al-hasa-upper-trail": "relation/2105020",
};

const cache = process.argv[2];
const UA = { "User-Agent": "VAELORA-route-data/1.0 (open data build; contact via repository)" };

async function osm(ref) {
  const [type, id] = ref.split("/");
  const file = cache && `${cache}/${type[0]}${id}.json`;
  if (file && existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const response = await fetch(`https://api.openstreetmap.org/api/0.6/${ref}/full.json`, { headers: UA });
  if (!response.ok) throw new Error(`${ref}: OSM ${response.status}`);
  return response.json();
}

const rad = Math.PI / 180;
const metres = ([x1, y1], [x2, y2]) => {
  const h = Math.sin(((y2 - y1) * rad) / 2) ** 2 + Math.cos(y1 * rad) * Math.cos(y2 * rad) * Math.sin(((x2 - x1) * rad) / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
};
const lengthOf = (line) => line.slice(1).reduce((sum, p, i) => sum + metres(line[i], p), 0);

/** Member ways in relation order, each flipped so the line runs continuously. */
function chain(data, ref) {
  const nodes = new Map(), ways = new Map();
  for (const e of data.elements) {
    if (e.type === "node") nodes.set(e.id, [e.lon, e.lat]);
    if (e.type === "way") ways.set(e.id, e.nodes.map((n) => nodes.get(n)).filter(Boolean));
  }
  for (const e of data.elements) if (e.type === "way") ways.set(e.id, e.nodes.map((n) => nodes.get(n)));
  const [type, id] = ref.split("/");
  const root = data.elements.find((e) => e.type === type && e.id === +id);
  const parts =
    type === "way" ? [ways.get(+id)] : root.members.filter((m) => m.type === "way" && ways.has(m.ref)).map((m) => ways.get(m.ref));
  let line = [...parts[0]], gaps = 0;
  for (const part of parts.slice(1)) {
    const end = line.at(-1);
    const forward = metres(end, part[0]), backward = metres(end, part.at(-1));
    // The first way may itself be reversed relative to the second.
    if (line.length === parts[0].length && Math.min(metres(line[0], part[0]), metres(line[0], part.at(-1))) < Math.min(forward, backward)) line.reverse();
    const next = metres(line.at(-1), part[0]) <= metres(line.at(-1), part.at(-1)) ? part : [...part].reverse();
    if (metres(line.at(-1), next[0]) > 30) gaps++;
    line.push(...next.slice(metres(line.at(-1), next[0]) < 1 ? 1 : 0));
  }
  return { line, gaps, tags: root.tags ?? {} };
}

/** Points every `step` metres along the line, ends included, with their distance along it. */
function resample(line, step) {
  const points = [line[0]], along = [0];
  let walked = 0, next = step;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], d = metres(a, b);
    while (next < walked + d) {
      const t = (next - walked) / d;
      points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      along.push(next);
      next += step;
    }
    walked += d;
  }
  if (walked - along.at(-1) > 1) {
    points.push(line.at(-1));
    along.push(walked);
  }
  return { points, along };
}

async function elevations(points) {
  const out = [];
  for (let i = 0; i < points.length; i += 100) {
    const batch = points.slice(i, i + 100);
    const url = new URL("https://api.open-meteo.com/v1/elevation");
    url.searchParams.set("latitude", batch.map((p) => p[1].toFixed(5)).join(","));
    url.searchParams.set("longitude", batch.map((p) => p[0].toFixed(5)).join(","));
    let response;
    // The free API rate-limits bursts; back off and retry a few times.
    for (let attempt = 0; attempt < 6; attempt++) {
      response = await fetch(url, { headers: UA });
      if (response.status !== 429) break;
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
    if (!response.ok) throw new Error(`Elevation ${response.status}`);
    out.push(...(await response.json()).elevation);
    await new Promise((r) => setTimeout(r, 1000));
  }
  return out;
}

/** Gain and loss after a 3-point moving average, ignoring sub-2 m wobble from the DEM. */
function climb(profile) {
  const smooth = profile.map((_, i) => {
    const w = profile.slice(Math.max(0, i - 1), i + 2);
    return w.reduce((a, b) => a + b, 0) / w.length;
  });
  let gain = 0, loss = 0, base = smooth[0];
  for (const e of smooth.slice(1)) {
    const d = e - base;
    if (Math.abs(d) >= 2) {
      if (d > 0) gain += d;
      else loss -= d;
      base = e;
    }
  }
  return { gain: Math.round(gain), loss: Math.round(loss), min: Math.round(Math.min(...profile)), max: Math.round(Math.max(...profile)) };
}

/** Douglas-Peucker in metres-ish degrees; keeps the file small for the client. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, at = -1;
    const [x1, y1] = points[a], [x2, y2] = points[b];
    for (let i = a + 1; i < b; i++) {
      const [x, y] = points[i], dx = x2 - x1, dy = y2 - y1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
      if (d > max) { max = d; at = i; }
    }
    if (max > tolerance) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

mkdirSync("public/routes", { recursive: true });
const summaries = {};
for (const [id, ref] of Object.entries(ROUTES)) {
  const { line, gaps, tags } = chain(await osm(ref), ref);
  const length = lengthOf(line);
  const closing = metres(line[0], line.at(-1));
  const samples = resample(line, length > 12000 ? 200 : 100);
  const heights = await elevations(samples.points);
  const profile = samples.along.map((d, i) => [Math.round(d), Math.round(heights[i])]);
  const figures = climb(heights);
  const geometry = simplify(line, 0.00004).map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);
  writeFileSync(
    `public/routes/${id}.json`,
    JSON.stringify({
      id,
      source: `https://www.openstreetmap.org/${ref}`,
      license: "Geometry © OpenStreetMap contributors (ODbL). Elevation: Copernicus GLO-90 DEM via Open-Meteo.",
      geometry,
      profile,
    }),
  );
  summaries[id] = {
    osm: ref,
    distanceKm: +(length / 1000).toFixed(1),
    // OSM may store an out-and-back trail as its one-way line; the UI states the mapped length.
    shape: closing <= 150 ? "loop" : "line",
    start: geometry[0],
    gaps,
    elevationGainM: figures.gain,
    elevationLossM: figures.loss,
    minElevationM: figures.min,
    maxElevationM: figures.max,
    osmDistanceTag: tags.distance ?? null,
  };
  console.log(id, summaries[id]);
}
writeFileSync(
  "src/data/route-summaries.ts",
  `/* Generated by scripts/build-route-data.mjs. Do not edit by hand.
 * Distances are measured on OpenStreetMap geometry (ODbL); elevation figures
 * come from the Copernicus GLO-90 DEM via the Open-Meteo Elevation API. Both
 * are derived estimates, not field measurements. */
export interface RouteSummary {
  osm: string;
  distanceKm: number;
  shape: "loop" | "line";
  start: readonly [number, number];
  gaps: number;
  elevationGainM: number;
  elevationLossM: number;
  minElevationM: number;
  maxElevationM: number;
  osmDistanceTag: string | null;
}
export const routeSummaries: Readonly<Record<string, RouteSummary>> = ${JSON.stringify(summaries, null, 2)};
`,
);
