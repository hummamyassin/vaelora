import type { ActivityArea } from "../activity-area.ts";
import { filterEligibleAreas } from "./eligibility.ts";
import { findBestTimeWindows, validateRequest, validateTieThreshold } from "./time-windows.ts";
import type { EnvironmentalScorer, HourlyConditions, Match, RecommendationRequest, Severity, TimeWindowPolicy } from "./types.ts";

export interface RecommendationPolicy {
  timeWindows: TimeWindowPolicy;
  locationNearTieThreshold: number;
}

/** Lexicographic: activity fit first; weather category second.
 * Within a band, stable id order is presentation order, not a quality ranking.
 */
export function bandMatches(matches: readonly Match[], threshold: number): Match[][] {
  validateTieThreshold(threshold);
  if (matches.some((m) => ![0, 1, 2].includes(m.weatherSeverity) || !["suitable", "limited"].includes(m.fit))) {
    throw new Error("Invalid match category");
  }
  const bands: Match[][] = [];
  for (const fit of ["suitable", "limited"] as const) {
    let remaining = matches.filter((m) => m.fit === fit);
    while (remaining.length) {
      const anchor = Math.min(...remaining.map((m) => m.weatherSeverity));
      const band = remaining.filter((m) => m.weatherSeverity <= anchor + threshold);
      band.sort((a, b) => a.area.id < b.area.id ? -1 : a.area.id > b.area.id ? 1 : 0);
      bands.push(band);
      remaining = remaining.filter((m) => m.weatherSeverity > anchor + threshold);
    }
  }
  return bands;
}

/** No I/O, live weather calls, LLM, database, or global clock. */
export function recommend(
  areas: readonly ActivityArea[],
  request: RecommendationRequest,
  forecasts: ReadonlyMap<string, readonly HourlyConditions[]>,
  scorer: EnvironmentalScorer,
  policy: RecommendationPolicy,
  now: Date,
) {
  validateRequest(request, now);
  validateTieThreshold(policy.locationNearTieThreshold);
  validateTieThreshold(policy.timeWindows.nearTieThreshold);
  if (![0, 1, 2].includes(policy.timeWindows.maxSeverity)) throw new Error("Invalid maximum severity");
  if (new Set(areas.map((a) => a.id)).size !== areas.length) throw new Error("Duplicate activity area ids");
  const { eligible, excluded } = filterEligibleAreas(areas, request);
  const unavailable: { areaId: string; reason: "no-practical-window"; excludedHours: ReturnType<typeof findBestTimeWindows>["excludedHours"] }[] = [];
  const matches: Match[] = [];
  for (const area of eligible) {
    const times = findBestTimeWindows(request, forecasts.get(area.id) ?? [], scorer, policy.timeWindows, now);
    if (!times.topWindows.length) {
      unavailable.push({ areaId: area.id, reason: "no-practical-window", excludedHours: times.excludedHours });
      continue;
    }
    const fit = area.suitability[request.activity];
    if (fit !== "suitable" && fit !== "limited") throw new Error("Ineligible fit passed filtering");
    matches.push({ area, fit, bestWindows: times.topWindows, weatherSeverity: Math.min(...times.topWindows.map((w) => w.severity)) as Severity });
  }
  const bands = bandMatches(matches, policy.locationNearTieThreshold);
  return { scorerId: scorer.id, bands, topMatches: bands[0] ?? [], excluded, unavailable };
}
