import test from "node:test";
import assert from "node:assert/strict";
import { parsePlanPlace, planPlaceFor } from "../../src/lib/plan-place.ts";
import { locationContext } from "../../src/lib/dynamic-location.ts";

test("A remembered GPS plan place is only the coarse forecast cell, never the precise fix", () => {
  const fix = { latitude: 31.981234, longitude: 35.901234 };
  const saved = planPlaceFor(fix, "Your current area", "gps")!;
  const cell = locationContext(fix)!;
  assert.deepEqual(saved, { kind: "gps", name: "", latitude: cell.latitude, longitude: cell.longitude });
  assert.notEqual(saved.latitude, fix.latitude);
  assert.deepEqual(parsePlanPlace(JSON.parse(JSON.stringify(saved))), saved);
  // A precise fix written into storage by hand is refused.
  assert.equal(parsePlanPlace({ kind: "gps", name: "", ...fix }), null);
});

test("Named plan places round-trip and malformed or out-of-area data is ignored", () => {
  const area = planPlaceFor({ latitude: 31.9678, longitude: 35.8789 }, " Abdoun ", "area")!;
  assert.equal(area.name, "Abdoun");
  assert.deepEqual(parsePlanPlace(area), area);
  assert.equal(planPlaceFor({ latitude: 32.55, longitude: 35.85 }, "Irbid", "area"), null);
  for (const bad of [null, [], "x", { ...area, extra: 1 }, { ...area, kind: "home" }, { ...area, name: "" }, { ...area, latitude: "31" }, { ...area, latitude: 32.55, longitude: 35.85 }])
    assert.equal(parsePlanPlace(bad), null);
});
