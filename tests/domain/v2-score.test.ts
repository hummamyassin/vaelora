import test from "node:test";
import assert from "node:assert/strict";
import {
  scoreHour,
  activityOutlook,
  placeScore,
  scoreBand,
} from "../../src/domain/recommendation/score.ts";
import { v1WeatherPolicy } from "../../src/server/recommendations/policy.ts";
import type { HourlyConditions } from "../../src/domain/recommendation/types.ts";
const now = new Date("2026-09-13T12:10:00Z"),
  date = "2026-09-13";
const hour = (
  h: number,
  changes: Partial<HourlyConditions> = {},
): HourlyConditions => ({
  time: `${date}T${h}:00`,
  temperatureC: 20,
  apparentTemperatureC: 20,
  relativeHumidityPercent: 50,
  windKmh: 5,
  precipitationProbabilityPercent: 0,
  uvIndex: 0,
  ...changes,
});
test("V2 scores remain bounded across activities and weather ranges", () => {
  for (const activity of ["walking", "running"] as const)
    for (let n = -20; n <= 55; n++) {
      const s = scoreHour(
        activity,
        hour(15, { temperatureC: n }),
        v1WeatherPolicy,
      );
      assert.ok(s.score !== null && s.score >= 0 && s.score <= 100);
      assert.equal(s.factors[0].value, n);
    }
});
test("Activity scores reflect the existing distinct walking and running comfort bands", () => {
  assert.equal(
    scoreHour("walking", hour(15, { temperatureC: 25 }), v1WeatherPolicy).score,
    90,
  );
  assert.equal(
    scoreHour("running", hour(15, { temperatureC: 25 }), v1WeatherPolicy).score,
    65,
  );
});
test("Missing or invalid real inputs never manufacture a score", () => {
  for (const value of [null, NaN, Infinity])
    assert.equal(
      scoreHour("walking", hour(15, { windKmh: value }), v1WeatherPolicy).score,
      null,
    );
});
test("30/60/90 minute windows preserve exact duration and exclude elapsed minutes", () => {
  for (const minutes of [30, 60, 90]) {
    const r = activityOutlook(
      "walking",
      [hour(15), hour(16), hour(17)],
      date,
      minutes,
      now,
      v1WeatherPolicy,
    );
    assert.equal(r.bestWindow?.start, now.toISOString());
    assert.equal(
      Date.parse(r.bestWindow!.end) - Date.parse(r.bestWindow!.start),
      minutes * 60000,
    );
  }
});
test("A bad hour cannot be averaged away and gaps cannot be bridged", () => {
  assert.equal(
    activityOutlook(
      "walking",
      [hour(15), hour(16, { uvIndex: 10 })],
      date,
      90,
      now,
      v1WeatherPolicy,
    ).bestWindow,
    null,
  );
  assert.equal(
    activityOutlook(
      "walking",
      [hour(15), hour(17)],
      date,
      90,
      now,
      v1WeatherPolicy,
    ).bestWindow,
    null,
  );
});
test("Tomorrow excludes today's data, current hour remains absent, midnight is not crossed", () => {
  const tomorrow = "2026-09-14";
  const r = activityOutlook(
    "walking",
    [hour(15), hour(23, { time: `${tomorrow}T23:00` })],
    tomorrow,
    90,
    now,
    v1WeatherPolicy,
  );
  assert.equal(r.hours.length, 1);
  assert.equal(r.current, null);
  assert.equal(r.bestWindow, null);
});
test("Hard limits suppress windows without relaxing the user's request", () => {
  assert.equal(
    activityOutlook("walking", [hour(15)], date, 30, now, v1WeatherPolicy, {
      maxWindKmh: 1,
    }).bestWindow,
    null,
  );
});
test("Place score preserves fit-first weather-second ordering and exact ties", () => {
  const scores = (["suitable", "limited"] as const).flatMap((f) =>
    ([0, 1, 2] as const).map((s) => placeScore(f, s)),
  );
  assert.deepEqual(
    scores,
    [...scores].sort((a, b) => b - a),
  );
  assert.equal(placeScore("suitable", 0), placeScore("suitable", 0));
});
test("Score bands have natural Arabic labels and stable thresholds", () => {
  assert.equal(scoreBand(90).en, "Excellent");
  assert.equal(scoreBand(80).ar, "جيد جدًا");
  assert.equal(scoreBand(65).en, "Fair");
});
test("Invalid durations and duplicate timestamps are rejected", () => {
  assert.throws(() =>
    activityOutlook("walking", [hour(15)], date, 45, now, v1WeatherPolicy),
  );
  assert.throws(() =>
    activityOutlook(
      "walking",
      [hour(15), hour(15)],
      date,
      30,
      now,
      v1WeatherPolicy,
    ),
  );
});
test("Minute rounding at the hour boundary does not include an interval the outing never touches", () => {
  const r = activityOutlook(
    "walking",
    [hour(15, { uvIndex: 10 }), hour(16)],
    date,
    30,
    new Date("2026-09-13T12:59:50Z"),
    v1WeatherPolicy,
  );
  assert.equal(r.bestWindow?.start, "2026-09-13T13:00:00.000Z");
  assert.equal(r.bestWindow?.score, 90);
});
