import { activityAreas } from "./activity-areas.ts";
import { jordanPlaces } from "./jordan-places.ts";
import { routeSummaries, type RouteSummary } from "./route-summaries.ts";
import type { Activity } from "../domain/activity-area.ts";
import type { Difficulty, OutdoorPlace } from "../domain/outdoor-place.ts";

/** VAELORA-reviewed Amman places, presented with the shared place fields. */
const reviewedPlaces: readonly OutdoorPlace[] = activityAreas.map((area) => ({
  ...area,
  tier: "reviewed",
  kind: "place",
  governorate: "amman",
  locality: { en: area.district, ar: "عمّان" },
  ar: null,
  route: null,
  caveats: [],
  lastReviewed: "2026-09-14",
}));

/** Every curated place across Jordan: reviewed first, then open data. */
export const outdoorPlaces: readonly OutdoorPlace[] = [...reviewedPlaces, ...jordanPlaces];
export const placeById = (id: string) => outdoorPlaces.find((p) => p.id === id) ?? null;

export function routeSummary(place: OutdoorPlace): RouteSummary | null {
  return place.route ? routeSummaries[place.route.summaryId] ?? null : null;
}

/**
 * VAELORA's own difficulty estimate from mapped distance and climb, not an
 * operator grading: "equivalent km" adds 1 km per 100 m of ascent, and a
 * steep average (40 m or more per km) is never easy.
 */
export function routeDifficulty(summary: RouteSummary): Difficulty {
  const equivalent = summary.distanceKm + summary.elevationGainM / 100;
  const steep = summary.elevationGainM / Math.max(summary.distanceKm, 0.1) >= 40;
  if (equivalent >= 14) return "hard";
  if (equivalent >= 5 || steep) return "moderate";
  return "easy";
}

/** Walked distance for the whole outing: an out-and-back is mapped one way. */
export function outingKm(place: OutdoorPlace, summary: RouteSummary) {
  return place.route?.shape === "out-and-back" ? summary.distanceKm * 2 : summary.distanceKm;
}

/**
 * A rough moving-time estimate (Naismith-style): 4.5 km/h walking or 9 km/h
 * running, plus one minute per 10 m of ascent. Breaks, terrain and fitness
 * change it; the UI always presents it as approximate.
 */
export function estimatedMinutes(place: OutdoorPlace, summary: RouteSummary, activity: Activity) {
  const km = outingKm(place, summary);
  const climb = place.route?.shape === "out-and-back" ? summary.elevationGainM + summary.elevationLossM : summary.elevationGainM;
  const pace = activity === "running" ? 60 / 9 : 60 / 4.5;
  return Math.round((km * pace + climb / 10) / 5) * 5;
}

/** The 30/60/90 time bands users choose from; trails only fit when the estimate does. */
export function fitsAvailableTime(place: OutdoorPlace, minutes: 30 | 60 | 90, activity: Activity) {
  const summary = routeSummary(place);
  // A place without a route adapts to any duration: walk as long as you have.
  if (!summary) return true;
  const estimate = estimatedMinutes(place, summary, activity);
  return minutes === 90 ? estimate >= 60 : estimate <= minutes * 1.25;
}
