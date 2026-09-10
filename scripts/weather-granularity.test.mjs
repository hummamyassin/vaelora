import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { align, analyze, distanceKm, tolerances } from "./weather-granularity.mjs";

const times = ["2026-09-11T06:00", "2026-09-11T07:00"];
const locations = [{ name: "A", latitude: 32, longitude: 35.8 }, { name: "B", latitude: 32, longitude: 35.8 }];
const fixture = () => ({
  timezone: "Asia/Amman", utc_offset_seconds: 10800, latitude: 32, longitude: 35.8,
  hourly: { time: [...times], ...Object.fromEntries(Object.keys(tolerances).map((v) => [v, [1, 2]])) },
});

test("joins timestamps rather than comparing array positions", () => {
  const a = fixture();
  const b = fixture();
  for (const values of Object.values(b.hourly)) values.reverse();
  const result = analyze([a, b], locations);
  assert.equal(result.pairs[0].exactAllVariables, true);
  assert.equal(result.summary.temperature_2m.max, 0);
});

test("missing values are not zero or evidence of identity", () => {
  const a = fixture();
  const b = fixture();
  b.hourly.temperature_2m[0] = null;
  const result = analyze([a, b], locations);
  assert.equal(result.hourlyRanges[0].temperature_2m, null);
  assert.equal(result.summary.temperature_2m.n, 1);
  assert.equal(result.pairs[0].validHours, 1);
  assert.equal(result.pairs[0].nearIdentical, false);
  assert.equal(result.pairs[0].exactAllVariables, false);
});

test("rejects duplicate timestamps and malformed arrays", () => {
  const a = fixture();
  a.hourly.time[1] = a.hourly.time[0];
  assert.throws(() => align([a]), /Duplicate/);
  const b = fixture();
  b.hourly.wind_speed_10m.pop();
  assert.throws(() => align([b]), /unaligned/);
});

test("captures real contrasts and separates near from exact equality", () => {
  const a = fixture();
  const b = fixture();
  b.hourly.temperature_2m = [1.4, 2.4];
  const result = analyze([a, b], locations);
  assert.equal(result.summary.temperature_2m.mean, 0.4);
  assert.equal(result.pairs[0].nearIdentical, true);
  assert.equal(result.pairs[0].exactAllVariables, false);
  assert.equal(distanceKm(locations[0], locations[1]), 0);
});

test("saved live data has five complete days, plausible units/ranges, and independently reproducible hourly ranges", async () => {
  const snapshot = JSON.parse(await readFile(new URL("../docs/validation/weather-granularity/snapshot.json", import.meta.url), "utf8"));
  const limits = { temperature_2m: [-60, 60], apparent_temperature: [-80, 80], relative_humidity_2m: [0, 100], wind_speed_10m: [0, 300], precipitation_probability: [0, 100], uv_index: [0, 30] };
  const units = { temperature_2m: "°C", apparent_temperature: "°C", relative_humidity_2m: "%", wind_speed_10m: "km/h", precipitation_probability: "%", uv_index: "" };
  for (const mode of ["baseline", "control"]) {
    const batch = snapshot[mode].response;
    assert.equal(batch.length, 8);
    for (const r of batch) {
      assert.equal(r.hourly.time.length, 120);
      for (let i = 1; i < 120; i++) assert.equal(Date.parse(r.hourly.time[i] + "+03:00") - Date.parse(r.hourly.time[i - 1] + "+03:00"), 3600000);
      for (const [v, [lo, hi]] of Object.entries(limits)) {
        assert.equal(r.hourly_units[v], units[v]);
        assert.ok(r.hourly[v].every((n) => Number.isFinite(n) && n >= lo && n <= hi));
      }
    }
    const output = analyze(batch, snapshot.dataset.locations);
    for (let i = 0; i < 120; i++) {
      for (const v of Object.keys(tolerances)) {
        const values = batch.map((r) => r.hourly[v][i]).sort((a, b) => a - b);
        assert.ok(Math.abs(output.hourlyRanges[i][v] - (values.at(-1) - values[0])) < 0.00001);
      }
    }
  }
});
