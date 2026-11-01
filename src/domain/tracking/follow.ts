import type { Coordinates } from "../../lib/geography.ts";

/** A planned route as [longitude, latitude] pairs (public/routes/<id>.json). */
export type RouteLine = readonly (readonly [number, number])[];

/** Beyond this distance from the planned line the user is shown as off route. */
export const offRouteMetres = 60;

/**
 * Where a position sits relative to a planned line: distance from it, and
 * how far along it the nearest point is. A flat local projection is accurate
 * enough at trail scale. Context only; never turn-by-turn navigation.
 */
export function routeProgress(line: RouteLine, point: Coordinates) {
  const k = 111320 * Math.cos((point.latitude * Math.PI) / 180),
    m = 110540;
  const xy = (q: readonly [number, number]) => [(q[0] - point.longitude) * k, (q[1] - point.latitude) * m] as const;
  let total = 0,
    best = { offRouteM: Infinity, alongM: 0 };
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = xy(line[i - 1]),
      [bx, by] = xy(line[i]);
    const dx = bx - ax,
      dy = by - ay,
      length = Math.hypot(dx, dy);
    const t = length ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (length * length))) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best.offRouteM - 0.5) best = { offRouteM: d, alongM: total + t * length };
    total += length;
  }
  return {
    offRouteM: Math.round(best.offRouteM),
    alongM: Math.round(best.alongM),
    totalM: Math.round(total),
    remainingM: Math.round(Math.max(0, total - best.alongM)),
    offRoute: best.offRouteM > offRouteMetres,
  };
}
