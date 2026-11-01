import { existsSync, readFileSync } from "node:fs";
import { jordanPlaces } from "../src/data/jordan-places.ts";
import { activityAreas } from "../src/data/activity-areas.ts";
import { routeSummaries } from "../src/data/route-summaries.ts";
import { governorateAt, governorateDistanceKm, governorates, isInsideJordan } from "../src/lib/jordan.ts";

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const arabic = (v: unknown) => text(v) && /[؀-ۿ]/.test(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const https = (v: unknown) => {
  try {
    return new URL(String(v)).protocol === "https:";
  } catch {
    return false;
  }
};
const localized = (v: unknown) => record(v) && text(v.en) && arabic(v.ar);

/**
 * Integrity checks for open-data Jordan places. A failure fails `npm run
 * validate` and CI. Checks consistency and provenance, not field truth.
 */
export function validateJordanPlaces(
  input: unknown,
  summaries: Record<string, unknown> = routeSummaries,
  routeFile: (id: string) => unknown = (id) =>
    existsSync(`public/routes/${id}.json`) ? JSON.parse(readFileSync(`public/routes/${id}.json`, "utf8")) : null,
): string[] {
  const errors: string[] = [];
  if (!Array.isArray(input) || !input.length) return ["Expected a non-empty Jordan places array"];
  const ids = new Set(activityAreas.map((a) => a.id)),
    slugs = new Set(activityAreas.map((a) => a.slug)),
    points = new Map<string, string>();
  for (const p of input) {
    if (!record(p)) {
      errors.push("Invalid place");
      continue;
    }
    const id = String(p.id);
    for (const field of ["id", "slug", "name", "district", "description"]) if (!text(p[field])) errors.push(`${id}: missing ${field}`);
    if (ids.has(id)) errors.push(`Duplicate id: ${id}`);
    if (slugs.has(String(p.slug))) errors.push(`Duplicate slug: ${p.slug}`);
    ids.add(id);
    slugs.add(String(p.slug));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(p.slug)) || p.slug !== p.id) errors.push(`${id}: slug must equal a kebab-case id`);
    if (p.tier !== "open-data") errors.push(`${id}: open-data dataset requires tier "open-data"`);
    if (p.verificationStatus !== "supported") errors.push(`${id}: open-data places are "supported", never "verified"`);
    if (!["place", "trail"].includes(String(p.kind))) errors.push(`${id}: invalid kind`);
    // Coordinates must be in Jordan and in the governorate the record claims.
    const point = { latitude: p.latitude as number, longitude: p.longitude as number };
    if (!finite(p.latitude) || !finite(p.longitude) || !isInsideJordan(point)) errors.push(`${id}: coordinate outside Jordan`);
    else {
      // Governorate rings are simplified to ~300 m, so a point just across an internal line
      // is accepted; a trail may be filed under the governorate of either end.
      const ends = [point];
      if (record(p.route)) {
        const file = routeFile(String(p.route.summaryId));
        const last = record(file) && Array.isArray(file.geometry) ? (file.geometry.at(-1) as number[]) : null;
        if (last) ends.push({ latitude: last[1], longitude: last[0] });
      }
      const near = (q: typeof point) => governorateAt(q)?.id === p.governorate || governorateDistanceKm(q, String(p.governorate)) <= 1.5;
      if (!ends.some(near)) errors.push(`${id}: governorate ${String(p.governorate)} disagrees with coordinate (${governorateAt(point)?.id})`);
    }
    if (!governorates.some((g) => g.id === p.governorate)) errors.push(`${id}: unknown governorate`);
    // Places must not share a point; trails may share a published trailhead.
    const key = `${p.latitude},${p.longitude}`;
    if (points.has(key) && (p.kind !== "trail" || points.get(key) !== "trail")) errors.push(`${id}: duplicate coordinate pair`);
    points.set(key, String(p.kind));
    const activities = p.supportedActivities;
    if (!Array.isArray(activities) || !activities.length || activities.some((a) => a !== "walking" && a !== "running") || new Set(activities).size !== activities.length)
      errors.push(`${id}: invalid activities`);
    for (const activity of ["walking", "running"]) {
      const fit = record(p.suitability) ? p.suitability[activity] : undefined;
      if (!["suitable", "limited", "unsuitable", "unknown"].includes(String(fit))) errors.push(`${id}: invalid ${activity} fit`);
      if (Array.isArray(activities) && activities.includes(activity) && !["suitable", "limited"].includes(String(fit))) errors.push(`${id}: unsupported ${activity} fit`);
    }
    if (!["park", "urban", "woodland", "open-space", "unknown"].includes(String(p.environment))) errors.push(`${id}: invalid environment`);
    if (!["flat", "rolling", "hilly", "unknown"].includes(String(p.terrain))) errors.push(`${id}: invalid terrain`);
    if (!Array.isArray(p.surfaces) || !p.surfaces.length || (p.surfaces.includes("unknown") && p.surfaces.length > 1)) errors.push(`${id}: invalid surfaces`);
    // Bilingual copy and provenance.
    if (!record(p.ar) || !arabic(p.ar.name) || !arabic(p.ar.description)) errors.push(`${id}: missing Arabic name or description`);
    if (!localized(p.locality)) errors.push(`${id}: locality must be bilingual`);
    if (!Array.isArray(p.caveats) || !p.caveats.every(localized)) errors.push(`${id}: caveats must be bilingual`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.lastReviewed))) errors.push(`${id}: missing review date`);
    if (!Array.isArray(p.evidence) || !p.evidence.length || !p.evidence.every((e) => record(e) && https(e.url) && text(e.note)))
      errors.push(`${id}: invalid evidence`);
    else if (!p.evidence.some((e) => record(e) && String(e.url).startsWith("https://www.openstreetmap.org/")))
      errors.push(`${id}: open-data place needs an OpenStreetMap source`);
    // Trails carry a route; the route's figures and geometry must hold together.
    if ((p.kind === "trail") !== (p.route !== null)) errors.push(`${id}: trails, and only trails, have a route`);
    if (record(p.route)) {
      const route = p.route;
      if (!["loop", "out-and-back", "point-to-point", "line"].includes(String(route.shape))) errors.push(`${id}: invalid route shape`);
      if (route.shape === "point-to-point" && (!localized(route.from) || !localized(route.to))) errors.push(`${id}: point-to-point route needs bilingual endpoints`);
      const s = summaries[String(route.summaryId)];
      if (!record(s)) {
        errors.push(`${id}: missing route summary`);
        continue;
      }
      if (!finite(s.distanceKm) || s.distanceKm <= 0 || s.distanceKm > 100) errors.push(`${id}: implausible distance`);
      if (route.shape === "loop" && s.shape !== "loop") errors.push(`${id}: loop claimed but the mapped line does not close`);
      if (!finite(s.elevationGainM) || !finite(s.elevationLossM) || s.elevationGainM < 0 || s.elevationLossM < 0) errors.push(`${id}: invalid elevation change`);
      if (!finite(s.minElevationM) || !finite(s.maxElevationM) || s.minElevationM > s.maxElevationM || s.minElevationM < -440 || s.maxElevationM > 1900)
        errors.push(`${id}: implausible elevation range`);
      if (finite(s.maxElevationM) && finite(s.minElevationM) && finite(s.elevationGainM) && s.elevationGainM < (s.maxElevationM - s.minElevationM) * 0.5 && s.shape === "loop")
        errors.push(`${id}: loop climb inconsistent with its range`);
      const start = s.start as number[];
      if (!Array.isArray(start) || Math.abs(start[1] - Number(p.latitude)) > 0.0002 || Math.abs(start[0] - Number(p.longitude)) > 0.0002)
        errors.push(`${id}: reference point must be the route start`);
      const file = routeFile(String(route.summaryId));
      if (!record(file) || !Array.isArray(file.geometry) || file.geometry.length < 2) {
        errors.push(`${id}: missing route geometry file`);
        continue;
      }
      const geometry = file.geometry as unknown[];
      if (!geometry.every((q) => Array.isArray(q) && finite(q[0]) && finite(q[1]) && isInsideJordan({ latitude: q[1], longitude: q[0] })))
        errors.push(`${id}: route geometry leaves Jordan or is malformed`);
      const profile = file.profile as unknown[];
      if (!Array.isArray(profile) || profile.length < 2 || !profile.every((q, i) => Array.isArray(q) && finite(q[0]) && finite(q[1]) && (i === 0 || q[0] >= (profile[i - 1] as number[])[0])))
        errors.push(`${id}: elevation profile malformed`);
      else {
        const heights = profile.map((q) => (q as number[])[1]);
        if (Math.min(...heights) !== s.minElevationM || Math.max(...heights) !== s.maxElevationM) errors.push(`${id}: profile range disagrees with summary`);
        const last = (profile.at(-1) as number[])[0] / 1000;
        if (finite(s.distanceKm) && Math.abs(last - s.distanceKm) > 0.2) errors.push(`${id}: profile length disagrees with distance`);
      }
      if (!String(file.license ?? "").includes("OpenStreetMap")) errors.push(`${id}: geometry file missing attribution`);
    }
  }
  return errors;
}

if (import.meta.main) {
  const errors = validateJordanPlaces(jordanPlaces);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    const regions = new Set(jordanPlaces.map((p) => p.governorate));
    console.log(
      `Jordan places validation passed: ${jordanPlaces.length} open-data entries (${jordanPlaces.filter((p) => p.kind === "trail").length} trails with geometry) across ${regions.size} governorates; ${activityAreas.length + jordanPlaces.length} curated places in total.`,
    );
  }
}
