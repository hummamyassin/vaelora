import { isInsideJordan, governorateAt } from "./jordan.ts";
import { validCoordinates, type Coordinates } from "./geography.ts";

/** Planning coverage: all of Jordan (src/lib/jordan.ts), cut into ~2 km forecast cells. */
export const serviceRegion = { id: "jo", timezone: "Asia/Amman", cellDegrees: 0.02 } as const;
/** Cell IDs issued before Jordan-wide coverage; same grid, older prefix. */
const legacyPrefixes = ["amman"];

export function supportedRegion(point: Coordinates) {
  return validCoordinates(point) && isInsideJordan(point) ? serviceRegion : null;
}
/** Only this coarse cell goes to the conditions endpoint; precise GPS stays in memory. */
export function locationContext(point: Coordinates) {
  if (!supportedRegion(point)) return null;
  const size = serviceRegion.cellDegrees;
  const lat = Math.floor(point.latitude / size),
    lon = Math.floor(point.longitude / size);
  return context(`${serviceRegion.id}:${lat}:${lon}`, lat, lon);
}
function context(cellId: string, lat: number, lon: number) {
  const size = serviceRegion.cellDegrees;
  const latitude = Number(((lat + 0.5) * size).toFixed(3)),
    longitude = Number(((lon + 0.5) * size).toFixed(3));
  return {
    cityId: serviceRegion.id,
    cellId,
    latitude,
    longitude,
    governorate: governorateAt({ latitude, longitude })?.id ?? null,
    characteristics: "unverified" as const,
  };
}
/** A cell is in coverage when any of nine sample points across it lies in Jordan. */
export function parseCell(value: unknown) {
  if (typeof value !== "string" || !/^[a-z-]+:-?\d{1,5}:-?\d{1,5}$/.test(value))
    throw new Error("Invalid location cell");
  const [id, a, b] = value.split(":");
  if (id !== serviceRegion.id && !legacyPrefixes.includes(id)) throw new Error("Unsupported region");
  const lat = +a,
    lon = +b,
    size = serviceRegion.cellDegrees;
  const samples = [0.02, 0.5, 0.98].flatMap((dy) =>
    [0.02, 0.5, 0.98].map((dx) => ({ latitude: (lat + dy) * size, longitude: (lon + dx) * size })),
  );
  if (!samples.some((p) => validCoordinates(p) && isInsideJordan(p))) throw new Error("Outside coverage");
  return context(`${serviceRegion.id}:${lat}:${lon}`, lat, lon);
}
