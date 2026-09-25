import test from "node:test";
import assert from "node:assert/strict";
import { privateRoute, shareModel } from "../../src/domain/tracking/share.ts";
import { personalProgress } from "../../src/domain/tracking/progress.ts";
import type {
  RecordedActivity,
  GPSPoint,
} from "../../src/domain/tracking/activity.ts";
import { distanceKm } from "../../src/lib/geography.ts";
const points = Array.from({ length: 31 }, (_, i) => ({
  latitude: 31.95,
  longitude: 35.85 + i * 0.001,
  accuracy: 5,
  timestamp: i * 10000,
  segment: 0,
  speed: null,
}));
const activity: RecordedActivity = {
  version: 1,
  id: "synthetic-test",
  activity: "walking",
  state: "finished",
  startedAt: Date.parse("2026-09-22T06:00:00+03:00"),
  endedAt: Date.parse("2026-09-22T06:30:00+03:00"),
  updatedAt: Date.parse("2026-09-22T06:30:00+03:00"),
  activeMs: 1800000,
  distanceM: 2800,
  points,
  segment: 0,
  conditions: null,
};
test("Share zones remove both ends, repeated visits and preserve the original route", () => {
  const original = structuredClone(points),
    loop = [
      ...points,
      ...points
        .toReversed()
        .map((p) => ({ ...p, timestamp: p.timestamp + 500000 })),
    ];
  for (const route of [points, loop])
    for (const path of privateRoute(route))
      for (const p of path)
        for (const end of [route[0], route.at(-1)!])
          assert.ok(distanceKm(p, end) * 1000 > 300);
  assert.deepEqual(points, original);
  assert.ok(privateRoute(points).flat().length < points.length);
});
test("No share line bridges a hidden zone, pause or short route", () => {
  const p = (longitude: number, segment = 0): GPSPoint => ({
    ...points[0],
    longitude,
    segment,
  });
  assert.deepEqual(privateRoute([p(35.9), p(35.89), p(35.91), p(35.9)]), []);
  assert.deepEqual(privateRoute(points.slice(0, 3)), []);
  const paths = privateRoute(
    points.map((p, i) => ({ ...p, segment: i < 15 ? 0 : 1 })),
  );
  assert.ok(paths.length >= 2);
  for (const path of paths)
    assert.equal(new Set(path.map((p) => p.segment)).size, 1);
  assert.throws(() => privateRoute(points, 0));
});
test("Bilingual share model contains normalized drawing only and real metrics", () => {
  for (const locale of ["en", "ar"] as const)
    for (const template of ["map", "performance", "minimal"] as const) {
      const model = shareModel(activity, locale, template);
      assert.equal(model.distance, "2.80");
      assert.equal(model.duration, "00:30:00");
      assert.equal(model.routeUseful, false);
      assert.ok(
        model.route.flat().every((p) => p.every((v) => v >= 0.09 && v <= 0.91)),
      );
      assert.doesNotMatch(
        JSON.stringify(model),
        /latitude|longitude|synthetic-test|2026-09|35\.85/,
      );
    }
  assert.equal(
    shareModel({ ...activity, points: [], distanceM: 0 }, "ar", "map").pace,
    "—",
  );
});
test("Share model only marks privacy-safe geometry useful when it has real two-axis shape", () => {
  const shaped = Array.from({ length: 41 }, (_, i) => ({
    ...points[0],
    latitude: 31.95 + Math.sin(i / 3) * 0.004,
    longitude: 35.85 + i * 0.001,
    timestamp: i * 10000,
  }));
  const model = shareModel({ ...activity, points: shaped, distanceM: 5000 }, "en", "map");
  assert.equal(model.routeUseful, true);
  assert.ok(model.route.flat().length >= 6);
});
test("Progress handles empty, single and partial weeks without fabricated comparisons", () => {
  const now = new Date("2026-09-23T12:00:00+03:00");
  assert.equal(personalProgress([], now).week.count, 0);
  const p = personalProgress([activity], now);
  assert.equal(p.week.count, 1);
  assert.equal(p.week.distanceM, 2800);
  assert.equal(p.previous, null);
  assert.equal(p.walking.longest?.id, activity.id);
  assert.equal(p.running.longest, null);
});
test("Progress uses Amman Monday boundary and separates sports and invalid GPS pace", () => {
  const now = new Date("2026-09-23T12:00:00+03:00"),
    run = {
      ...activity,
      id: "run",
      activity: "running" as const,
      distanceM: 5000,
    };
  const old = {
    ...activity,
    id: "old",
    startedAt: Date.parse("2026-09-20T23:59:00+03:00"),
  };
  const noGPS = {
    ...activity,
    id: "no-gps",
    distanceM: 0,
    points: [],
    activeMs: 600000,
  };
  const p = personalProgress([activity, run, old, noGPS], now);
  assert.equal(p.week.count, 3);
  assert.equal(p.previous?.count, 1);
  assert.equal(p.walking.paceSeconds, 1800000 / 2800);
  assert.equal(p.running.paceSeconds, 360);
  assert.equal(p.running.longest?.id, "run");
  assert.equal(p.week.activeMs, 4200000);
});
