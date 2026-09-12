import assert from "node:assert/strict";
import test from "node:test";
import { buildUiRecommendationRequest } from "../../src/components/recommendation-request.ts";

const policy = {
  running: { maxPreferredWind: 15, maxPreferredHeat: 22 },
  walking: { maxPreferredWind: 20, maxPreferredHeat: 26 },
};

test("UI presets produce bounded today/tomorrow Amman requests", () => {
  const now = new Date("2026-09-12T05:35:00Z"); // 08:35 Asia/Amman
  assert.deepEqual(buildUiRecommendationRequest("running", "now", new Set(), policy, now), {
    activity: "running", date: "2026-09-12", startHour: 9, endHour: 24, durationHours: 1,
  });
  assert.deepEqual(buildUiRecommendationRequest("walking", "tomorrow-morning", new Set(), policy, now), {
    activity: "walking", date: "2026-09-13", startHour: 6, endHour: 12, durationHours: 1,
  });
});

test("UI preferences map only to supported hard constraints and server-supplied policy limits", () => {
  const request = buildUiRecommendationRequest("walking", "tomorrow-evening", new Set(["flat", "paved", "park", "lowWind", "avoidHeat"]), policy, new Date("2026-12-31T20:00:00Z"));
  assert.deepEqual(request, {
    activity: "walking", date: "2027-01-01", startHour: 17, endHour: 22, durationHours: 1,
    terrain: "flat", surface: "paved", environment: "park",
    weatherLimits: { maxWindKmh: 20, maxTemperatureC: 26, maxApparentTemperatureC: 26 },
  });
});
