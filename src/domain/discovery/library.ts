import { distanceKm, type Coordinates } from "../../lib/geography.ts";
import { fitsAvailableTime, outingKm, routeDifficulty, routeSummary } from "../../data/outdoor-places.ts";
import type { Activity } from "../activity-area.ts";
import type { Difficulty, OutdoorPlace } from "../outdoor-place.ts";

export type DistanceBand = "short" | "medium" | "long";
export interface LibraryFilters {
  kind: "all" | "place" | "trail";
  activity: Activity;
  /** Time the user has; null ignores time. */
  time: 30 | 60 | 90 | null;
  difficulty: Difficulty | null;
  /** Trail outing distance: under 5 km, 5–10 km, 10 km and more. */
  distance: DistanceBand | null;
  governorate: string | null;
  saved: boolean;
  reviewed: boolean;
}
export const defaultFilters: LibraryFilters = {
  kind: "all",
  activity: "walking",
  time: null,
  difficulty: null,
  distance: null,
  governorate: null,
  saved: false,
  reviewed: false,
};
export const activeFilterCount = (f: LibraryFilters) =>
  [f.kind !== "all", f.time !== null, f.difficulty, f.distance, f.governorate, f.saved, f.reviewed].filter(Boolean).length;

function band(km: number): DistanceBand {
  return km < 5 ? "short" : km < 10 ? "medium" : "long";
}

/**
 * Hard filters over the curated library. Difficulty and distance only exist
 * for trails with a mapped route, so choosing either leaves trails only.
 */
export function filterLibrary(places: readonly OutdoorPlace[], f: LibraryFilters, savedIds: readonly string[] = []) {
  return places.filter((p) => {
    if (!p.supportedActivities.includes(f.activity)) return false;
    if (f.kind !== "all" && p.kind !== f.kind) return false;
    if (f.governorate && p.governorate !== f.governorate) return false;
    if (f.saved && !savedIds.includes(p.id)) return false;
    if (f.reviewed && p.tier !== "reviewed") return false;
    if (f.time && !fitsAvailableTime(p, f.time, f.activity)) return false;
    const summary = routeSummary(p);
    if (f.difficulty && (!summary || routeDifficulty(summary) !== f.difficulty)) return false;
    if (f.distance && (!summary || band(outingKm(p, summary)) !== f.distance)) return false;
    return true;
  });
}

/** Nearest first; without an origin, reviewed first, then by governorate and name. */
export function sortLibrary(places: readonly OutdoorPlace[], origin: Coordinates | null) {
  return [...places].sort((a, b) =>
    origin
      ? distanceKm(origin, a) - distanceKm(origin, b) || a.id.localeCompare(b.id)
      : Number(b.tier === "reviewed") - Number(a.tier === "reviewed") ||
        a.governorate.localeCompare(b.governorate) ||
        a.name.localeCompare(b.name),
  );
}

/**
 * Featured places for where the user actually is: the closest curated places
 * within reach, reviewed places first at similar distances. Without a
 * location, or with nothing near, it is empty rather than a list of Amman.
 */
export function featuredNear(places: readonly OutdoorPlace[], origin: Coordinates | null, activity: Activity, limit = 3, reachKm = 40) {
  if (!origin) return [];
  return places
    .filter((p) => p.supportedActivities.includes(activity) && distanceKm(origin, p) <= reachKm)
    .sort((a, b) => {
      const da = distanceKm(origin, a),
        db = distanceKm(origin, b);
      // Within 2 km of each other, a reviewed place leads; otherwise nearer wins.
      if (Math.abs(da - db) < 2 && a.tier !== b.tier) return a.tier === "reviewed" ? -1 : 1;
      return da - db || a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}

/** The closest curated place beyond a radius, for an honest "nothing nearby" state. */
export function nearestBeyond(places: readonly OutdoorPlace[], origin: Coordinates, activity: Activity) {
  const sorted = sortLibrary(
    places.filter((p) => p.supportedActivities.includes(activity)),
    origin,
  );
  return sorted[0] ? { place: sorted[0], km: distanceKm(origin, sorted[0]) } : null;
}
