import { activityAreas } from "../src/data/activity-areas.ts";
import research from "../docs/research/activity-areas/candidates.json" with { type: "json" };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const oneOf = (value: unknown, choices: readonly string[]) =>
  typeof value === "string" && choices.includes(value);
const listOf = (value: unknown, choices: readonly string[]) =>
  Array.isArray(value) && value.length > 0 &&
  value.every((item) => oneOf(item, choices)) && new Set(value).size === value.length;
const https = (value: unknown) => {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
};
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Offline integrity checks, not a substitute for geographical or evidence review. */
export function validateActivityAreas(input: unknown, audit: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(input) || input.length === 0 || !Array.isArray(audit)) {
    return ["Expected non-empty production array and research array"];
  }
  const seen = new Map<string, Set<string>>();
  function unique(field: string, value: unknown) {
    const key = String(value);
    const values = seen.get(field) ?? new Set<string>();
    if (values.has(key)) errors.push(`Duplicate ${field}: ${key}`);
    values.add(key);
    seen.set(field, values);
  }
  const approvals = new Map<string, Record<string, unknown>>();
  for (const row of audit) {
    if (!record(row) || !text(row.id)) { errors.push("Invalid research entry"); continue; }
    unique("research id", row.id);
    if (!text(row.reviewSummary) || !text(row.reviewedOn) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.reviewedOn)) {
      errors.push(`${row.id}: missing dated decision review`);
    }
    if (!oneOf(row.decision, ["production", "candidate", "rejected", "merged"])) {
      errors.push(`${row.id}: invalid research decision`);
    }
    if (row.decision === "production") {
      for (const field of ["qualification", "accessReview", "attributeReview", "limitations"]) {
        if (!text(row[field])) errors.push(`${row.id}: missing ${field}`);
      }
      if (!text(row.productionId) || !text(row.canonicalKey) || !text(row.scopeReview) ||
          !record(row.coordinateReference) || !https(row.coordinateReference.url)) {
        errors.push(`${row.id}: missing coordinate/canonical/scope review`);
        continue;
      }
      unique("canonical location", row.canonicalKey);
      unique("production approval", row.productionId);
      approvals.set(row.productionId, row);
    } else {
      if (row.verificationStatus !== "candidate") {
        errors.push(`${row.id}: non-production research must retain candidate status`);
      }
      if (!Array.isArray(row.evidence) || !row.evidence.length ||
          !row.evidence.every((item) => record(item) && https(item.url) && text(item.note))) {
        errors.push(`${row.id}: invalid research evidence`);
      }
      if (row.decision !== "merged" && row.productionId !== null) {
        errors.push(`${row.id}: non-production entry has a production target`);
      }
    }
  }
  for (const row of audit) {
    if (record(row) && row.decision === "merged" && !approvals.has(String(row.productionId))) {
      errors.push(`${row.id}: unresolved merge target`);
    }
  }
  for (const area of input) {
    if (!record(area)) { errors.push("Invalid activity area"); continue; }
    const id = String(area.id);
    for (const field of ["id", "name", "slug", "district", "description"]) {
      if (!text(area[field])) errors.push(`${id}: missing ${field}`);
    }
    unique("id", area.id);
    unique("slug", area.slug);
    unique("name", String(area.name).trim().toLowerCase().replace(/\s+/g, " "));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(area.slug))) errors.push(`${id}: invalid slug`);
    if (!oneOf(area.verificationStatus, ["supported", "verified"])) errors.push(`${id}: not production eligible`);
    if (!listOf(area.supportedActivities, ["running", "walking"])) errors.push(`${id}: invalid activities`);
    if (!oneOf(area.environment, ["park", "urban", "woodland", "open-space", "unknown"])) errors.push(`${id}: invalid environment`);
    if (!oneOf(area.terrain, ["flat", "rolling", "hilly", "unknown"])) errors.push(`${id}: invalid terrain`);
    if (!listOf(area.surfaces, ["paved", "track", "gravel", "dirt", "unknown"]) ||
        (Array.isArray(area.surfaces) && area.surfaces.includes("unknown") && area.surfaces.length > 1)) {
      errors.push(`${id}: invalid surfaces`);
    }
    for (const activity of ["running", "walking"]) {
      const fit = record(area.suitability) ? area.suitability[activity] : undefined;
      if (!oneOf(fit, ["suitable", "limited", "unsuitable", "unknown"])) errors.push(`${id}: invalid ${activity} fit`);
      if (Array.isArray(area.supportedActivities) && area.supportedActivities.includes(activity) &&
          !oneOf(fit, ["suitable", "limited"])) errors.push(`${id}: unsupported ${activity} fit`);
    }
    if (!Array.isArray(area.evidence) || !area.evidence.length ||
        !area.evidence.every((item) => record(item) && https(item.url) && text(item.note))) {
      errors.push(`${id}: invalid evidence`);
    }
    // Conservative envelope for this reviewed urban/southern cohort ONLY.
    // This is deliberately not advertised as the Greater Amman municipal boundary.
    if (!finite(area.latitude) || !finite(area.longitude) ||
        area.latitude < 31.85 || area.latitude > 32.02 || area.longitude < 35.80 || area.longitude > 35.96) {
      errors.push(`${id}: coordinate outside reviewed Amman envelope`);
    }
    unique("coordinate pair", `${area.latitude},${area.longitude}`);
    const approval = approvals.get(id);
    if (!approval) { errors.push(`${id}: absent from reviewed production approvals`); continue; }
    if (approval.verificationStatus !== area.verificationStatus) errors.push(`${id}: evidence status disagrees with research`);
    const point = approval.coordinateReference;
    if (!record(point) || !finite(point.latitude) || !finite(point.longitude) ||
        !finite(area.latitude) || !finite(area.longitude) ||
        Math.abs(point.latitude - area.latitude) > 0.00002 || Math.abs(point.longitude - area.longitude) > 0.00002) {
      errors.push(`${id}: coordinate differs from reviewed source`);
    }
    if (record(point) && (!Array.isArray(area.evidence) ||
        !area.evidence.some((item) => record(item) && item.url === point.url))) {
      errors.push(`${id}: coordinate source missing from evidence`);
    }
  }
  for (const id of approvals.keys()) {
    if (!input.some((area) => record(area) && area.id === id)) errors.push(`${id}: approved record missing from production`);
  }
  return errors;
}

if (import.meta.main) {
  const errors = validateActivityAreas(activityAreas, research.areas);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Dataset validation passed: ${research.areas.length} researched; ${activityAreas.length} production (${activityAreas.filter((a) => a.verificationStatus === "supported").length} supported, ${activityAreas.filter((a) => a.verificationStatus === "verified").length} verified).`);
    console.log("Scope: reviewed urban Amman sites; envelope and source checks are not municipal polygon validation.");
  }
}
