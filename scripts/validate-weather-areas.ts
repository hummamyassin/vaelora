import assert from "node:assert/strict";
import { weatherAreas, normalizeAreaText } from "../src/data/weather-areas.ts";
import { governorateAt, isInsideJordan } from "../src/lib/jordan.ts";
const ids = new Set<string>(),
  points = new Set<string>();
for (const area of weatherAreas) {
  assert.ok(!ids.has(area.id));
  ids.add(area.id);
  const point = `${area.latitude},${area.longitude}`;
  assert.ok(!points.has(point));
  points.add(point);
  const coords = { latitude: area.latitude, longitude: area.longitude };
  assert.ok(isInsideJordan(coords), `${area.id}: outside Jordan`);
  // `city` names the governorate the point actually lies in.
  assert.equal(governorateAt(coords)?.id, area.city, `${area.id}: governorate mismatch`);
  assert.ok(
    area.name.ar &&
      area.name.en &&
      /^\d{4}-\d{2}-\d{2}$/.test(area.reviewedAt),
  );
  assert.ok(
    area.sources.length &&
      area.sources.every((s) => new URL(s).protocol === "https:"),
  );
  assert.ok(!("suitability" in area) && !("terrain" in area));
  for (const other of weatherAreas.filter((a) => a.id !== area.id))
    assert.notEqual(
      normalizeAreaText(area.name.en),
      normalizeAreaText(other.name.en),
    );
}
console.log(
  `Weather-area validation passed: ${weatherAreas.length} sourced forecast reference points in ${new Set(weatherAreas.map((a) => a.city)).size} governorates; no route or place attributes.`,
);
