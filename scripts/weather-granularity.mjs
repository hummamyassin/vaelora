import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../docs/validation/weather-granularity/", import.meta.url);
const endpoint = "https://api.open-meteo.com/v1/forecast";
// Diagnostic tolerances only: not scoring weights, safety cutoffs, or validated JNDs.
export const tolerances = {
  temperature_2m: 0.5,
  apparent_temperature: 0.5,
  relative_humidity_2m: 3,
  wind_speed_10m: 2,
  precipitation_probability: 5,
  uv_index: 0.3,
};
const variables = Object.keys(tolerances);
const round = (n) => Math.round(n * 1000) / 1000;
const mean = (a) => a.reduce((s, n) => s + n, 0) / a.length;
const median = (a) => {
  const sorted = [...a].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const stats = (a) => a.length ? {
  n: a.length, mean: round(mean(a)), median: round(median(a)),
  p90: round([...a].sort((a, b) => a - b)[Math.ceil(a.length * 0.9) - 1]),
  max: round(Math.max(...a)), min: round(Math.min(...a)),
} : { n: 0, mean: null, median: null, p90: null, max: null, min: null };
const bands = { morning: [6, 9], afternoon: [13, 16], evening: [18, 21] };
const inBand = (t, [lo, hi]) => Number(t.slice(11, 13)) >= lo && Number(t.slice(11, 13)) <= hi;

export function align(responses) {
  for (const r of responses) {
    assert.equal(r.timezone, "Asia/Amman");
    assert.equal(r.utc_offset_seconds, 10800);
    assert.ok(r.hourly?.time?.length, "Missing hourly timestamps");
    assert.equal(new Set(r.hourly.time).size, r.hourly.time.length, "Duplicate timestamps");
    for (const v of variables) {
      assert.equal(r.hourly[v]?.length, r.hourly.time.length, `Missing/unaligned ${v}`);
      assert.ok(r.hourly[v].every((n) => n === null || Number.isFinite(n)), `Invalid ${v}`);
    }
  }
  const maps = responses.map((r) => new Map(r.hourly.time.map((t, i) => [t, i])));
  const times = responses[0].hourly.time.filter((t) => maps.every((m) => m.has(t))).sort();
  assert.ok(times.length, "No common timestamps");
  return { times, maps };
}

export function distanceKm(a, b) {
  const rad = (n) => n * Math.PI / 180;
  const dlat = rad(b.latitude - a.latitude);
  const dlon = rad(b.longitude - a.longitude);
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function analyze(responses, locations) {
  assert.equal(responses.length, locations.length);
  const { times, maps } = align(responses);
  const value = (loc, variable, t) => responses[loc].hourly[variable][maps[loc].get(t)];
  const hourlyRanges = times.map((time) => ({ time, ...Object.fromEntries(variables.map((v) => {
    const a = locations.map((_, i) => value(i, v, time));
    return [v, a.every(Number.isFinite) ? round(Math.max(...a) - Math.min(...a)) : null];
  })) }));
  const summarize = (rows) => Object.fromEntries(variables.map((v) => [v, {
    ...stats(rows.map((r) => r[v]).filter(Number.isFinite)),
    aboveToleranceHours: rows.filter((r) => Number.isFinite(r[v]) && r[v] > tolerances[v]).length,
  }]));
  const days = [...new Set(times.map((t) => t.slice(0, 10)))];
  const pairs = [];
  for (let a = 0; a < locations.length; a++) {
    for (let b = a + 1; b < locations.length; b++) {
      const delta = (v, t) => Number.isFinite(value(a, v, t)) && Number.isFinite(value(b, v, t))
        ? Math.abs(value(a, v, t) - value(b, v, t)) : null;
      const valid = times.filter((t) => variables.every((v) => delta(v, t) !== null));
      const near = (factor) => valid.filter((t) => variables.every((v) => delta(v, t) <= tolerances[v] * factor + 1e-9)).length;
      pairs.push({
        a: locations[a].name, b: locations[b].name,
        distanceKm: round(distanceKm(locations[a], locations[b])),
        sameReturnedGrid: responses[a].latitude === responses[b].latitude && responses[a].longitude === responses[b].longitude,
        validHours: valid.length,
        exactAllVariables: valid.length === times.length && near(0) === times.length,
        nearHourPercent: valid.length ? round(100 * near(1) / valid.length) : null,
        nearIdentical: valid.length === times.length && near(1) / valid.length >= 0.9,
        sensitivityNearHourPercent: Object.fromEntries([0.5, 1, 2].map((f) => [f, valid.length ? round(100 * near(f) / valid.length) : null])),
        variables: Object.fromEntries(variables.map((v) => {
          const d = times.map((t) => delta(v, t)).filter(Number.isFinite);
          return [v, { ...stats(d), exactHours: d.filter((n) => n === 0).length }];
        })),
      });
    }
  }
  return {
    alignedHours: times.length, start: times[0], end: times.at(-1),
    droppedTimestamps: responses.map((r) => r.hourly.time.length - times.length),
    missingValues: responses.map((r, i) => ({ location: locations[i].name, ...Object.fromEntries(variables.map((v) => [v, r.hourly[v].filter((n) => n === null).length])) })),
    hourlyRanges, summary: summarize(hourlyRanges),
    byDay: Object.fromEntries(days.map((day) => [day, summarize(hourlyRanges.filter((r) => r.time.startsWith(day)))])),
    byBand: Object.fromEntries(Object.entries(bands).map(([band, hours]) => [band, summarize(hourlyRanges.filter((r) => inBand(r.time, hours)))])),
    byDayAndBand: Object.fromEntries(days.map((day) => [day, Object.fromEntries(Object.entries(bands).map(([band, hours]) => [band, summarize(hourlyRanges.filter((r) => r.time.startsWith(day) && inBand(r.time, hours)))]))])),
    temporalDailyRanges: locations.map((loc, i) => ({ location: loc.name, variables: Object.fromEntries(variables.map((v) => [v, stats(days.map((day) => {
      const a = times.filter((t) => t.startsWith(day)).map((t) => value(i, v, t)).filter(Number.isFinite);
      return a.length ? Math.max(...a) - Math.min(...a) : null;
    }).filter(Number.isFinite))])) })),
    pairs,
  };
}

async function fetchBatch(locations, control) {
  const url = new URL(endpoint);
  const params = {
    latitude: locations.map((l) => l.latitude).join(","),
    longitude: locations.map((l) => l.longitude).join(","),
    hourly: variables.join(","), timezone: "Asia/Amman", forecast_days: "5",
    temperature_unit: "celsius", wind_speed_unit: "kmh", timeformat: "iso8601",
    cell_selection: "land", models: "best_match",
  };
  if (control) params.elevation = locations.map(() => "nan").join(",");
  url.search = new URLSearchParams(params).toString();
  const requestedAt = new Date().toISOString();
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}: ${await response.text()}`);
  return { requestedAt, receivedAt: new Date().toISOString(), url: url.href, response: await response.json() };
}

function report(snapshot, result, control) {
  const locs = snapshot.dataset.locations;
  const rows = (summary) => variables.map((v) => `| ${v} | ${snapshot.baseline.response[0].hourly_units[v]} | ${summary[v].mean} | ${summary[v].median} | ${summary[v].p90} | ${summary[v].max} | ${summary[v].aboveToleranceHours}/${summary[v].n} |`).join("\n");
  const sorted = [...result.pairs].sort((a, b) => a.variables.temperature_2m.mean - b.variables.temperature_2m.mean);
  const describe = (p) => `${p.a} / ${p.b}: ${p.distanceKm} km apart, mean absolute temperature difference ${p.variables.temperature_2m.mean} °C; all-variable near-hours ${p.nearHourPercent}%; same returned grid: ${p.sameReturnedGrid}`;
  return `# Weather granularity: empirical output\n\nFetched ${snapshot.baseline.requestedAt}. Period ${result.start} through ${result.end}, Asia/Amman (UTC+03:00). ${result.alignedHours} aligned hours across ${locs.length} points. One forecast snapshot covering five consecutive days, not five independent observed days.\n\n## Verified geographic probes\n\nThese are validation points, not a production activity dataset. Source checks confirm geographic identity, not route access, safety, or microclimate. See locations.json for corroboration and uncertainty.\n\n| Location | Requested latitude, longitude | Returned latitude, longitude | Elevation m | Coordinate source |\n|---|---|---|---|---|\n${locs.map((l, i) => { const r = snapshot.baseline.response[i]; return `| ${l.name} | ${l.latitude}, ${l.longitude} | ${r.latitude}, ${r.longitude} | ${r.elevation} | [source](${l.verification.coordinateSource}) |`; }).join("\n")}\n\n## Method\n\nOpen-Meteo /v1/forecast, best_match, land cell selection, default elevation downscaling; five forecast days, Celsius and km/h. Exact URLs and full responses are in snapshot.json. Timestamps are joined by value, never assumed to match array positions. Nulls are excluded, never converted to zero; any incomplete hour has a null cross-location range. analysis.json records completeness, all hourly ranges, all 28 pairs, day/band summaries, and per-location daily temporal ranges.\n\nDiagnostic near-identical tolerances: ${JSON.stringify(tolerances)} (humidity/precipitation in percentage points). A pair is near-identical when all six differences stay within tolerance for at least 90% of complete aligned hours; exact identity requires all six values equal at every hour. These are exploratory tolerances, not scores or validated perceptual/safety thresholds. Sensitivity at half/double tolerance is recorded. Nearby is described by haversine distance; pair tables retain distance without assuming a universal neighborhood radius.\n\n## Hourly geographic ranges\n\n| Variable | Unit | Mean | Median | P90 | Maximum | Hours above diagnostic tolerance |\n|---|---|---|---|---|---|---|\n${rows(result.summary)}\n\n${Object.entries(result.byBand).map(([b, s]) => `### ${b} (${bands[b].join("–")}, inclusive local hours)\n\n| Variable | Unit | Mean | Median | P90 | Maximum | Hours above tolerance |\n|---|---|---|---|---|---|---|\n${rows(s)}`).join("\n\n")}\n\n## Pairwise comparison\n\nSimilarity is reported per variable; there is no composite VAELORA score. Temperature-order endpoints:\n\n- Smallest: ${describe(sorted[0])}.\n- Largest: ${describe(sorted.at(-1))}.\n- Exact six-variable pairs: ${result.pairs.filter((p) => p.exactAllVariables).length}/28.\n- Near-identical pairs: ${result.pairs.filter((p) => p.nearIdentical).length}/28.\n\n| Pair | Distance km | Same returned grid | Mean temperature delta °C | Mean wind delta km/h | Near hours % |\n|---|---|---|---|---|---|\n${sorted.map((p) => `| ${p.a} / ${p.b} | ${p.distanceKm} | ${p.sameReturnedGrid} | ${p.variables.temperature_2m.mean} | ${p.variables.wind_speed_10m.mean} | ${p.nearHourPercent} |`).join("\n")}\n\n## Downscaling control\n\nA second batch sets elevation=nan (all eight points), keeping other settings fixed. It is a diagnostic of combined downscaling/cell-selection effects, not a controlled observation of true microclimates. Requests may straddle model updates.\n\n| Variable | Unit | Mean geographic range | Median | P90 | Maximum | Hours above tolerance |\n|---|---|---|---|---|---|---|\n${rows(control.summary)}\n\nControl exact pairs: ${control.pairs.filter((p) => p.exactAllVariables).length}/28; near-identical pairs: ${control.pairs.filter((p) => p.nearIdentical).length}/28.\n\n## Interpretation limits and provenance\n\n[Open-Meteo documentation](https://open-meteo.com/en/docs) describes returned coordinates as grid-cell centers and default elevation adjustment using a 90 m DEM. A 90 m terrain dataset does not imply 90 m atmospheric resolution. best_match can blend models/variables, and this response does not expose per-variable model/cycle identity; returned-coordinate equality is suggestive, not proof of common provenance for every variable. Numerical differences are forecast differences, not measured accuracy or statistical significance. Repeated hours are correlated. Nighttime UV zeros and dry-period precipitation equality can inflate similarity. Street shade, trees, buildings and road exposure are not established by this experiment.\n\nWeather data: [Open-Meteo, CC BY 4.0](https://open-meteo.com/en/terms). Map references retain source attribution; OSM-derived points are © OpenStreetMap contributors ([ODbL](https://www.openstreetmap.org/copyright)); GeoNames references retain their identifiers. See findings.md for the evidence-based architecture recommendation.\n`;
}

async function main() {
  const replay = process.argv.includes("--replay");
  const snapshotFile = new URL("snapshot.json", root);
  let snapshot;
  if (replay) snapshot = JSON.parse(await readFile(snapshotFile, "utf8"));
  else {
    const dataset = JSON.parse(await readFile(new URL("locations.json", root), "utf8"));
    const baseline = await fetchBatch(dataset.locations, false);
    const control = await fetchBatch(dataset.locations, true);
    snapshot = { dataset, baseline, control };
  }
  const baseline = analyze(snapshot.baseline.response, snapshot.dataset.locations);
  const control = analyze(snapshot.control.response, snapshot.dataset.locations);
  assert.equal(baseline.alignedHours, 120, "Expected five complete aligned days");
  assert.equal(control.alignedHours, 120);
  assert.equal(baseline.start, control.start);
  assert.equal(baseline.end, control.end);
  for (const batch of [snapshot.baseline.response, snapshot.control.response]) {
    for (const r of batch) {
      for (const v of variables) assert.equal(r.hourly_units[v], snapshot.baseline.response[0].hourly_units[v]);
      for (const key of ["latitude", "longitude", "elevation"]) assert.ok(Number.isFinite(r[key]));
    }
  }
  await mkdir(root, { recursive: true });
  if (!replay) await writeFile(snapshotFile, JSON.stringify(snapshot, null, 2) + "\n");
  await writeFile(new URL("analysis.json", root), JSON.stringify({ tolerances, baseline, control }, null, 2) + "\n");
  await writeFile(new URL("report.md", root), report(snapshot, baseline, control));
  console.log(`Open-Meteo: ${baseline.start} to ${baseline.end}; ${baseline.alignedHours} aligned hours; ${snapshot.dataset.locations.length} locations.`);
  console.table(baseline.summary);
  console.log(`Exact pairs: ${baseline.pairs.filter((p) => p.exactAllVariables).length}; near-identical: ${baseline.pairs.filter((p) => p.nearIdentical).length} of 28.`);
  console.log(`Report: ${fileURLToPath(new URL("report.md", root))}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
