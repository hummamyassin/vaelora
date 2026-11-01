/**
 * Research helper for docs/research/jordan-places: measures an OSM park or
 * reserve (area, centre) and the length of mapped walkable ways inside it.
 * The numbers inform VAELORA's written suitability notes; they are not
 * copied into the product as verified facts.
 *
 *   node scripts/research/osm-place-facts.mjs way/706369062 relation/13191557 ...
 */
const UA = { "User-Agent": "VAELORA-research/1.0 (open data review)" };
const rad = Math.PI / 180;
const metres = ([x1, y1], [x2, y2]) => {
  const h = Math.sin(((y2 - y1) * rad) / 2) ** 2 + Math.cos(y1 * rad) * Math.cos(y2 * rad) * Math.sin(((x2 - x1) * rad) / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
};
const get = async (path) => {
  const r = await fetch(`https://api.openstreetmap.org/api/0.6/${path}`, { headers: UA });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
};
function rings(data, ref) {
  const nodes = new Map(), ways = new Map();
  for (const e of data.elements) if (e.type === "node") nodes.set(e.id, [e.lon, e.lat]);
  for (const e of data.elements) if (e.type === "way") ways.set(e.id, e.nodes.map((n) => nodes.get(n)));
  const [type, id] = ref.split("/");
  const root = data.elements.find((e) => e.type === type && e.id === +id);
  if (type === "way") return { tags: root.tags, rings: [ways.get(+id)] };
  // Outer members joined into rings.
  const parts = root.members.filter((m) => m.type === "way" && m.role !== "inner").map((m) => ways.get(m.ref));
  const out = [];
  while (parts.length) {
    let ring = parts.shift();
    for (let guard = 0; guard < 500 && metres(ring[0], ring.at(-1)) > 1 && parts.length; guard++) {
      const i = parts.findIndex((p) => metres(p[0], ring.at(-1)) < 1 || metres(p.at(-1), ring.at(-1)) < 1);
      if (i < 0) break;
      const p = parts.splice(i, 1)[0];
      ring = ring.concat(metres(p[0], ring.at(-1)) < 1 ? p.slice(1) : [...p].reverse().slice(1));
    }
    out.push(ring);
  }
  return { tags: root.tags, rings: out };
}
const inside = ([x, y], ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = ring[i], [aa, bb] = ring[j];
    if (b > y !== bb > y && x < ((aa - a) * (y - b)) / (bb - b) + a) c = !c;
  }
  return c;
};
const areaHa = (ring) => {
  const k = Math.cos(ring[0][1] * rad) * 111320, m = 110540;
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * k * ring[i + 1][1] * m - ring[i + 1][0] * k * ring[i][1] * m;
  return Math.abs(s / 2) / 10000;
};

for (const ref of process.argv.slice(2)) {
  const { tags, rings: shape } = rings(await get(`${ref}/full.json`), ref);
  const all = shape.flat();
  const [w, s, e, n] = [Math.min(...all.map((p) => p[0])), Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[0])), Math.max(...all.map((p) => p[1]))];
  const centre = [(w + e) / 2, (s + n) / 2];
  let walkable = 0, track = false;
  const big = (e - w) * (n - s) > 0.2;
  if (!big) {
    const map = await get(`map.json?bbox=${w},${s},${e},${n}`);
    const nodes = new Map();
    for (const x of map.elements) if (x.type === "node") nodes.set(x.id, [x.lon, x.lat]);
    for (const x of map.elements) {
      if (x.type !== "way" || !x.tags) continue;
      if (x.tags.leisure === "track") track = true;
      if (!/^(footway|path|pedestrian|track|cycleway|steps)$/.test(x.tags.highway ?? "")) continue;
      const pts = x.nodes.map((id) => nodes.get(id)).filter(Boolean);
      for (let i = 1; i < pts.length; i++) {
        const mid = [(pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2];
        if (shape.some((r) => inside(mid, r))) walkable += metres(pts[i - 1], pts[i]);
      }
    }
  }
  console.log(JSON.stringify({
    ref, name: tags.name, nameAr: tags["name:ar"] ?? null, nameEn: tags["name:en"] ?? null,
    centre: centre.map((v) => +v.toFixed(5)), areaHa: +shape.reduce((a, r) => a + areaHa(r), 0).toFixed(1),
    walkableKm: big ? null : +(walkable / 1000).toFixed(2), runningTrack: track, operator: tags.operator ?? null, website: tags.website ?? null,
  }));
  await new Promise((r) => setTimeout(r, 500));
}
