import test from "node:test";
import assert from "node:assert/strict";
import {
  locationContext,
  supportedCity,
  parseCell,
} from "../../src/lib/dynamic-location.ts";
import {
  createDiscovery,
  parseDiscovery,
} from "../../src/server/recommendations/discovery.ts";
import {
  parseSearch,
  parseSearchResults,
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
test("Every supported sampled boundary point resolves to an accepted weather cell", () => {
  for (let latitude = 31.781; latitude < 32.101; latitude += 0.0037)
    for (let longitude = 35.761; longitude < 36.041; longitude += 0.0037) {
      const c = locationContext({ latitude, longitude });
      if (c) assert.equal(parseCell(c.cellId).cellId, c.cellId);
    }
});
test("Dynamic Amman contexts are coarse, stable, unverified and reject other cities", () => {
  const c = locationContext({ latitude: 31.981, longitude: 35.901 })!;
  assert.equal(
    c.cellId,
    locationContext({ latitude: 31.982, longitude: 35.902 })!.cellId,
  );
  assert.equal(c.characteristics, "unverified");
  assert.deepEqual(parseCell(c.cellId), c);
  for (const p of [
    { latitude: 32.55, longitude: 35.85 },
    { latitude: 32.07, longitude: 36.09 },
    { latitude: 29.53, longitude: 35 },
    { latitude: NaN, longitude: 35 },
  ])
    assert.equal(supportedCity(p), null);
  assert.throws(() => parseCell("amman:9999:9999"));
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
        feature("Outside", [36.1, 32.1]),
        feature("<script>", [35.9, 31.98]),
      ],
    }),
    [{ name: "Test area", longitude: 35.9, latitude: 31.98 }],
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
