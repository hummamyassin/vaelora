import test from "node:test";
import assert from "node:assert/strict";
import {
  weatherAreas,
  searchWeatherAreas,
  nearestWeatherArea,
} from "../../src/data/weather-areas.ts";
import { activityAreas } from "../../src/data/activity-areas.ts";
import {
  createDashboardPipeline,
  parseDashboardRequest,
} from "../../src/server/recommendations/dashboard.ts";
import { createDashboardHandler } from "../../src/server/recommendations/dashboard-http.ts";
import { createOpenMeteoAdapter } from "../../src/server/weather/open-meteo.ts";
import { answerWeather } from "../../src/server/ai/weather-answer.ts";
import { parseIntent } from "../../src/server/ai/intent.ts";
import { createOutdoorAgent } from "../../src/server/ai/agent.ts";
import { createAgentHandler } from "../../src/server/ai/http.ts";
import cases from "../../docs/evaluation/agent/cases.json" with { type: "json" };
const now = new Date("2026-09-13T12:10:00Z");
const payload = {
  latitude: 32,
  longitude: 35.9,
  elevation: 900,
  timezone: "Asia/Amman",
  utc_offset_seconds: 10800,
  hourly_units: {
    time: "iso8601",
    temperature_2m: "°C",
    apparent_temperature: "°C",
    relative_humidity_2m: "%",
    wind_speed_10m: "km/h",
    precipitation_probability: "%",
    uv_index: "",
  },
  hourly: {
    time: ["2026-09-13", "2026-09-14"].flatMap((d) =>
      Array.from(
        { length: 24 },
        (_, h) => `${d}T${String(h).padStart(2, "0")}:00`,
      ),
    ),
    temperature_2m: Array(48).fill(25),
    apparent_temperature: Array(48).fill(25),
    relative_humidity_2m: Array(48).fill(50),
    wind_speed_10m: Array(48).fill(5),
    precipitation_probability: Array(48).fill(0),
    uv_index: Array(48).fill(0),
  },
};
const run = () =>
  createDashboardPipeline({
    clock: () => now,
    provider: createOpenMeteoAdapter({
      clock: () => now,
      fetch: async () => Response.json(payload),
    }),
  });
const request = {
  areaId: "amman-central",
  activity: "walking",
  day: "today",
  minutes: 60,
  preferences: [],
};
test("Weather area records have evidence, finite reference points and no fabricated suitability", () => {
  for (const a of weatherAreas) {
    assert.ok(
      a.sources.length &&
        Number.isFinite(a.latitude) &&
        Number.isFinite(a.longitude),
    );
    assert.equal("suitability" in a, false);
    assert.equal(
      activityAreas.some((p) => p.id === a.id),
      false,
    );
  }
  assert.equal(weatherAreas.length, 9);
});
test("English Arabic aliases resolve the same supported area; unknown names remain unknown", () => {
  for (const q of ["Shafa Badran", "شفا بدران"])
    assert.equal(searchWeatherAreas(q)[0].id, "shafa-badran");
  assert.equal(searchWeatherAreas("Jubeiha")[0].id, "jubaiha");
  assert.equal(searchWeatherAreas("الجبيهة")[0].id, "jubaiha");
  assert.deepEqual(searchWeatherAreas("حي الشهيد الجنوبي"), []);
  assert.deepEqual(searchWeatherAreas("invented park"), []);
});
test("Near me uses nearest supported area, with out-of-coverage fallback", () => {
  assert.equal(
    nearestWeatherArea(weatherAreas.find((a) => a.id === "shafa-badran")!)?.id,
    "shafa-badran",
  );
  assert.equal(nearestWeatherArea({ latitude: 0, longitude: 0 }), null);
});
test("Untrusted coordinates, scores, unknown areas and unknown place IDs are rejected before weather I/O", () => {
  for (const x of [
    { ...request, latitude: 32 },
    { ...request, score: 99 },
    { ...request, areaId: "fake" },
    { ...request, placeIds: ["fake"] },
    { ...request, preferences: ["safe"] },
    { ...request, minutes: 45 },
  ])
    assert.throws(() => parseDashboardRequest(x));
});
test("Area without reviewed places still returns weather scores and best windows", async () => {
  const r = await run()({ ...request, areaId: "shafa-badran" });
  assert.equal(r.coverageCount, 0);
  assert.equal(r.topMatches.length, 0);
  assert.equal(r.walking.bestWindow?.score, 90);
  assert.ok(r.running.hours.length);
});
test("Place recommendations remain from the reviewed production set", async () => {
  const r = await run()(request);
  assert.ok(r.topMatches.length);
  for (const m of r.topMatches)
    assert.ok(
      activityAreas.some(
        (a) => a.id === m.area.id && a.verificationStatus !== "unverified",
      ),
    );
});
test("Today tomorrow and exact duration changes recompute the requested outlook", async () => {
  const r = await run()({ ...request, day: "tomorrow", minutes: 90 });
  assert.equal(r.date, "2026-09-14");
  assert.equal(r.walking.hours.length, 24);
  assert.equal(
    Date.parse(r.walking.bestWindow!.end) -
      Date.parse(r.walking.bestWindow!.start),
    5400000,
  );
});
test("Near me sends reviewed IDs only and filters before ranking", async () => {
  const r = await run()({ ...request, placeIds: ["king-hussein-park"] });
  assert.equal(r.topMatches.length, 1);
  assert.equal(r.topMatches[0].area.id, "king-hussein-park");
  const empty = await run()({ ...request, placeIds: [] });
  assert.equal(empty.topMatches.length, 0);
});
test("Dashboard HTTP preserves origin, MIME, size and private response protections", async () => {
  const handle = createDashboardHandler(run());
  const req = (body: unknown, headers = {}) =>
    new Request("http://localhost/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await handle(req(request, { Origin: "https://evil.test" }))).status,
    403,
  );
  assert.equal(
    (await handle(req(request, { "Content-Type": "text/plain" }))).status,
    415,
  );
  assert.equal(
    (await handle(req({ ...request, extra: "x".repeat(9000) }))).status,
    413,
  );
  const r = await handle(req(request));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store");
});
const base = () =>
  parseIntent({
    ...cases[0].mockIntent,
    weatherQuery: "conditions",
    weatherAreaIds: ["shafa-badran"],
    activity: "walking",
    day: "today",
    startHour: null,
    endHour: null,
    durationHours: null,
    durationMinutes: null,
    issues: [],
  });
for (const locale of ["en", "ar"] as const)
  for (const mode of [
    "conditions",
    "compare-activities",
    "compare-areas",
    "tonight-tomorrow-morning",
  ] as const)
    test(`V2 offline AI tool replay: ${mode} in ${locale}`, async () => {
      const intent = {
        ...base(),
        weatherQuery: mode,
        weatherAreaIds:
          mode === "compare-areas"
            ? ["shafa-badran", "jubaiha"]
            : ["shafa-badran"],
      };
      const r = await answerWeather(intent, run(), now, locale);
      assert.equal(r.status, "conditions");
      if (r.status === "conditions") {
        assert.ok(r.weatherResults.length);
        for (const x of r.weatherResults)
          assert.ok(x.bestWindow?.score === 90 || x.bestWindow?.score === 65);
        assert.match(r.text, /90\/100/);
      }
    });
for (const prompt of [
  "invent a park",
  "guarantee route safety",
  "unavailable area",
])
  test(`AI rejects unsupported request: ${prompt}`, async () => {
    let calls = 0;
    const r = await answerWeather(
      { ...base(), issues: ["unsupported-constraint"] },
      async () => {
        calls++;
        throw new Error("Should not call");
      },
      now,
      "en",
    );
    assert.equal(r.status, "clarification");
    assert.equal(calls, 0);
  });
test("AI tool schema rejects numeric scores and invented weather-area IDs", () => {
  assert.throws(() => parseIntent({ ...base(), score: 100 }));
  assert.throws(() => parseIntent({ ...base(), weatherAreaIds: ["made-up"] }));
});
test("Walking and running preference comparisons are independent of the selected activity", async () => {
  const walking = await run()({
    ...request,
    activity: "walking",
    preferences: ["avoidHeat"],
  });
  const running = await run()({
    ...request,
    activity: "running",
    preferences: ["avoidHeat"],
  });
  assert.equal(walking.walking.bestWindow?.score, 90);
  assert.equal(running.walking.bestWindow?.score, 90);
  assert.equal(walking.running.bestWindow, null);
  assert.equal(running.running.bestWindow, null);
});
test("Single agent uses validated area context and returns deterministic weather answers", async () => {
  const context = parseDashboardRequest({
    ...request,
    areaId: "shafa-badran",
    minutes: 90,
  });
  let extractedContext: unknown;
  const agent = createOutdoorAgent({
    clock: () => now,
    run: async () => {
      throw new Error("Legacy tool should not run");
    },
    weatherRun: run(),
    model: {
      extract: async (_p, _n, c) => {
        extractedContext = c;
        return {
          name: "get_vaelora_recommendations",
          arguments: { ...base(), weatherAreaIds: [] },
        };
      },
      present: async () => {
        throw new Error("Weather uses deterministic templates");
      },
    },
  });
  const r = await agent("أفضل وقت للمشي؟", "ar", context);
  assert.deepEqual(extractedContext, context);
  assert.equal(r.status, "conditions");
  assert.match(r.text, /شفا بدران/);
  assert.doesNotMatch(r.text, /Central Amman|وسط عمّان/);
  if (r.status === "conditions")
    assert.equal(
      Date.parse(r.weatherResults[0].bestWindow!.end) -
        Date.parse(r.weatherResults[0].bestWindow!.start),
      90 * 60000,
    );
});
test("Agent HTTP rejects coordinate-bearing or invented context before provider access", async () => {
  let calls = 0;
  const handler = createAgentHandler(() => {
    calls++;
    return null;
  });
  for (const context of [
    { ...request, latitude: 32 },
    { ...request, placeIds: ["fake"] },
    { ...request, score: 100 },
  ]) {
    const r = await handler(
      new Request("http://localhost/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "walk", context }),
      }),
    );
    assert.equal(r.status, 400);
  }
  assert.equal(calls, 0);
});
test("AI nearby place suggestions stay within the reviewed client-selected IDs", async () => {
  const context = parseDashboardRequest({
    ...request,
    placeIds: ["sports-city"],
  });
  const r = await answerWeather(
    { ...base(), weatherAreaIds: [] },
    run(),
    now,
    "en",
    context,
  );
  assert.equal(r.status, "conditions");
  assert.match(r.text, /Sports City/);
  assert.doesNotMatch(r.text, /King Hussein Park/);
});
test("Weather failure cannot become a calculated AI score", async () => {
  const unavailable = createDashboardPipeline({
    clock: () => now,
    provider: {
      getForecast: async () => ({
        ok: false,
        code: "network",
        message: "Unavailable",
        retryable: true,
      }),
    },
  });
  const r = await answerWeather(base(), unavailable, now, "en");
  assert.match(r.text, /forecast unavailable/);
  assert.doesNotMatch(r.text, /\d+\/100/);
});
