import test from "node:test";
import assert from "node:assert/strict";
import {
  isRefreshDue,
  isWithinMaxAge,
  maxConditionsAgeMs,
  refreshAfterMs,
  refreshMode,
} from "../../src/lib/refresh-policy.ts";

const t0 = Date.parse("2026-10-25T12:00:00Z");

test("Home refresh never polls faster than the 10-minute server forecast cache warrants", () => {
  assert.ok(refreshAfterMs >= 60_000 && refreshAfterMs <= 600_000);
  assert.ok(maxConditionsAgeMs > refreshAfterMs);
  assert.equal(isRefreshDue(null, t0), true);
  assert.equal(isRefreshDue(t0, t0 + refreshAfterMs - 1), false);
  assert.equal(isRefreshDue(t0, t0 + refreshAfterMs), true);
});

test("Conditions past the maximum age are withdrawn, never treated as current", () => {
  assert.equal(isWithinMaxAge(null, t0), false);
  assert.equal(isWithinMaxAge(t0, t0 + maxConditionsAgeMs), true);
  assert.equal(isWithinMaxAge(t0, t0 + maxConditionsAgeMs + 1), false);
});

test("Only a changed request or missing/expired data clears Home into a loading state", () => {
  const base = {
    sameRequest: true,
    receivedAt: t0,
    lastCompletedAt: t0,
    explicit: false,
  };
  assert.equal(refreshMode({ ...base, sameRequest: false, now: t0 }), "foreground");
  assert.equal(refreshMode({ ...base, receivedAt: null, now: t0 }), "foreground");
  assert.equal(
    refreshMode({ ...base, now: t0 + maxConditionsAgeMs + 1 }),
    "foreground",
  );
  // Same request with fresh data: quiet background refresh once due.
  assert.equal(refreshMode({ ...base, now: t0 + refreshAfterMs }), "background");
  // Returning to Home or re-rendering before it is due does not refetch.
  assert.equal(refreshMode({ ...base, now: t0 + 1000 }), "skip");
  // An explicit retry always refreshes, without clearing fresh data.
  assert.equal(
    refreshMode({ ...base, explicit: true, now: t0 + 1000 }),
    "background",
  );
});
