import assert from "node:assert/strict";
import { weatherAreas, normalizeAreaText } from "../src/data/weather-areas.ts";
const ids = new Set<string>(),
  points = new Set<string>();
for (const area of weatherAreas) {
  assert.ok(!ids.has(area.id));
  ids.add(area.id);
  const point = `${area.latitude},${area.longitude}`;
  assert.ok(!points.has(point));
  points.add(point);
  assert.ok(
    Number.isFinite(area.latitude) &&
      area.latitude > 31.8 &&
      area.latitude < 32.2,
  );
  assert.ok(
    Number.isFinite(area.longitude) &&
      area.longitude > 35.7 &&
      area.longitude < 36.1,
  );
  assert.ok(
    area.name.ar &&
      area.name.en &&
      area.city === "amman" &&
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
  `Weather-area validation passed: ${weatherAreas.length} sourced forecast reference points; no route or place attributes.`,
);
