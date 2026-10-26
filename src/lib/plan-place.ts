import { locationContext } from "./dynamic-location.ts";
import type { Coordinates } from "./geography.ts";

export const planPlaceKey = "vaelora:plan-place";
/** Where Home last planned from, so a returning visit opens on a plan. */
export interface PlanPlace {
  kind: "area" | "gps";
  name: string;
  latitude: number;
  longitude: number;
}
const round = (n: number) => Math.round(n * 1e5) / 1e5;

/**
 * A GPS fix is remembered only as the centre of its coarse forecast cell
 * (about 2 km), never the precise position. Named areas and search results
 * keep their own public coordinates.
 */
export function planPlaceFor(point: Coordinates, name: string, kind: "area" | "gps"): PlanPlace | null {
  const cell = locationContext(point);
  if (!cell) return null;
  return kind === "gps"
    ? { kind, name: "", latitude: cell.latitude, longitude: cell.longitude }
    : { kind, name: name.trim().slice(0, 120), latitude: round(point.latitude), longitude: round(point.longitude) };
}

/** Strict parse of stored data; anything malformed or outside the service area is ignored. */
export function parsePlanPlace(raw: unknown): PlanPlace | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const x = raw as Record<string, unknown>;
  if (Object.keys(x).some((k) => !["kind", "name", "latitude", "longitude"].includes(k))) return null;
  if (x.kind !== "area" && x.kind !== "gps") return null;
  if (typeof x.name !== "string" || x.name.length > 120 || (x.kind === "area" && !x.name.trim())) return null;
  if (typeof x.latitude !== "number" || typeof x.longitude !== "number") return null;
  const point = { latitude: x.latitude, longitude: x.longitude };
  const cell = locationContext(point);
  if (!cell) return null;
  // A stored GPS place must already be a cell centre; never accept a precise fix.
  if (x.kind === "gps" && (cell.latitude !== point.latitude || cell.longitude !== point.longitude)) return null;
  return { kind: x.kind, name: x.name, ...point };
}
