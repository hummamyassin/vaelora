import assert from "node:assert/strict";
import test from "node:test";
import { activityAreas } from "../../src/data/activity-areas.ts";
import research from "../../docs/research/activity-areas/candidates.json" with { type: "json" };
import { validateActivityAreas } from "../../scripts/validate-activity-areas.ts";
import { filterEligibleAreas } from "../../src/domain/recommendation/eligibility.ts";

const changed = (patch: Record<string, unknown>) =>
  [{ ...activityAreas[0], ...patch }, ...activityAreas.slice(1)];
const fails = (input: unknown, pattern: RegExp, audit: unknown = research.areas) =>
  assert.match(validateActivityAreas(input, audit).join("\n"), pattern);

test("reviewed production dataset and research crosswalk are consistent", () => {
  assert.deepEqual(validateActivityAreas(activityAreas, research.areas), []);
});

test("candidate and unverified records cannot enter production", () => {
  for (const verificationStatus of ["candidate", "unverified", "invented"]) {
    fails(changed({ verificationStatus }), /not production eligible/);
  }
  const candidate = research.areas.find((row) => row.decision === "candidate")!;
  fails([...activityAreas, { ...activityAreas[0], id: candidate.id, slug: candidate.id }], /absent from reviewed production approvals/);
});

test("duplicate IDs, slugs, names, coordinates and canonical identities are rejected", () => {
  fails([...activityAreas, activityAreas[0]], /Duplicate id/);
  fails(changed({ slug: activityAreas[1].slug }), /Duplicate slug/);
  fails(changed({ name: activityAreas[1].name.toUpperCase() }), /Duplicate name/);
  fails(changed({ latitude: activityAreas[1].latitude, longitude: activityAreas[1].longitude }), /Duplicate coordinate pair/);
  const audit = research.areas.map((row, index) => index === 1 ? { ...row, canonicalKey: research.areas[0].canonicalKey } : row);
  fails(activityAreas, /Duplicate canonical location/, audit);
});

test("coordinates must be finite, plausible and agree with the reviewed source", () => {
  for (const latitude of [NaN, Infinity, null, "31.98", 0, 32.3]) {
    fails(changed({ latitude }), /coordinate outside/);
  }
  fails(changed({ longitude: 31.98 }), /coordinate outside/);
  fails(changed({ latitude: 31.99 }), /differs from reviewed source/);
});

test("only V1 activities and material supported fits are accepted", () => {
  for (const supportedActivities of [[], ["hiking"], ["running", "running"]]) {
    fails(changed({ supportedActivities }), /invalid activities/);
  }
  fails(changed({ suitability: { running: "unknown", walking: "suitable" } }), /unsupported running fit/);
  fails(changed({ suitability: { running: "excellent", walking: "suitable" } }), /invalid running fit/);
});

test("unknown attributes stay explicit; invalid or contradictory enums fail", () => {
  assert.deepEqual(validateActivityAreas(changed({ terrain: "unknown", surfaces: ["unknown"] }), research.areas), []);
  fails(changed({ terrain: "steep" }), /invalid terrain/);
  fails(changed({ environment: "beach" }), /invalid environment/);
  fails(changed({ surfaces: ["paved", "unknown"] }), /invalid surfaces/);
});

test("missing evidence, coordinate references and malformed entries fail", () => {
  fails(changed({ evidence: [] }), /invalid evidence/);
  fails(changed({ evidence: [{ url: "javascript:alert(1)", note: "source" }] }), /invalid evidence/);
  fails(changed({ evidence: activityAreas[0].evidence.slice(0, 1) }), /coordinate source missing/);
  fails(changed({ description: "" }), /missing description/);
  fails(changed({ slug: "Not a Slug" }), /invalid slug/);
  fails([null], /Invalid activity area/);
  fails(null, /Expected non-empty/);
});

test("orphan approvals, status mismatches and unresolved merges fail", () => {
  fails(activityAreas.slice(1), /approved record missing/);
  const opposite = activityAreas[0].verificationStatus === "verified" ? "supported" : "verified";
  fails(changed({ verificationStatus: opposite }), /status disagrees/);
  const audit = research.areas.map((row) => row.decision === "merged" ? { ...row, productionId: "missing" } : row);
  fails(activityAreas, /unresolved merge target/, audit);
});

test("every selection has a dated access, qualification and attribute review", () => {
  for (const field of ["reviewedOn", "reviewSummary", "qualification", "accessReview", "attributeReview", "limitations"]) {
    const audit = research.areas.map((row, index) => index === 0 ? { ...row, [field]: "" } : row);
    fails(activityAreas, /missing/, audit);
  }
  const audit = research.areas.map((row) => row.decision === "candidate" ? { ...row, evidence: [] } : row);
  fails(activityAreas, /invalid research evidence/, audit);
});

test("production running selection excludes leisure-only areas and preserves limited fits", () => {
  const request = { activity: "running" as const, date: "2026-09-12", startHour: 8, endHour: 10, durationHours: 1 };
  const result = filterEligibleAreas(activityAreas, request);
  for (const id of ["sports-city", "king-hussein-park", "al-nashama-park", "king-abdullah-ii-park", "ghamadan-perimeter"]) {
    assert.ok(result.eligible.some((area) => area.id === id), id);
  }
  for (const area of activityAreas.filter((area) => !area.supportedActivities.includes("running"))) {
    assert.ok(result.excluded.find((excluded) => excluded.areaId === area.id)?.reasons.includes("unsupported-activity"));
  }
  assert.equal(result.eligible.find((area) => area.id === "al-nashama-park")?.suitability.running, "limited");
  assert.equal(filterEligibleAreas(activityAreas, { ...request, activity: "walking" }).eligible.length, activityAreas.length);
});

test("real-data surface requirements exclude unknowns and do not imply an all-paved circuit", () => {
  const request = { activity: "running" as const, date: "2026-09-12", startHour: 8, endHour: 10, durationHours: 1, surface: "paved" as const };
  const result = filterEligibleAreas(activityAreas, request);
  assert.ok(result.excluded.find((area) => area.areaId === "king-abdullah-ii-park")?.reasons.includes("surface-mismatch"));
  const mixed = result.eligible.find((area) => area.id === "ghamadan-perimeter");
  assert.deepEqual(mixed?.surfaces, ["paved", "dirt"]);
  assert.equal(mixed?.suitability.running, "limited");
});
