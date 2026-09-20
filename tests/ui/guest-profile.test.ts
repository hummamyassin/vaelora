import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultProfile,
  parseProfile,
  initials,
  activityTotals,
  clearPreferences,
  clearAppPreferences,
  profileKey,
} from "../../src/lib/guest-profile.ts";
import { ActivityRecorder } from "../../src/domain/tracking/activity.ts";
test("Guest profile preserves named and skipped onboarding through JSON persistence", () => {
  for (const name of ["", "Test Walker", "مستخدم تجريبي"]) {
    const p = parseProfile({ ...defaultProfile, name, onboarding: true });
    assert.deepEqual(parseProfile(JSON.parse(JSON.stringify(p))), p);
    assert.equal(p.onboarding, true);
  }
  assert.equal(defaultProfile.onboarding, false);
});
test("Profile rejects unknown versions, invalid preferences, hidden characters and oversized names", () => {
  for (const patch of [
    { version: 2 },
    { activity: "cycling" },
    { minutes: 45 },
    { locale: "fr" },
    { theme: "neon" },
    { name: "a".repeat(41) },
    { name: "a\u202eb" },
    { onboarding: "true" },
  ])
    assert.throws(() => parseProfile({ ...defaultProfile, ...patch }));
  assert.deepEqual(
    parseProfile({
      ...defaultProfile,
      name: "  User  ",
      minutes: 90,
      activity: "running",
      theme: "dark",
      locale: "ar",
    }),
    {
      ...defaultProfile,
      name: "User",
      minutes: 90,
      activity: "running",
      theme: "dark",
      locale: "ar",
    },
  );
});
test("Initials are local and support Arabic and empty names", () => {
  assert.equal(initials("Test Walker"), "TW");
  assert.equal(initials("مستخدم تجريبي"), "مت");
  assert.equal(initials(""), "V");
});
test("Profile serialization excludes unknown fields and precise location data",()=>{
  const p=parseProfile({...defaultProfile,name:"<b>Guest</b>",route:[{latitude:0,longitude:0}],token:"untrusted"});
  assert.equal(p.name,"<b>Guest</b>");assert.equal("route" in p,false);assert.equal("token" in p,false);
});
test("Local totals separate walking and running pace and exclude unfinished sessions", () => {
  const make = (kind: "walking" | "running", id: string, seconds: number) => {
    const r = new ActivityRecorder(kind, id, 1800000000000);
    r.start(1800000000000);
    r.data.distanceM = 1000;
    r.data.activeMs = seconds * 1000;
    r.finish(1800000000000);
    return r.data;
  };
  const walk = make("walking", "walk", 600),
    run = make("running", "run", 300),
    draft = { ...walk, id: "draft", state: "paused" as const };
  assert.deepEqual(activityTotals([walk, run, draft]), {
    count: 2,
    distanceM: 2000,
    activeMs: 900000,
    paceSeconds: null,
  });
  assert.equal(activityTotals([walk, run], "walking").paceSeconds, 600);
  assert.equal(activityTotals([walk, run], "running").paceSeconds, 300);
  assert.equal(activityTotals([], "walking").paceSeconds, null);
});
test("Clear preferences preserves saved areas and unrelated browser data; reset targets only VAELORA keys", () => {
  const data = new Map([
    [profileKey, "profile"],
    ["vaelora:locale", "ar"],
    ["vaelora:saved-areas", "areas"],
    ["unrelated-app", "keep"],
  ]);
  const storage = {
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  clearPreferences(storage);
  assert.equal(data.has(profileKey), false);
  assert.equal(data.get("vaelora:saved-areas"), "areas");
  assert.equal(data.get("unrelated-app"), "keep");
  clearAppPreferences(storage);
  assert.equal(data.has("vaelora:saved-areas"), false);
  assert.equal(data.get("unrelated-app"), "keep");
});
