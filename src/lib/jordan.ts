import { governorateRings, jordanRing, type Ring } from "../data/jordan-geography.ts";
import { validCoordinates, type Coordinates } from "./geography.ts";

/**
 * The one source of truth for VAELORA's planning coverage: Jordan. Planning,
 * weather, discovery and search are scoped by these helpers; recording is not.
 */
export const JORDAN_BOUNDS = { west: 34.88, south: 29.18, east: 39.31, north: 33.38 } as const;
/** A country-level view that fits all of Jordan, Aqaba to the Yarmouk. */
export const JORDAN_DEFAULT_VIEW = {
  center: { latitude: 31.25, longitude: 36.4 },
  zoom: 6.2,
  bounds: [[34.9, 29.15], [39.3, 33.4]] as [[number, number], [number, number]],
} as const;

function inRing(point: Coordinates, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i],
      [xx, yy] = ring[j];
    if (y > point.latitude !== yy > point.latitude && point.longitude < ((xx - x) * (point.latitude - y)) / (yy - y) + x)
      inside = !inside;
  }
  return inside;
}
/** Approximate distance in km from a point to a ring's edge. */
function edgeKm(point: Coordinates, ring: Ring) {
  const k = Math.cos((point.latitude * Math.PI) / 180);
  let best = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = (ring[i][0] - point.longitude) * k,
      ay = ring[i][1] - point.latitude,
      bx = (ring[i + 1][0] - point.longitude) * k,
      by = ring[i + 1][1] - point.latitude;
    const dx = bx - ax,
      dy = by - ay;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy) * 111.2);
  }
  return best;
}

/**
 * Inside Jordan's boundary. A simplified ring can cut the Aqaba waterline, so
 * points within 1 km of the edge on Jordan's own Gulf shore are accepted; the
 * window stops south of the Eilat border, so no foreign point is admitted.
 */
export function isInsideJordan(point: Coordinates): boolean {
  if (!validCoordinates(point)) return false;
  const { west, south, east, north } = JORDAN_BOUNDS;
  if (point.longitude < west || point.longitude > east || point.latitude < south || point.latitude > north) return false;
  if (inRing(point, jordanRing)) return true;
  const aqabaShore = point.latitude >= 29.35 && point.latitude <= 29.535 && point.longitude >= 34.93;
  return aqabaShore && edgeKm(point, jordanRing) <= 1;
}

export interface Governorate {
  id: string;
  en: string;
  ar: string;
}
/** The governorate a Jordan point falls in, for labels; nearest one near internal edges. */
export function governorateAt(point: Coordinates): Governorate | null {
  if (!isInsideJordan(point)) return null;
  const hit = governorateRings.find((g) => inRing(point, g.ring));
  const g = hit ?? [...governorateRings].sort((a, b) => edgeKm(point, a.ring) - edgeKm(point, b.ring))[0];
  return { id: g.id, en: g.en, ar: g.ar };
}
export const governorates: readonly Governorate[] = governorateRings.map(({ id, en, ar }) => ({ id, en, ar }));

/** A validated Jordan location with its governorate, or null outside coverage. */
export function normalizeJordanLocation(point: Coordinates) {
  if (!isInsideJordan(point)) return null;
  return {
    latitude: Number(point.latitude.toFixed(6)),
    longitude: Number(point.longitude.toFixed(6)),
    governorate: governorateAt(point)!,
  };
}

/** Km from a point to a governorate's simplified edge; 0 when inside it. */
export function governorateDistanceKm(point: Coordinates, id: string): number {
  const g = governorateRings.find((x) => x.id === id);
  if (!g) return Infinity;
  return inRing(point, g.ring) ? 0 : edgeKm(point, g.ring);
}
