import test from "node:test";
import assert from "node:assert/strict";
import { planningState } from "../../src/domain/recommendation/plan-state.ts";

test("planning states keep recommendations distinct from recording access", () => {
  assert.equal(planningState({ hasLocation: false, loading: false, failed: false }), "location-unavailable");
  assert.equal(planningState({ hasLocation: true, loading: true, failed: false }), "checking");
  assert.equal(planningState({ hasLocation: true, loading: false, failed: true }), "weather-unavailable");
  assert.equal(planningState({ hasLocation: true, loading: false, failed: false, status: "insufficient" }), "weather-unavailable");
  assert.equal(planningState({ hasLocation: true, loading: false, failed: false, status: "poor" }), "no-window");
  assert.equal(planningState({ hasLocation: true, loading: false, failed: false, status: "now" }), "recommended");
  assert.equal(planningState({ hasLocation: true, loading: false, failed: false, status: "later" }), "recommended");
});
