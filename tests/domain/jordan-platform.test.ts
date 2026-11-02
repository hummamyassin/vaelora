import test from "node:test";
import assert from "node:assert/strict";
import { outdoorPlaces, placeById, routeSummary, routeDifficulty, estimatedMinutes, fitsAvailableTime, outingKm } from "../../src/data/outdoor-places.ts";
import { jordanPlaces } from "../../src/data/jordan-places.ts";
import { defaultFilters, featuredNear, filterLibrary, nearestBeyond, sortLibrary } from "../../src/domain/discovery/library.ts";
import { routeProgress, offRouteMetres } from "../../src/domain/tracking/follow.ts";
import { gpsElevationGain } from "../../src/domain/tracking/elevation.ts";
import { STORY, compactDuration, storyLayout, storyModel, storyPalettes, storyPositions, storySafe } from "../../src/domain/tracking/share-story.ts";
import { validateActivity, type GPSPoint, type RecordedActivity } from "../../src/domain/tracking/activity.ts";
import { parseSavedPlaces, toggleSavedPlace } from "../../src/lib/saved-places.ts";
import { governorateAt, isInsideJordan, JORDAN_DEFAULT_VIEW, normalizeJordanLocation } from "../../src/lib/jordan.ts";
import { governorateRings } from "../../src/data/jordan-geography.ts";
import { validateJordanPlaces } from "../../scripts/validate-jordan-places.ts";
import { distanceKm } from "../../src/lib/geography.ts";

const towns = {
  amman: { latitude: 31.9552, longitude: 35.945 },
  irbid: { latitude: 32.5556, longitude: 35.85 },
  ajloun: { latitude: 32.3325, longitude: 35.7517 },
  zarqa: { latitude: 32.0833, longitude: 36.1 },
  salt: { latitude: 32.0392, longitude: 35.7272 },
  karak: { latitude: 31.1844, longitude: 35.705 },
  mafraq: { latitude: 32.3428, longitude: 36.205 },
  aqaba: { latitude: 29.5322, longitude: 35.0061 },
  ruwaished: { latitude: 32.5042, longitude: 38.2011 },
};

test("Jordan coverage: towns in every region, the border kept honest, nothing substituted", () => {
  for (const [id, point] of Object.entries(towns)) {
    assert.ok(isInsideJordan(point), id);
    assert.ok(normalizeJordanLocation(point)?.governorate, id);
  }
  assert.equal(governorateAt(towns.aqaba)?.ar, "العقبة");
  assert.equal(normalizeJordanLocation({ latitude: 29.5577, longitude: 34.9519 }), null); // Eilat
  assert.equal(normalizeJordanLocation({ latitude: 33.51, longitude: 36.29 }), null); // Damascus
  // The default view frames every governorate.
  const [[w, s], [e, n]] = JORDAN_DEFAULT_VIEW.bounds;
  for (const g of governorateRings)
    for (const [lon, lat] of g.ring) assert.ok(lon >= w && lon <= e && lat >= s && lat <= n, g.id);
});

test("The curated library spans Jordan with honest tiers and no invented figures", () => {
  assert.ok(outdoorPlaces.length >= 30);
  assert.ok(new Set(outdoorPlaces.map((p) => p.governorate)).size >= 10);
  assert.deepEqual(validateJordanPlaces(jordanPlaces), []);
  for (const p of jordanPlaces) {
    assert.equal(p.tier, "open-data");
    assert.notEqual(p.verificationStatus, "verified");
    // Unknown stays unknown: running fit is never claimed without evidence.
    if (p.suitability.running !== "unknown") assert.ok(p.evidence.length > 1, p.id);
    assert.equal(p.route !== null, routeSummary(p) !== null, p.id);
  }
  // Places without a mapped line carry no distance, difficulty or time.
  const park = placeById("irbid-king-abdullah-ii-park")!;
  assert.equal(routeSummary(park), null);
});

test("Validation fails on invented or inconsistent route data", () => {
  const base = jordanPlaces.find((p) => p.id === "dana-shaq-al-reesh-trail")!;
  const fails = (patch: object, pattern: RegExp) =>
    assert.match(validateJordanPlaces([{ ...base, ...patch }]).join("\n"), pattern);
  fails({ latitude: 29.5577, longitude: 34.9519 }, /outside Jordan/);
  fails({ governorate: "irbid" }, /disagrees/);
  fails({ verificationStatus: "verified" }, /never "verified"/);
  fails({ ar: null }, /Arabic/);
  fails({ evidence: [{ url: "https://example.com/", note: "blog" }] }, /OpenStreetMap source/);
  fails({ route: { ...base.route!, shape: "loop", summaryId: "dana-rummana-trail" } }, /share the place ID|loop claimed/);
  fails({ kind: "place" }, /trails, and only trails/);
  assert.match(validateJordanPlaces([base], { [base.id]: { distanceKm: 500 } }).join("\n"), /implausible distance/);
});

test("Route estimates are derived, labelled and fit the time a user has", () => {
  const shaq = placeById("dana-shaq-al-reesh-trail")!,
    jt = placeById("jordan-trail-ajloun-104")!;
  const s1 = routeSummary(shaq)!,
    s2 = routeSummary(jt)!;
  assert.equal(routeDifficulty(s1), "moderate"); // short but steep
  assert.equal(routeDifficulty(s2), "hard");
  assert.ok(estimatedMinutes(shaq, s1, "walking") <= 75);
  assert.ok(estimatedMinutes(jt, s2, "walking") > 180);
  assert.equal(outingKm(shaq, s1), s1.distanceKm);
  assert.ok(fitsAvailableTime(shaq, 60, "walking"));
  assert.ok(!fitsAvailableTime(jt, 60, "walking"));
  assert.ok(fitsAvailableTime(jt, 90, "walking"));
  // A park adapts to any duration.
  assert.ok(fitsAvailableTime(placeById("aqaba-city-park")!, 30, "walking"));
});

test("Filters stay simple: activity, time, type, difficulty, distance, governorate, saved, reviewed", () => {
  const walking = { ...defaultFilters, activity: "walking" as const };
  const all = filterLibrary(outdoorPlaces, walking);
  assert.ok(all.length >= 30);
  assert.ok(filterLibrary(outdoorPlaces, { ...walking, kind: "trail" }).every((p) => p.kind === "trail"));
  assert.ok(filterLibrary(outdoorPlaces, { ...walking, difficulty: "hard" }).every((p) => routeDifficulty(routeSummary(p)!) === "hard"));
  const long = filterLibrary(outdoorPlaces, { ...walking, distance: "long" });
  assert.ok(long.length && long.every((p) => outingKm(p, routeSummary(p)!) >= 10));
  assert.ok(filterLibrary(outdoorPlaces, { ...walking, governorate: "tafilah" }).every((p) => p.governorate === "tafilah"));
  assert.ok(filterLibrary(outdoorPlaces, { ...walking, reviewed: true }).every((p) => p.tier === "reviewed"));
  assert.deepEqual(filterLibrary(outdoorPlaces, { ...walking, saved: true }, ["aqaba-city-park"]).map((p) => p.id), ["aqaba-city-park"]);
  // Running only lists places with a documented running fit.
  assert.ok(filterLibrary(outdoorPlaces, { ...walking, activity: "running" }).every((p) => p.supportedActivities.includes("running")));
  assert.equal(sortLibrary(all, towns.aqaba)[0].governorate, "aqaba");
});

test("Featured and Near Me follow the user's location and say so when nothing is near", () => {
  const ids = (o: { latitude: number; longitude: number }) => featuredNear(outdoorPlaces, o, "walking").map((p) => p.governorate);
  assert.deepEqual(featuredNear(outdoorPlaces, null, "walking"), []);
  for (const [town, g] of [["irbid", ["irbid", "ajloun"]], ["aqaba", ["aqaba"]], ["karak", ["karak", "tafilah", "madaba"]]] as const) {
    const featured = ids(towns[town]);
    assert.ok(featured.length > 0, town);
    assert.ok(featured.every((x) => (g as readonly string[]).includes(x)), `${town}: ${featured}`);
    assert.ok(!featured.includes("amman"), town);
  }
  // Amman keeps leading with its reviewed places.
  assert.ok(featuredNear(outdoorPlaces, towns.amman, "walking").every((p) => p.tier === "reviewed"));
  // Far from any curated place: an empty list, and the honest nearest distance.
  assert.deepEqual(featuredNear(outdoorPlaces, towns.ruwaished, "walking"), []);
  assert.ok(nearestBeyond(outdoorPlaces, towns.ruwaished, "walking")!.km > 100);
});

test("Follow Route reports distance from the line and what remains, including on loops", () => {
  const line = [
    [35.9, 31.9],
    [35.91, 31.9],
    [35.92, 31.9],
  ] as const;
  const on = routeProgress(line, { latitude: 31.9, longitude: 35.905 });
  assert.equal(on.offRoute, false);
  assert.ok(Math.abs(on.alongM - 472) < 15);
  assert.ok(Math.abs(on.remainingM - (on.totalM - on.alongM)) <= 1);
  const off = routeProgress(line, { latitude: 31.9012, longitude: 35.915 });
  assert.ok(off.offRouteM > offRouteMetres && off.offRoute);
  const loop = [...line, [35.92, 31.91], [35.9, 31.91], [35.9, 31.9]] as const;
  assert.equal(routeProgress(loop, { latitude: 31.9, longitude: 35.9 }).alongM, 0);
});

const walkPoints = (n: number, altitude?: (i: number) => number | null): GPSPoint[] =>
  Array.from({ length: n }, (_, i) => ({
    latitude: 31.95 + Math.sin(i / 9) * 0.004,
    longitude: 35.85 + i * 0.0004,
    accuracy: 5,
    timestamp: 1000 + i * 10000,
    segment: 0,
    speed: null,
    ...(altitude ? { altitude: altitude(i) } : {}),
  }));
const activityOf = (kind: "walking" | "running", points: GPSPoint[], activeMs = 2029000): RecordedActivity => {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += distanceKm(points[i - 1], points[i]) * 1000;
  return { version: 1, id: "story-test", activity: kind, state: "finished", startedAt: 0, endedAt: activeMs + 2000, updatedAt: activeMs + 2000, activeMs, distanceM: d, points, segment: 0, conditions: null };
};

test("GPS climb appears only when the phone reported altitude for most of the route", () => {
  assert.equal(gpsElevationGain(walkPoints(80)), null);
  assert.equal(gpsElevationGain(walkPoints(80, (i) => (i % 2 ? null : 900))), null);
  // A steady 1 m rise per fix with ±1.5 m noise climbs about 79 m.
  const gain = gpsElevationGain(walkPoints(80, (i) => 900 + i + (i % 2 ? 1.5 : -1.5)))!;
  assert.ok(gain > 70 && gain < 85, String(gain));
  // Pure noise on flat ground is not climb.
  assert.equal(gpsElevationGain(walkPoints(80, (i) => 900 + (i % 3) - 1)), 0);
});

test("Story share: platinum runs, olive walks, V-only, compact numbers, nothing private", () => {
  const run = storyModel(activityOf("running", walkPoints(120, (i) => 900 + i * 0.8)));
  const walk = storyModel(activityOf("walking", walkPoints(120)));
  assert.equal(run.palette, storyPalettes.running);
  assert.equal(run.palette.name, "platinum");
  assert.equal(walk.palette.name, "olive");
  assert.notEqual(run.palette.body, "#ff6a2e");
  // No activity words or brand text in the model: the icon and the V carry them.
  const text = JSON.stringify({ ...run, route: null }) + JSON.stringify({ ...walk, route: null });
  assert.doesNotMatch(text, /\b(RUN|WALK|VAELORA|AELORA)\b|جري|مشي/i);
  // Elevation only when measured.
  assert.equal(walk.elevationM, null);
  assert.ok(run.elevationM! > 0);
  // The route is unit-box geometry: no coordinates, and the ends are trimmed.
  assert.ok(run.route!.paths.flat().every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1));
  assert.ok(run.route!.paths.flat().length < 120);
  assert.equal(STORY.width * 16, STORY.height * 9);
});

test("Story numbers handle short, long and slow activities", () => {
  assert.equal(compactDuration(2029000), "33:49");
  assert.equal(compactDuration(6130000), "1:42:10");
  assert.equal(compactDuration(59000), "0:59");
  for (const [km, text] of [[0.9, "0.90"], [6.01, "6.01"], [12.42, "12.42"]] as const) {
    const pts = walkPoints(2);
    const a = { ...activityOf("walking", pts), distanceM: km * 1000 };
    assert.equal(storyModel(a).distance, text);
  }
  // A slow walk keeps a readable pace; no route points means no route line.
  const slow = storyModel({ ...activityOf("walking", walkPoints(40), 4500000) });
  assert.match(slow.pace!, /^\d{1,2}:\d{2}\/km$/);
  const none = storyModel({ ...activityOf("walking", []), distanceM: 0 });
  assert.equal(none.route, null);
  assert.equal(none.pace, null);
});

test("Story layout keeps every position and size inside the social safe areas", () => {
  const model = storyModel(activityOf("running", walkPoints(120)));
  const tall = storyModel(activityOf("running", walkPoints(120).map((p, i) => ({ ...p, longitude: 35.85, latitude: 31.95 + i * 0.0004 }))));
  for (const m of [model, tall])
    for (const position of storyPositions)
      for (const scale of [0.75, 1, 1.25]) {
        const L = storyLayout(m, position, scale);
        assert.ok(L.box.x >= storySafe.side - 0.5 && L.box.x + L.box.width <= STORY.width - storySafe.side + 0.5, position);
        assert.ok(L.box.y >= storySafe.top - 0.5 && L.box.y + L.box.height <= STORY.height - storySafe.bottom + 0.5, `${position} ${scale}`);
        // Shape is preserved: the route box keeps the drawing's aspect ratio.
        if (L.route && m.route) assert.ok(Math.abs(L.route.w / L.route.h - Math.max(m.route.aspect, 24 / 380 / 2)) < 0.05 || L.route.h === 24 * L.scale);
        assert.ok(L.distance.size > L.metrics.size * 2, "distance is the hero figure");
      }
});

test("Saved places, routes and activities stay local, strict and backward compatible", () => {
  assert.deepEqual(parseSavedPlaces(["aqaba-city-park", "aqaba-city-park", "invented", 4]), ["aqaba-city-park"]);
  const store = new Map<string, string>();
  const next = toggleSavedPlace("dibeen-forest-reserve", [], { setItem: (k, v) => void store.set(k, v) });
  assert.deepEqual(next, ["dibeen-forest-reserve"]);
  assert.deepEqual(toggleSavedPlace("dibeen-forest-reserve", next, { setItem: () => {} }), []);
  // Old activities without a route or altitude stay valid; new fields are checked.
  const a = activityOf("walking", walkPoints(5));
  assert.ok(validateActivity(a));
  assert.ok(validateActivity({ ...a, routeId: "dana-rummana-trail", points: a.points.map((p) => ({ ...p, altitude: 1200 })) }));
  assert.throws(() => validateActivity({ ...a, routeId: "<script>" }));
  assert.throws(() => validateActivity({ ...a, points: a.points.map((p) => ({ ...p, altitude: 99999 })) }));
});

test("Near Me discovery from Irbid ranks nearby curated places with bounded weather calls", async () => {
  const { createDiscovery, discoveryRadii } = await import("../../src/server/recommendations/discovery.ts");
  const { locationContext } = await import("../../src/lib/dynamic-location.ts");
  const now = new Date("2026-09-22T08:00:00+03:00");
  let calls = 0;
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    time: `2026-09-22T${String(h).padStart(2, "0")}:00`,
    temperatureC: 20, apparentTemperatureC: 20, relativeHumidityPercent: 45, windKmh: 5, precipitationProbabilityPercent: 0, uvIndex: 1,
  }));
  const provider = {
    getForecast: async () => {
      calls++;
      return { ok: true, hourly, issues: [], metadata: {} } as never;
    },
  };
  assert.deepEqual(discoveryRadii, [3, 5, 10, 25, 50]);
  const result = await createDiscovery({ provider, clock: () => now })({
    cellId: locationContext(towns.irbid)!.cellId, activity: "walking", minutes: 60, radius: 50, preferences: [],
  });
  assert.ok(result.places.length > 0 && result.places.length <= 8);
  assert.ok(calls <= 9, `${calls} forecasts`);
  assert.ok(result.places.every((p) => p.distanceKm <= 51.6));
  assert.ok(result.places.some((p) => placeById(p.area.id)?.tier === "open-data"));
  assert.ok(!result.places.some((p) => placeById(p.area.id)?.governorate === "aqaba"));
});
