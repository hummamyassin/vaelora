import { validCoordinates, type Coordinates } from "./geography.ts";

/** Product service boundary, not a cadastral/municipal boundary. See docs/v23.md. */
export const serviceCities = [
  {
    id: "amman",
    timezone: "Asia/Amman",
    cellDegrees: 0.02,
    polygon: [
      [35.76, 31.86],
      [35.84, 31.78],
      [35.99, 31.78],
      [36.04, 31.93],
      [36.02, 32.02],
      [35.94, 32.1],
      [35.82, 32.1],
      [35.76, 32.02],
    ] as readonly (readonly [number, number])[],
  },
] as const;

export function supportedCity(point: Coordinates) {
  if (!validCoordinates(point)) return null;
  return (
    serviceCities.find((city) => {
      let inside = false;
      const p = city.polygon;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [x, y] = p[i],
          [xx, yy] = p[j];
        if (
          y > point.latitude !== yy > point.latitude &&
          point.longitude < ((xx - x) * (point.latitude - y)) / (yy - y) + x
        )
          inside = !inside;
      }
      return inside;
    }) ?? null
  );
}
/** Only this coarse cell goes to the conditions endpoint; precise GPS stays in memory. */
export function locationContext(point: Coordinates) {
  const city = supportedCity(point);
  if (!city) return null;
  const lat = Math.floor(point.latitude / city.cellDegrees),
    lon = Math.floor(point.longitude / city.cellDegrees);
  return {
    cityId: city.id,
    cellId: `${city.id}:${lat}:${lon}`,
    latitude: Number(((lat + 0.5) * city.cellDegrees).toFixed(3)),
    longitude: Number(((lon + 0.5) * city.cellDegrees).toFixed(3)),
    characteristics: "unverified" as const,
  };
}
export function parseCell(value: unknown) {
  if (typeof value !== "string" || !/^[a-z-]+:-?\d{1,5}:-?\d{1,5}$/.test(value))
    throw new Error("Invalid location cell");
  const [id, a, b] = value.split(":"),
    city = serviceCities.find((c) => c.id === id);
  if (!city) throw new Error("Unsupported city");
  const latitude = (+a + 0.5) * city.cellDegrees,
    longitude = (+b + 0.5) * city.cellDegrees;
  // Edge cells may have an outside centre but must overlap the service polygon.
  const half = city.cellDegrees / 2,
    west = longitude - half,
    east = longitude + half,
    south = latitude - half,
    north = latitude + half;
  const corners = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
  ];
  const crossing = (
    a: readonly number[],
    b: readonly number[],
    c: readonly number[],
    d: readonly number[],
  ) => {
    const side = (
      p: readonly number[],
      q: readonly number[],
      r: readonly number[],
    ) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    if (
      Math.max(a[0], b[0]) < Math.min(c[0], d[0]) ||
      Math.max(c[0], d[0]) < Math.min(a[0], b[0]) ||
      Math.max(a[1], b[1]) < Math.min(c[1], d[1]) ||
      Math.max(c[1], d[1]) < Math.min(a[1], b[1])
    )
      return false;
    return (
      side(a, b, c) * side(a, b, d) <= 0 && side(c, d, a) * side(c, d, b) <= 0
    );
  };
  const overlaps =
    validCoordinates({ latitude, longitude }) &&
    (corners.some(
      ([longitude, latitude]) =>
        supportedCity({ latitude, longitude })?.id === city.id,
    ) ||
      city.polygon.some(
        ([x, y]) => x >= west && x <= east && y >= south && y <= north,
      ) ||
      city.polygon.some((p, i) =>
        corners.some((c, j) =>
          crossing(
            p,
            city.polygon[(i + 1) % city.polygon.length],
            c,
            corners[(j + 1) % 4],
          ),
        ),
      ));
  if (!overlaps) throw new Error("Outside coverage");
  return {
    cityId: city.id,
    cellId: value,
    latitude: Number(latitude.toFixed(3)),
    longitude: Number(longitude.toFixed(3)),
    characteristics: "unverified" as const,
  };
}
