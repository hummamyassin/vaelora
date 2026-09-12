import assert from "node:assert/strict";
import test from "node:test";
import { activityAreas } from "../../src/data/activity-areas.ts";
import { createOpenMeteoAdapter, forecastDates } from "../../src/server/weather/open-meteo.ts";
import { createRecommendationPipeline } from "../../src/server/recommendations/pipeline.ts";
import { createRecommendationHandler } from "../../src/server/recommendations/http.ts";
import { parseRecommendationRequest } from "../../src/server/recommendations/request.ts";
import { createSixInputScorer, requiredWeatherMetrics } from "../../src/domain/recommendation/v1-environment.ts";
import { v1WeatherPolicy } from "../../src/server/recommendations/policy.ts";

const now = new Date("2026-09-12T00:00:00Z"); // 03:00 Amman
const request = { activity: "running", date: "2026-09-12", startHour: 18, endHour: 22, durationHours: 1 };
const point = activityAreas[0];
function payload() {
  return { latitude: 32, longitude: 35.875, elevation: 900, timezone: "Asia/Amman", utc_offset_seconds: 10800,
    hourly_units: { time: "iso8601", temperature_2m: "°C", apparent_temperature: "°C", relative_humidity_2m: "%", wind_speed_10m: "km/h", precipitation_probability: "%", uv_index: "" },
    hourly: {
      time: ["2026-09-12", "2026-09-13"].flatMap(d => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, "0")}:00`)),
      temperature_2m: Array<number | null>(48).fill(20), apparent_temperature: Array<number | null>(48).fill(20),
      relative_humidity_2m: Array<number | null>(48).fill(50), wind_speed_10m: Array<number | null>(48).fill(5),
      precipitation_probability: Array<number | null>(48).fill(0), uv_index: Array<number | null>(48).fill(0),
    },
  };
}
function mockFetch(body: unknown = payload()): typeof fetch { return async () => Response.json(body); }
const adapter = (body: unknown = payload()) => createOpenMeteoAdapter({ fetch: mockFetch(body), clock: () => now });

test("exact coordinates, six fields and two Amman-local days are requested; grid metadata is retained", async () => {
  let requested = "";
  const provider = createOpenMeteoAdapter({ clock: () => now, fetch: async (url, init) => {
    requested = String(url); assert.equal(init?.cache, "no-store"); return Response.json(payload());
  } });
  const result = await provider.getForecast(point, now);
  assert.ok(result.ok);
  const url = new URL(requested);
  assert.equal(url.origin, "https://api.open-meteo.com");
  assert.equal(url.searchParams.get("latitude"), String(point.latitude));
  assert.equal(url.searchParams.get("longitude"), String(point.longitude));
  assert.equal(url.searchParams.get("hourly")?.split(",").length, 6);
  assert.equal(url.searchParams.get("timezone"), "Asia/Amman");
  assert.equal(url.searchParams.get("start_date"), "2026-09-12");
  assert.equal(url.searchParams.get("end_date"), "2026-09-13");
  assert.equal(result.hourly.length, 48);
  assert.equal(result.metadata.requested.latitude, point.latitude);
  assert.equal(result.metadata.returned.latitude, 32);
  assert.equal(result.metadata.retrievedAt, now.toISOString());
  assert.equal(result.hourly[0].precipitationProbabilityPercent, 0);
});

test("dates use Amman midnight, including year rollover", () => {
  assert.deepEqual(forecastDates(new Date("2026-12-31T21:01:00Z")), { today: "2027-01-01", tomorrow: "2027-01-02" });
  assert.throws(() => parseRecommendationRequest({ ...request, date: "2026-09-14" }, now), /today or tomorrow/);
});

test("nulls, absent columns, implausible values and missing hours are explicit, without index shifting", async () => {
  const raw = payload();
  raw.hourly.temperature_2m[0] = null;
  raw.hourly.relative_humidity_2m[1] = 101;
  const { uv_index: omitted, ...withoutUv } = raw.hourly;
  assert.equal(omitted.length, 48);
  const result = await adapter({ ...raw, hourly: withoutUv }).getForecast(point, now);
  assert.ok(result.ok);
  assert.equal(result.hourly[0].temperatureC, null);
  assert.equal(result.hourly[1].relativeHumidityPercent, null);
  assert.equal(result.hourly[0].uvIndex, null);
  const gapped = payload();
  for (const values of Object.values(gapped.hourly)) values.splice(1, 1);
  gapped.hourly.temperature_2m[1] = 23;
  const gap = await adapter(gapped).getForecast(point, now);
  assert.ok(gap.ok);
  assert.equal(gap.hourly[1].temperatureC, null);
  assert.equal(gap.hourly[2].temperatureC, 23);
  assert.ok(gap.issues.some(i => i.includes("missing-forecast-hour")));
});

test("bad timezone, units, duplicate timestamps, array alignment and provider error JSON are rejected", async () => {
  const mutations = [
    (p: ReturnType<typeof payload>) => { p.timezone = "UTC"; },
    (p: ReturnType<typeof payload>) => { p.hourly_units.wind_speed_10m = "m/s"; },
    (p: ReturnType<typeof payload>) => { p.hourly.time[1] = p.hourly.time[0]; },
    (p: ReturnType<typeof payload>) => { p.hourly.time[0] = "2026-09-14T00:00"; },
    (p: ReturnType<typeof payload>) => { p.hourly.temperature_2m.pop(); },
  ];
  for (const mutate of mutations) {
    const raw = payload(); mutate(raw);
    const result = await adapter(raw).getForecast(point, now);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "invalid-response");
  }
  const result = await adapter({ error: true, reason: "bad parameter" }).getForecast(point, now);
  assert.equal(result.ok, false);
});

test("HTTP, rate-limit, network, malformed JSON and hanging provider errors have safe typed outcomes", async () => {
  const fixtures: [typeof fetch, string][] = [
    [async () => new Response("private provider text", { status: 500 }), "provider-http"],
    [async () => new Response("limit", { status: 429 }), "rate-limited"],
    [async () => { throw new Error("private network details"); }, "network"],
    [async () => new Response("not JSON"), "invalid-response"],
    [async () => new Promise<Response>(() => {}), "timeout"],
  ];
  for (const [fetcher, code] of fixtures) {
    const result = await createOpenMeteoAdapter({ fetch: fetcher, timeoutMs: 20 }).getForecast(point, now);
    assert.ok(!result.ok);
    assert.equal(result.code, code);
    assert.ok(!result.message.includes("private"));
  }
});

test("cache deduplicates exact requests, expires, isolates mutation and does not merge grid neighbors", async () => {
  let time = now.getTime(), calls = 0;
  const provider = createOpenMeteoAdapter({ clock: () => new Date(time), ttlMs: 100, fetch: async () => { calls++; return Response.json(payload()); } });
  const [first, second] = await Promise.all([provider.getForecast(point, now), provider.getForecast(point, now)]);
  assert.ok(first.ok && second.ok); assert.equal(calls, 1);
  first.hourly[0].temperatureC = 999;
  const cached = await provider.getForecast(point, now);
  assert.ok(cached.ok); assert.equal(cached.metadata.cache, "hit"); assert.equal(cached.hourly[0].temperatureC, 20);
  await provider.getForecast({ ...point, latitude: point.latitude + 0.00001 }, now);
  assert.equal(calls, 2);
  time += 101; await provider.getForecast(point, now); assert.equal(calls, 3);
  await provider.getForecast(point, new Date("2026-09-13T00:00:00Z")); assert.equal(calls, 4);
});

test("failed fetches are not cached or replaced by stale forecasts", async () => {
  let calls = 0, time = now.getTime();
  const provider = createOpenMeteoAdapter({ ttlMs: 10, clock: () => new Date(time), fetch: async () => ++calls === 1 ? Response.json(payload()) : new Response(null, { status: 503 }) });
  assert.ok((await provider.getForecast(point, now)).ok);
  time += 11;
  assert.equal((await provider.getForecast(point, now)).ok, false);
  assert.equal((await provider.getForecast(point, now)).ok, false);
  assert.equal(calls, 3);
});

test("six-input scoring separates activities, requires every V1 field and leaves AQI optional", () => {
  const scorer = createSixInputScorer(v1WeatherPolicy);
  const hour = { time: "2026-09-12T18:00", temperatureC: 24, apparentTemperatureC: 24, relativeHumidityPercent: 50, windKmh: 5, precipitationProbabilityPercent: 0, uvIndex: 0 };
  assert.equal(scorer.evaluate("running", hour).severity, 1);
  assert.equal(scorer.evaluate("walking", hour).severity, 0);
  for (const metric of requiredWeatherMetrics) assert.equal(scorer.evaluate("walking", { ...hour, [metric]: null }).eligible, false);
  assert.deepEqual(scorer.evaluate("walking", hour).missing, ["usAqi"]);
  for (const [metric, value] of [["precipitationProbabilityPercent", 80], ["uvIndex", 8], ["windKmh", 40], ["relativeHumidityPercent", 99]] as const) {
    assert.equal(scorer.evaluate("walking", { ...hour, [metric]: value }).severity, 2);
  }
  assert.equal(scorer.evaluate("walking", hour, { maxApparentTemperatureC: 23 }).eligible, false);
  const policy = structuredClone(v1WeatherPolicy), stable = createSixInputScorer(policy);
  policy.activities.walking.temperatureC.preferred = [0, 1];
  assert.equal(stable.evaluate("walking", hour).severity, 0);
  assert.throws(() => createSixInputScorer(policy), /Invalid comfort band/);
});

test("hard flat preference filters before provider calls; walking-only areas never enter running", async () => {
  const queried: string[] = [];
  const provider = adapter();
  const run = createRecommendationPipeline({ clock: () => now, provider: { getForecast: async (area, time) => { queried.push(`${area.latitude},${area.longitude}`); return provider.getForecast(area, time); } } });
  const result = await run({ ...request, terrain: "flat" });
  assert.deepEqual(queried, [`${point.latitude},${point.longitude}`]);
  assert.deepEqual(result.topMatches.map(m => m.area.id), ["sports-city"]);
  assert.ok(result.excluded.some(e => e.areaId === "rainbow-street"));
  const none = await run({ ...request, environment: "woodland" });
  assert.equal(none.status, "no-eligible-areas"); assert.equal(queried.length, 1);
});

test("integration chooses best times, retains tiny spatial near-ties and keeps suitable fit ahead of limited", async () => {
  const provider = createOpenMeteoAdapter({ clock: () => now, fetch: async (url) => {
    const raw = payload();
    const isSportsCity = new URL(String(url)).searchParams.get("latitude") === String(point.latitude);
    raw.hourly.temperature_2m[18] = 34; // not a usable start hour
    raw.hourly.temperature_2m[19] = isSportsCity ? 22 : 22.1; // boundary near-tie
    raw.hourly.temperature_2m[20] = 35;
    raw.hourly.temperature_2m[21] = 35;
    return Response.json(raw);
  } });
  const result = await createRecommendationPipeline({ provider, clock: () => now })(request);
  assert.deepEqual(result.topMatches.map(m => m.area.id), ["king-hussein-park", "sports-city"]);
  assert.ok(result.topMatches.every(m => m.bestWindows.length === 1 && m.bestWindows[0].start.endsWith("T19:00")));
  assert.ok(result.bands[1].every(m => m.fit === "limited"));
  assert.equal(result.weather.length, 5);
});

test("missing hours break contiguous windows; partial errors keep other areas available and all errors return 503", async () => {
  const good = adapter();
  const run = createRecommendationPipeline({ clock: () => now, provider: { getForecast: async (area, time) => area.latitude === point.latitude
    ? { ok: false, code: "timeout", message: "Open-Meteo timeout", retryable: true } : good.getForecast(area, time) } });
  const result = await run(request);
  assert.equal(result.status, "partial");
  assert.deepEqual(result.topMatches.map(m => m.area.id), ["king-hussein-park"]);
  assert.ok(result.unavailable.some(a => a.areaId === "sports-city"));
  const raw = payload(); raw.hourly.temperature_2m[19] = null;
  const gap = await createRecommendationPipeline({ clock: () => now, provider: adapter(raw) })({ ...request, endHour: 20, durationHours: 2 });
  assert.equal(gap.topMatches.length, 0); assert.equal(gap.status, "partial");
  const failed = createRecommendationPipeline({ clock: () => now, provider: { getForecast: async () => ({ ok: false, code: "network", message: "Open-Meteo network", retryable: true }) } });
  const response = await createRecommendationHandler(failed)(new Request("http://localhost/api/recommendations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) }));
  assert.equal(response.status, 503);
  const body = await response.json(); assert.equal(body.topMatches.length, 0); assert.equal(body.weather.length, 5);
});

test("API rejects malformed input before I/O and returns typed JSON with factual trace", async () => {
  let calls = 0;
  const underlying = adapter();
  const handler = createRecommendationHandler(createRecommendationPipeline({ clock: () => now, provider: { getForecast: async (area, time) => { calls++; return underlying.getForecast(area, time); } } }));
  const send = (body: string, type = "application/json") => handler(new Request("http://localhost/api/recommendations", { method: "POST", headers: { "content-type": type }, body }));
  for (const input of [{ ...request, latitude: 1 }, { ...request, activity: "hiking" }, { ...request, surface: "unknown" }, { ...request, startHour: 18.5 }, { ...request, weatherLimits: { maxWindKmh: "10" } }, { ...request, date: "2026-09-14" }]) assert.equal((await send(JSON.stringify(input))).status, 400);
  assert.equal((await send("{")).status, 400);
  assert.equal((await send("{}", "text/plain")).status, 415);
  assert.equal((await send("x".repeat(8193))).status, 413);
  assert.equal(calls, 0);
  const response = await send(JSON.stringify({ ...request, terrain: "flat" }));
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  const result = await response.json(); assert.equal(result.trace.at(-1).action, "matches-returned"); assert.equal(calls, 1);
});
