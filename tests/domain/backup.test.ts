import test from "node:test";
import assert from "node:assert/strict";
import {
  BackupError,
  backupFormat,
  createBackup,
  parseBackup,
  planImport,
  serializeBackup,
} from "../../src/domain/tracking/backup.ts";
import type { RecordedActivity } from "../../src/domain/tracking/activity.ts";
import { distanceKm } from "../../src/lib/geography.ts";
import {
  persistenceStatus,
  requestPersistence,
} from "../../src/lib/storage-persistence.ts";

const start = Date.parse("2026-09-22T06:00:00+03:00");
function synthetic(id: string, offsetMs = 0): RecordedActivity {
  const points = Array.from({ length: 20 }, (_, i) => ({
    latitude: 31.95,
    longitude: 35.85 + i * 0.0001,
    accuracy: 5,
    timestamp: start + offsetMs + i * 5000,
    segment: 0,
    speed: null,
  }));
  let distanceM = 0;
  for (let i = 1; i < points.length; i++)
    distanceM += distanceKm(points[i - 1], points[i]) * 1000;
  const end = start + offsetMs + 100000;
  return {
    version: 1,
    id,
    activity: "walking",
    state: "finished",
    startedAt: start + offsetMs,
    endedAt: end,
    updatedAt: end,
    activeMs: 95000,
    distanceM,
    points,
    segment: 0,
    conditions: null,
  };
}
const rejects = (text: string, code: string) =>
  assert.throws(
    () => parseBackup(text),
    (e) => e instanceof BackupError && e.code === code,
  );

test("Backup export/import round trip preserves every finished activity exactly", () => {
  const rows = [synthetic("walk-b", 3600000), synthetic("walk-a")];
  const backup = createBackup(rows, new Date("2026-10-25T10:00:00Z"));
  assert.equal(backup.format, backupFormat);
  assert.equal(backup.exportedAt, "2026-10-25T10:00:00.000Z");
  assert.deepEqual(
    backup.activities.map((a) => a.id),
    ["walk-a", "walk-b"],
  );
  assert.deepEqual(parseBackup(serializeBackup(backup)), backup.activities);
});

test("A valid backup imports only activities whose IDs are not stored yet", () => {
  const incoming = parseBackup(
    serializeBackup(createBackup([synthetic("a"), synthetic("b", 3600000)])),
  );
  const plan = planImport(incoming, ["b", "unrelated"]);
  assert.deepEqual(
    plan.add.map((a) => a.id),
    ["a"],
  );
  assert.equal(plan.skipped, 1);
  assert.deepEqual(planImport(incoming, []).add.length, 2);
});

test("Empty history exports a valid backup that imports nothing", () => {
  const text = serializeBackup(createBackup([]));
  const incoming = parseBackup(text);
  assert.deepEqual(incoming, []);
  assert.deepEqual(planImport(incoming, ["a"]), { add: [], skipped: 0 });
});

test("Malformed or foreign files are rejected with a specific reason", () => {
  rejects("{not json", "not-json");
  rejects("[]", "wrong-format");
  rejects(JSON.stringify({ format: "other", activities: [] }), "wrong-format");
  rejects(
    JSON.stringify({ format: backupFormat, version: 9, activities: [] }),
    "unsupported-version",
  );
  const damaged = synthetic("bad");
  damaged.distanceM += 500;
  rejects(
    JSON.stringify({ format: backupFormat, version: 1, activities: [damaged] }),
    "invalid-activity",
  );
  const draft = { ...synthetic("draft"), state: "paused", endedAt: null };
  rejects(
    JSON.stringify({ format: backupFormat, version: 1, activities: [draft] }),
    "invalid-activity",
  );
});

test("Duplicate IDs inside one backup reject the whole file", () => {
  const a = synthetic("same"),
    b = synthetic("same", 3600000);
  rejects(
    JSON.stringify({ format: backupFormat, version: 1, activities: [a, b] }),
    "duplicate-id",
  );
});

test("Export skips unfinished drafts and never mutates the source records", () => {
  const draft = { ...synthetic("draft"), state: "paused" as const, endedAt: null };
  const done = synthetic("done");
  const before = structuredClone(done);
  assert.deepEqual(
    createBackup([draft, done]).activities.map((a) => a.id),
    ["done"],
  );
  assert.deepEqual(done, before);
});

test("Persistent storage status degrades safely without the Storage API", async () => {
  assert.equal(await persistenceStatus(null), "unsupported");
  assert.equal(await requestPersistence(null), "unsupported");
  let asked = 0;
  const granting = {
    persisted: async () => asked > 0,
    persist: async () => (++asked, true),
  };
  assert.equal(await persistenceStatus(granting), "best-effort");
  assert.equal(await requestPersistence(granting), "persisted");
  assert.equal(await persistenceStatus(granting), "persisted");
  const declining = { persisted: async () => false, persist: async () => false };
  assert.equal(await requestPersistence(declining), "best-effort");
  const throwing = {
    persisted: async () => {
      throw new Error("blocked");
    },
    persist: async () => true,
  };
  assert.equal(await persistenceStatus(throwing), "unsupported");
});
