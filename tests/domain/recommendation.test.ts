import test from "node:test";
import assert from "node:assert/strict";
import type { ActivityArea } from "../../src/domain/activity-area.ts";
import { filterEligibleAreas } from "../../src/domain/recommendation/eligibility.ts";
import { createEnvironmentalScorer } from "../../src/domain/recommendation/environment.ts";
import type { EnvironmentalPolicy } from "../../src/domain/recommendation/environment.ts";
import { findBestTimeWindows } from "../../src/domain/recommendation/time-windows.ts";
import { bandMatches, recommend } from "../../src/domain/recommendation/recommend.ts";
import type { HourlyConditions, Match, RecommendationRequest, Severity } from "../../src/domain/recommendation/types.ts";

// Entirely synthetic fixtures. Thresholds are deliberately illustrative, not guidance.
const now = new Date("2026-09-11T02:00:00Z"); // 05:00 Amman
const request: RecommendationRequest = { activity: "running", date: "2026-09-11", startHour: 6, endHour: 10, durationHours: 2 };
const policy: EnvironmentalPolicy = {
  id: "synthetic-test-policy-only",
  activities: {
    running: { temperatureC: { preferred: [10, 20], acceptable: [5, 25] }, windKmh: { preferred: [0, 10], acceptable: [0, 20] } },
    walking: { temperatureC: { preferred: [10, 25], acceptable: [5, 30] }, windKmh: { preferred: [0, 15], acceptable: [0, 25] } },
  },
};
const scorer = createEnvironmentalScorer(policy);
const windowsPolicy = { maxSeverity: 1 as const, nearTieThreshold: 0 };
const enginePolicy = { timeWindows: windowsPolicy, locationNearTieThreshold: 0 };
const area = (id: string, overrides: Partial<ActivityArea> = {}): ActivityArea => ({
  id, name: `Synthetic ${id}`, slug: `synthetic-${id}`, latitude: 0, longitude: 0,
  district: "Synthetic district", supportedActivities: ["running", "walking"],
  environment: "park", terrain: "flat", surfaces: ["paved"],
  suitability: { running: "suitable", walking: "suitable" },
  verificationStatus: "supported", evidence: [{ url: "https://example.invalid/fixture", note: "Synthetic test evidence only" }],
  description: "Never use as a real location", ...overrides,
});
const hour = (h: number, temperatureC = 15, overrides: Partial<HourlyConditions> = {}): HourlyConditions => ({
  time: `2026-09-11T${String(h).padStart(2, "0")}:00`, temperatureC, windKmh: 5, ...overrides,
});
const hours = [hour(6), hour(7), hour(8), hour(9)];
const match = (id: string, weatherSeverity: Severity, fit: Match["fit"] = "suitable"): Match => ({ area: area(id), fit, weatherSeverity, bestWindows: [] });

test("walking-only area is excluded from running even if suitability conflicts", () => {
  const walkingOnly = area("walk", { supportedActivities: ["walking"] });
  assert.equal(filterEligibleAreas([walkingOnly], request).eligible.length, 0);
  assert.equal(filterEligibleAreas([walkingOnly], { ...request, activity: "walking" }).eligible.length, 1);
});

test("unsupported, unsuitable, unknown fit and unverified evidence are filtered before scoring", () => {
  const areas = [
    area("unverified", { verificationStatus: "unverified" }), area("no-evidence", { evidence: [] }),
    area("unfit", { suitability: { running: "unsuitable", walking: "suitable" } }),
    area("unknown", { suitability: { running: "unknown", walking: "suitable" } }),
  ];
  const neverScore = { id: "never", evaluate: () => { throw new Error("Should not score excluded areas"); } };
  const result = recommend(areas, request, new Map(), neverScore, enginePolicy, now);
  assert.equal(result.excluded.length, 4);
  assert.deepEqual(result.topMatches, []);
});

test("explicit flat terrain excludes rolling, hilly, and unknown terrain", () => {
  const areas = [area("flat"), area("rolling", { terrain: "rolling" }), area("hilly", { terrain: "hilly" }), area("unknown", { terrain: "unknown" })];
  assert.deepEqual(filterEligibleAreas(areas, { ...request, terrain: "flat" }).eligible.map((a) => a.id), ["flat"]);
  assert.equal(filterEligibleAreas(areas, request).eligible.length, 4);
});

test("paved and park constraints exclude unpaved-only and wrong environments", () => {
  const areas = [area("mixed", { surfaces: ["paved", "gravel"] }), area("dirt", { surfaces: ["dirt"] }), area("urban", { environment: "urban" })];
  assert.deepEqual(filterEligibleAreas(areas, { ...request, surface: "paved", environment: "park" }).eligible.map((a) => a.id), ["mixed"]);
});

test("running and walking use separately configurable policies", () => {
  assert.equal(scorer.evaluate("running", hour(6, 23)).severity, 1);
  assert.equal(scorer.evaluate("walking", hour(6, 23)).severity, 0);
});

test("interval boundaries are inclusive and worst variable controls category", () => {
  assert.equal(scorer.evaluate("running", hour(6, 20)).severity, 0);
  assert.equal(scorer.evaluate("running", hour(6, 25)).severity, 1);
  assert.equal(scorer.evaluate("running", hour(6, 25.1)).severity, 2);
  assert.equal(scorer.evaluate("running", hour(6, 15, { windKmh: 21 })).severity, 2);
});

test("bad policy is rejected and caller mutation cannot change captured policy", () => {
  const copy = structuredClone(policy);
  const captured = createEnvironmentalScorer(copy);
  copy.activities.running.temperatureC.preferred = [10, 24];
  assert.equal(captured.evaluate("running", hour(6, 23)).severity, 1);
  copy.activities.running.temperatureC.preferred = [30, 10];
  assert.throws(() => createEnvironmentalScorer(copy), /nested/);
});

test("best time uses contiguous two-hour blocks without averaging away a bad hour", () => {
  const result = findBestTimeWindows(request, [hour(9, 15), hour(6, 30), hour(8, 15), hour(7, 23)], scorer, windowsPolicy, now);
  assert.deepEqual(result.topWindows.map((w) => [w.start, w.end, w.severity]), [["2026-09-11T08:00", "2026-09-11T10:00", 0]]);
  assert.equal(result.windows.find((w) => w.start.endsWith("07:00"))?.severity, 1);
  assert.equal(result.excludedHours[0].time, "2026-09-11T06:00");
});

test("forecast gaps cannot be bridged and short windows never invent extra hours", () => {
  assert.equal(findBestTimeWindows(request, [hour(6), hour(8)], scorer, windowsPolicy, now).windows.length, 0);
  assert.equal(findBestTimeWindows(request, [hour(9)], scorer, windowsPolicy, now).windows.length, 0);
});

test("explicit wind/heat limits exclude hours, including uncheckable apparent heat", () => {
  assert.equal(scorer.evaluate("running", hour(6), { maxWindKmh: 5 }).eligible, true);
  assert.equal(scorer.evaluate("running", hour(6), { maxWindKmh: 4 }).eligible, false);
  assert.equal(scorer.evaluate("running", hour(6), { maxTemperatureC: 14 }).eligible, false);
  const missing = scorer.evaluate("running", hour(6), { maxApparentTemperatureC: 25 });
  assert.equal(missing.eligible, false);
  assert.ok(missing.reasons.includes("cannot-check-apparentTemperatureC-limit"));
  assert.throws(() => scorer.evaluate("running", hour(6), { maxWindKmh: NaN }), /Invalid limit/);
});

test("missing optional UV/AQI preserves usable windows and does not change categories", () => {
  const missing = findBestTimeWindows(request, hours, scorer, windowsPolicy, now);
  const present = findBestTimeWindows(request, hours.map((h) => ({ ...h, uvIndex: 3, usAqi: 40 })), scorer, windowsPolicy, now);
  assert.equal(missing.topWindows.length, 3);
  assert.ok(missing.topWindows[0].missingOptional.includes("uvIndex"));
  assert.ok(missing.topWindows[0].missingOptional.includes("usAqi"));
  assert.deepEqual(missing.topWindows.map((w) => w.severity), present.topWindows.map((w) => w.severity));
  assert.equal(present.topWindows[0].missingOptional.includes("usAqi"), false);
});

test("missing/nonfinite core weather is unavailable, never replaced with zero", () => {
  for (const temperatureC of [undefined, null, NaN, Infinity]) assert.equal(scorer.evaluate("running", hour(6, 15, { temperatureC })).eligible, false);
  assert.equal(scorer.evaluate("running", hour(6, 15, { windKmh: null })).eligible, false);
  assert.equal(scorer.evaluate("running", hour(6, 15, { windKmh: -1 })).eligible, false);
  assert.equal(findBestTimeWindows(request, hours.map((h) => ({ ...h, temperatureC: null })), scorer, windowsPolicy, now).topWindows.length, 0);
});

test("today excludes already-started hours and caller clock is explicit", () => {
  const result = findBestTimeWindows(request, hours, scorer, windowsPolicy, new Date("2026-09-11T03:01:00Z"));
  assert.equal(result.topWindows[0].start, "2026-09-11T07:00");
  assert.equal(findBestTimeWindows(request, hours, scorer, windowsPolicy, new Date("2026-09-11T08:00:00Z")).topWindows.length, 0);
});

test("date scope is Amman-local and includes tomorrow across year rollover", () => {
  const next = { ...request, date: "2027-01-01" };
  const tomorrowHours = hours.map((h) => ({ ...h, time: h.time.replace("2026-09-11", "2027-01-01") }));
  assert.equal(findBestTimeWindows(next, tomorrowHours, scorer, windowsPolicy, new Date("2026-12-30T22:00:00Z")).topWindows.length, 3);
  assert.throws(() => findBestTimeWindows({ ...request, date: "2026-09-13" }, hours, scorer, windowsPolicy, now), /today or tomorrow/);
});

test("endHour 24 produces next-day midnight without crossing the requested interval", () => {
  const result = findBestTimeWindows({ ...request, startHour: 22, endHour: 24 }, [hour(22), hour(23)], scorer, windowsPolicy, now);
  assert.equal(result.topWindows[0].end, "2026-09-12T00:00");
});

test("rejects fractional bounds, impossible duration, duplicate/malformed timestamps", () => {
  assert.throws(() => findBestTimeWindows({ ...request, startHour: 6.5 }, hours, scorer, windowsPolicy, now), /whole-hour/);
  assert.throws(() => findBestTimeWindows({ ...request, durationHours: 5 }, hours, scorer, windowsPolicy, now), /whole-hour/);
  assert.throws(() => findBestTimeWindows(request, [hour(6), hour(6)], scorer, windowsPolicy, now), /Duplicate/);
  assert.throws(() => findBestTimeWindows(request, [hour(6, 15, { time: "2026-02-30T06:00" })], scorer, windowsPolicy, now), /Invalid forecast date/);
});

test("near-tie bands anchor to the best, never chain 0 to 1 to 2", () => {
  assert.deepEqual(bandMatches([match("c", 2), match("b", 1), match("a", 0)], 1).map((b) => b.map((m) => m.area.id)), [["a", "b"], ["c"]]);
  assert.throws(() => bandMatches([], -1), /Tie threshold/);
});

test("activity fit outranks weather and stable ids do not claim a within-band ranking", () => {
  const result = bandMatches([match("a", 0, "limited"), match("z", 1), match("b", 1)], 0);
  assert.deepEqual(result.map((b) => b.map((m) => m.area.id)), [["b", "z"], ["a"]]);
});

test("tiny weather differences return Top Matches and preserve co-best times", () => {
  const forecasts = new Map([ ["b", hours], ["a", hours.map((h) => ({ ...h, temperatureC: 15.1 }))] ]);
  const result = recommend([area("b"), area("a")], request, forecasts, scorer, enginePolicy, now);
  assert.deepEqual(result.topMatches.map((m) => m.area.id), ["a", "b"]);
  assert.equal(result.topMatches[0].bestWindows.length, 3);
  assert.equal(result.scorerId, policy.id);
  assert.deepEqual(recommend([area("a"), area("b")], request, forecasts, scorer, enginePolicy, now).topMatches, result.topMatches);
});

test("unavailable forecasts and all-poor weather return no matches with reasons", () => {
  const result = recommend([area("missing"), area("poor")], request, new Map([["poor", hours.map((h) => ({ ...h, temperatureC: 40 }))]]), scorer, enginePolicy, now);
  assert.deepEqual(result.topMatches, []);
  assert.equal(result.unavailable.length, 2);
  assert.ok(result.unavailable[0].excludedHours.every((h) => h.reasons.includes("missing-forecast-hour")));
});

test("integration keeps fit first and ignores forecasts of excluded candidates", () => {
  const areas = [area("limited", { suitability: { running: "limited", walking: "suitable" } }), area("suitable"), area("hilly", { terrain: "hilly" })];
  const result = recommend(areas, { ...request, terrain: "flat" }, new Map([
    ["limited", hours], ["suitable", hours.map((h) => ({ ...h, temperatureC: 23 }))],
    ["hilly", [hour(6), hour(6)]], // Would throw if evaluated.
  ]), scorer, enginePolicy, now);
  assert.equal(result.topMatches[0].area.id, "suitable");
  assert.deepEqual(result.excluded[0].reasons, ["terrain-mismatch"]);
});

test("time near-tie tolerance is configurable without inventing minute-level windows", () => {
  const forecast = [hour(6, 23), hour(7), hour(8), hour(9, 30)];
  const strict = findBestTimeWindows(request, forecast, scorer, windowsPolicy, now);
  const broad = findBestTimeWindows(request, forecast, scorer, { ...windowsPolicy, nearTieThreshold: 1 }, now);
  assert.equal(strict.topWindows.length, 1);
  assert.equal(broad.topWindows.length, 2);
});
