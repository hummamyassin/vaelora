import test from "node:test";
import assert from "node:assert/strict";
import {
  ActivityRecorder,
  validateActivity,
  metrics,
  paceLabel,
  durationLabel,
} from "../../src/domain/tracking/activity.ts";
import { exportGPX, routeSegments } from "../../src/domain/tracking/export.ts";
const start = 1800000000000;
function recorder() {
  const r = new ActivityRecorder("walking", "test-session", start);
  r.start(start);
  return r;
}
function point(
  r: ActivityRecorder,
  seconds: number,
  latitude = 0,
  accuracy = 5,
) {
  return r.point(
    {
      latitude,
      longitude: 0,
      accuracy,
      timestamp: start + seconds * 1000,
      speed: null,
    },
    start + seconds * 1000,
  );
}
test("Track state machine rejects double start/resume and excludes paused time", () => {
  const r = recorder();
  assert.equal(r.start(start), false);
  r.tick(start + 10000);
  r.pause(start + 20000);
  r.tick(start + 90000);
  assert.equal(r.data.activeMs, 20000);
  assert.equal(point(r, 91, 0.001), false);
  r.resume(start + 100000);
  assert.equal(r.resume(start + 100000), false);
  r.finish(start + 110000);
  assert.equal(r.data.activeMs, 30000);
  assert.equal(r.data.state, "finished");
  assert.equal(r.finish(start + 120000), false);
  assert.equal(point(r, 120), false);
});
test("Distance uses accepted Haversine points and active pace/speed", () => {
  const r = recorder();
  point(r, 0);
  for (let n = 1; n <= 10; n++) point(r, n * 10, n * 0.0001);
  r.finish(start + 100000);
  assert.ok(Math.abs(r.data.distanceM - 111.195) < 0.01);
  assert.ok(Math.abs(metrics(r.data).averageSpeedKmh! - 4.003) < 0.01);
  assert.equal(paceLabel(metrics(r.data).averagePaceSeconds), "14:59");
  assert.equal(durationLabel(r.data.activeMs), "00:01:40");
  assert.doesNotThrow(() => validateActivity(r.data));
});
test("GPS rejects poor accuracy, duplicate/stale/invalid points and impossible jumps", () => {
  const r = recorder();
  assert.equal(point(r, 0), true);
  assert.equal(point(r, 0), false);
  assert.equal(point(r, 1, 0.01), false);
  assert.equal(r.quality, "jump");
  assert.equal(point(r, 2, 0.0001, 100), false);
  assert.equal(r.quality, "poor");
  assert.equal(point(r, 3, 91), false);
  assert.equal(r.data.distanceM, 0);
  assert.equal(
    r.point(
      {
        latitude: 0,
        longitude: 0,
        accuracy: 1,
        timestamp: start - 1,
        speed: null,
      },
      start + 4000,
    ),
    false,
  );
});
test("Stationary jitter and zero/short distance never create meaningful pace", () => {
  const r = recorder();
  point(r, 0);
  point(r, 5, 0.000001);
  assert.equal(r.data.points.length, 1);
  assert.equal(r.data.distanceM, 0);
  assert.deepEqual(metrics(r.data), {
    averageSpeedKmh: null,
    averagePaceSeconds: null,
  });
  point(r, 10, 0.0001);
  assert.equal(metrics(r.data).averagePaceSeconds, null);
  assert.equal(paceLabel(null), "—");
});
test("Pause/resume and long GPS gaps never bridge route movement", () => {
  const r = recorder();
  point(r, 0);
  point(r, 10, 0.0001);
  const d = r.data.distanceM;
  r.pause(start + 10000);
  r.resume(start + 20000);
  point(r, 21, 1);
  assert.equal(r.data.distanceM, d);
  r.tick(start + 40000);
  r.tick(start + 60000);
  point(r, 65, 2);
  assert.equal(r.data.distanceM, d);
  assert.equal(routeSegments(r.data.points).length, 3);
});
test("Suspended timer stops at last confirmed tick; recovery is paused", () => {
  const r = recorder();
  r.tick(start + 1000);
  r.tick(start + 65000);
  assert.equal(r.data.state, "paused");
  assert.equal(r.data.activeMs, 1000);
  const recovered = new ActivityRecorder(
    "walking",
    "unused",
    start + 70000,
    r.data,
  );
  assert.equal(recovered.data.state, "paused");
  assert.equal(recovered.data.activeMs, 1000);
});
test("Unreliable supplied GPS speed cannot override plausible accepted movement", () => {
  const r = recorder();
  point(r, 0);
  r.point(
    {
      latitude: 0.0001,
      longitude: 0,
      accuracy: 5,
      timestamp: start + 10000,
      speed: 100,
    },
    start + 10000,
  );
  assert.ok(r.currentSpeedMps! < 2);
  r.tick(start + 21000);
  assert.equal(r.currentSpeedMps, null);
});
test("Local schema rejects corruption, unknown versions, and invalid route order", () => {
  const r = recorder();
  point(r, 0);
  point(r, 10, 0.0001);
  r.finish(start + 10000);
  assert.throws(() => validateActivity({ ...r.data, version: 2 }));
  assert.throws(() => validateActivity({ ...r.data, distanceM: 999 }));
  assert.throws(() =>
    validateActivity({ ...r.data, points: [...r.data.points].reverse() }),
  );
  assert.throws(() => validateActivity({ ...r.data, activeMs: Infinity }));
});
test("GPX is completed-only, escaped, timestamped, and preserves pause segments", () => {
  const r = recorder();
  assert.throws(() => exportGPX(r.data));
  point(r, 0);
  point(r, 10, 0.0001);
  r.pause(start + 10000);
  r.resume(start + 20000);
  point(r, 21, 1);
  r.finish(start + 22000);
  const gpx = exportGPX(r.data, 'Walk <& "test">');
  assert.match(gpx, /xmlns="http:\/\/www.topografix.com\/GPX\/1\/1"/);
  assert.match(gpx, /Walk &lt;&amp; &quot;test&quot;&gt;/);
  assert.equal((gpx.match(/<trkseg>/g) || []).length, 2);
  assert.equal((gpx.match(/<trkpt /g) || []).length, 3);
  assert.ok(gpx.includes(new Date(start).toISOString()));
});
test("Empty completed routes reject GPX without generating fake movement", () => {
  const r = recorder();
  r.finish(start + 1000);
  assert.throws(() => exportGPX(r.data));
});
test("Resume rejects delayed readings acquired during the pause",()=>{const r=recorder();point(r,0);r.pause(start+1000);r.resume(start+10000);assert.equal(r.point({latitude:0.001,longitude:0,accuracy:5,timestamp:start+8000,speed:null},start+11000),false);assert.equal(r.data.points.length,1);});
