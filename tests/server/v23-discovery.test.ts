import test from "node:test";
import assert from "node:assert/strict";
import {
  locationContext,
  supportedRegion,
  parseCell,
} from "../../src/lib/dynamic-location.ts";
import {
  createDiscovery,
  parseDiscovery,
} from "../../src/server/recommendations/discovery.ts";
import {
  parseSearch,
  parseSearchResults,
  parseSearchOutcome,
  createGeocoder,
  createSearchHandler,
} from "../../src/server/geocoding.ts";
import { activityOutlook } from "../../src/domain/recommendation/score.ts";
import { dailyPlan } from "../../src/domain/recommendation/daily-plan.ts";
import { rankNearby } from "../../src/domain/recommendation/nearby.ts";
import { v1WeatherPolicy } from "../../src/server/recommendations/policy.ts";
import type { WeatherProvider } from "../../src/server/weather/open-meteo.ts";
const now = new Date("2026-09-22T08:00:00+03:00");
const hours = Array.from({ length: 24 }, (_, h) => ({
  time: `2026-09-22T${String(h).padStart(2, "0")}:00`,
  temperatureC: 20,
  apparentTemperatureC: 20,
  relativeHumidityPercent: 45,
  windKmh: 5,
  precipitationProbabilityPercent: 0,
  uvIndex: 1,
}));
const provider: WeatherProvider = {
  getForecast: async () => ({
    ok: true,
    hourly: hours,
    issues: [],
    metadata: {
      provider: "open-meteo",
      attribution: "Synthetic test",
      requested: { latitude: 31.99, longitude: 35.91 },
      returned: { latitude: 31.99, longitude: 35.91, elevation: 900 },
      timezone: "Asia/Amman",
      utcOffsetSeconds: 10800,
      retrievedAt: now.toISOString(),
      requestUrl: "https://example.test",
      units: {},
      cache: "miss",
    },
  }),
};
const input = {
  cellId: locationContext({ latitude: 31.98, longitude: 35.9 })!.cellId,
  activity: "walking",
  minutes: 30,
  radius: 10,
  preferences: [],
};
test("Nearby ranks a usable window and reviewed fit before straight-line proximity", () => {
  const row = (
    id: string,
    longitude: number,
    status: "now" | "later",
    score: number,
  ) => ({
    area: { id, latitude: 31.98, longitude, verificationStatus: "verified" },
    score,
    plan: {
      status,
      window: {
        start: now.toISOString(),
        end: new Date(now.getTime() + 1800000).toISOString(),
        score: 90,
        severity: 0 as const,
      },
    },
  });
  const rows = [
    row("nearest", 35.9001, "later", 90),
    row("limited", 35.9002, "now", 60),
    row("best", 35.92, "now", 90),
  ];
  assert.deepEqual(
    rankNearby(rows, { latitude: 31.98, longitude: 35.9 }).map(
      (p) => p.area.id,
    ),
    ["best", "limited", "nearest"],
  );
  assert.equal(rows[0].area.id, "nearest");
  assert.deepEqual(
    rankNearby(rows, null).map((p) => p.area.id),
    ["best", "limited", "nearest"],
  );
});
test("Every sampled Jordan point resolves to an accepted weather cell", () => {
  // A coarse sweep of the whole country, plus a dense one along the Aqaba border.
  for (let latitude = 29.2; latitude < 33.4; latitude += 0.137)
    for (let longitude = 34.9; longitude < 39.3; longitude += 0.141) {
      const c = locationContext({ latitude, longitude });
      if (c) assert.equal(parseCell(c.cellId).cellId, c.cellId);
    }
  for (let latitude = 29.36; latitude < 29.6; latitude += 0.0041)
    for (let longitude = 34.9; longitude < 35.1; longitude += 0.0043) {
      const c = locationContext({ latitude, longitude });
      if (c) assert.equal(parseCell(c.cellId).cellId, c.cellId);
    }
});
test("Dynamic contexts are coarse, stable, unverified and cover Jordan, not its neighbours", () => {
  const c = locationContext({ latitude: 31.981, longitude: 35.901 })!;
  assert.equal(
    c.cellId,
    locationContext({ latitude: 31.982, longitude: 35.902 })!.cellId,
  );
  assert.equal(c.characteristics, "unverified");
  assert.equal(c.governorate, "amman");
  assert.deepEqual(parseCell(c.cellId), c);
  // Towns across Jordan, each with its governorate.
  for (const [latitude, longitude, governorate] of [
    [32.5556, 35.85, "irbid"],
    [32.3325, 35.7517, "ajloun"],
    [32.0833, 36.1, "zarqa"],
    [32.0392, 35.7272, "balqa"],
    [31.1844, 35.705, "karak"],
    [32.3428, 36.205, "mafraq"],
    [29.5322, 35.0061, "aqaba"],
    [32.559, 36.0069, "irbid"], // Ar-Ramtha, close to the Syrian border
  ] as const) {
    const cell = locationContext({ latitude, longitude });
    assert.ok(cell, `${governorate} is covered`);
    assert.equal(cell.governorate, governorate);
  }
  // Neighbouring places are never treated as Jordan.
  for (const p of [
    { latitude: 29.5577, longitude: 34.9519 }, // Eilat
    { latitude: 32.6189, longitude: 36.1021 }, // Daraa
    { latitude: 31.857, longitude: 35.444 }, // Jericho
    { latitude: 28.383, longitude: 36.566 }, // Tabuk
    { latitude: NaN, longitude: 35 },
  ])
    assert.equal(supportedRegion(p), null);
  assert.throws(() => parseCell("jo:9999:9999"));
  assert.throws(() => parseCell("jo:1428:1747")); // Eilat's cell
  // Cells issued before Jordan-wide coverage still parse to the same cell.
  assert.equal(parseCell(c.cellId.replace("jo:", "amman:")).cellId, c.cellId);
});
test("Discovery rejects precise coordinates, extra arguments and invalid cells", () => {
  for (const x of [
    { ...input, latitude: 31.9 },
    { ...input, cellId: "other:1599:1795" },
    { ...input, activity: "hiking" },
    { ...input, radius: 100 },
    { ...input, preferences: ["safe"] },
  ])
    assert.throws(() => parseDiscovery(x));
});
test("Nearby output respects reviewed activity fit, constraints and deterministic ordering", async () => {
  const run = createDiscovery({ provider, clock: () => now });
  const a = await run(input);
  assert.deepEqual(a, await run(input));
  assert.ok(a.places.length);
  for (const p of a.places) {
    assert.notEqual(p.area.verificationStatus, "unverified");
    assert.ok(p.area.evidence.length);
    assert.ok(p.distanceKm <= 11.6);
  }
  const b = await run({
    ...input,
    activity: "running",
    preferences: ["paved"],
  });
  assert.ok(b.places.length < a.places.length);
  for (const p of b.places) {
    assert.ok(p.area.supportedActivities.includes("running"));
    assert.ok(p.area.surfaces.includes("paved"));
  }
});
test("Daily plan distinguishes full-window now, later, poor, missing and no location", () => {
  const out = (h = hours) =>
    activityOutlook("walking", h, "2026-09-22", 60, now, v1WeatherPolicy);
  assert.equal(dailyPlan(out(), now).status, "now");
  assert.equal(
    dailyPlan(
      out(hours.map((h, i) => ({ ...h, temperatureC: i < 12 ? 50 : 20 }))),
      now,
    ).status,
    "later",
  );
  assert.equal(
    dailyPlan(out(hours.map((h) => ({ ...h, temperatureC: 50 }))), now).status,
    "poor",
  );
  assert.equal(dailyPlan(out([]), now).status, "insufficient");
  assert.equal(dailyPlan(null, now, false).status, "no-location");
});
test("Missing weather is not a invented recommendation", async () => {
  const a = await createDiscovery({
    provider: {
      getForecast: async () => ({
        ok: false,
        code: "network",
        message: "offline",
        retryable: true,
      }),
    },
    clock: () => now,
  })(input);
  assert.equal(a.plan.status, "insufficient");
  assert.ok(a.places.every((p) => p.score === null));
});
test("Search validates bilingual input and filters unsafe or outside results", () => {
  assert.equal(
    parseSearch({ query: "الجبيهة", locale: "ar" }).query,
    "الجبيهة",
  );
  assert.throws(() => parseSearch({ query: "<img>", locale: "en" }));
  const feature = (name: string, coordinates: number[]) => ({
    properties: { name },
    geometry: { type: "Point", coordinates },
  });
  assert.deepEqual(
    parseSearchResults({
      features: [
        feature("Test area", [35.9, 31.98]),
        feature("Ajloun", [35.7517, 32.3325]),
        feature("Eilat", [34.9519, 29.5577]),
        feature("<script>", [35.9, 31.98]),
      ],
    }).map((p) => [p.name, p.governorate?.id]),
    [["Test area", "amman"], ["Ajloun", "ajloun"]],
  );
  assert.deepEqual(parseSearchResults({ features: [feature("Ajloun", [35.7517, 32.3325])] })[0].governorate, { id: "ajloun", en: "Ajloun", ar: "عجلون" });
  assert.deepEqual(
    parseSearchOutcome({ features: [feature("Daraa", [36.1021, 32.6189])] }),
    { places: [], status: "outside" },
  );
});
test("Search caches, bounds provider calls and does not accept coordinate arguments", async () => {
  let calls = 0;
  const search = createGeocoder(
    async () => {
      calls++;
      return Response.json({ features: [] });
    },
    () => 10000,
  );
  await search({ query: "Amman", locale: "en" });
  await search({ query: "Amman", locale: "en" });
  assert.equal(calls, 1);
  await assert.rejects(() => search({ query: "Abdoun", locale: "en" }));
  const handler = createSearchHandler(search);
  assert.equal(
    (
      await handler(
        new Request("https://test/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "Amman",
            locale: "en",
            latitude: 31.9,
          }),
        }),
      )
    ).status,
    400,
  );
});

test("Late in the day Home offers tomorrow's best window from the same forecast", async () => {
  const twoDays = ["2026-09-22", "2026-09-23"].flatMap((day) =>
    hours.map((h) => ({ ...h, time: `${day}${h.time.slice(10)}` })),
  );
  const late = new Date("2026-09-22T23:40:00+03:00");
  const twoDayProvider: WeatherProvider = {
    getForecast: async (point, at) => ({ ...(await provider.getForecast(point, at)), hourly: twoDays }) as never,
  };
  const evening = await createDiscovery({ provider: twoDayProvider, clock: () => late })({ ...input, minutes: 60 });
  assert.equal(evening.plan.window, null);
  assert.equal(evening.status, "complete");
  assert.equal(evening.tomorrow?.date, "2026-09-23");
  assert.ok(Date.parse(evening.tomorrow!.window.start) >= Date.parse("2026-09-23T00:00:00+03:00"));
  // A day with a usable window never adds a tomorrow fallback.
  const morning = await createDiscovery({ provider: twoDayProvider, clock: () => now })(input);
  assert.ok(morning.plan.window);
  assert.equal(morning.tomorrow, null);
});
