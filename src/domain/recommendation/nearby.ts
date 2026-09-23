import { distanceKm, type Coordinates } from "../../lib/geography.ts";
import type { dailyPlan } from "./daily-plan.ts";
interface NearbyCandidate {
  area: Coordinates & { id: string; verificationStatus: string };
  plan: ReturnType<typeof dailyPlan>;
  score: number | null;
}
/** Same deterministic ranking on server and client; exact distance never leaves the browser. */
export function rankNearby<T extends NearbyCandidate>(
  rows: readonly T[],
  origin: Coordinates | null,
): T[] {
  const order = {
    now: 0,
    later: 1,
    poor: 2,
    insufficient: 3,
    "no-location": 4,
  };
  return [...rows].sort(
    (a, b) =>
      order[a.plan.status] - order[b.plan.status] ||
      (b.score ?? -1) - (a.score ?? -1) ||
      Number(b.area.verificationStatus === "verified") -
        Number(a.area.verificationStatus === "verified") ||
      (origin ? distanceKm(origin, a.area) - distanceKm(origin, b.area) : 0) ||
      a.area.id.localeCompare(b.area.id),
  );
}
