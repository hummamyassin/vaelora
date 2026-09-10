import type { ActivityArea } from "../activity-area.ts";
import type { RecommendationRequest } from "./types.ts";

export type ExclusionReason = "insufficient-evidence" | "unsupported-activity" | "unsuitable-activity" | "terrain-mismatch" | "surface-mismatch" | "environment-mismatch";

/** Preferences in the structured request are hard constraints, not soft boosts. */
export function filterEligibleAreas(areas: readonly ActivityArea[], request: RecommendationRequest) {
  const eligible: ActivityArea[] = [];
  const excluded: { areaId: string; reasons: ExclusionReason[] }[] = [];
  for (const area of areas) {
    const reasons: ExclusionReason[] = [];
    if (area.verificationStatus === "unverified" || area.evidence.length === 0) reasons.push("insufficient-evidence");
    if (!area.supportedActivities.includes(request.activity)) reasons.push("unsupported-activity");
    if (!["suitable", "limited"].includes(area.suitability[request.activity])) reasons.push("unsuitable-activity");
    if (request.terrain && area.terrain !== request.terrain) reasons.push("terrain-mismatch");
    if (request.surface && !area.surfaces.includes(request.surface)) reasons.push("surface-mismatch");
    if (request.environment && area.environment !== request.environment) reasons.push("environment-mismatch");
    if (reasons.length) excluded.push({ areaId: area.id, reasons });
    else eligible.push(area);
  }
  return { eligible, excluded };
}
