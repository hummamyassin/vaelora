export interface Coordinates { latitude: number; longitude: number }
export function validCoordinates(point: Coordinates): boolean {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}
/** Geographic distance only. Never a route, travel time, or driving distance. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  if (!validCoordinates(a) || !validCoordinates(b)) throw new Error("Invalid coordinates");
  const rad = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
/** Only reorders the authoritative leading band. Does not change membership or scores. */
export function orderNearby<T extends { area: Coordinates & { id: string } }>(matches: readonly T[], origin: Coordinates | null): T[] {
  return origin ? [...matches].sort((a, b) => distanceKm(origin, a.area) - distanceKm(origin, b.area) || a.area.id.localeCompare(b.area.id)) : [...matches];
}
export function forecastHours(minutes: number): number {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) throw new Error("Invalid outing duration");
  return Math.ceil(minutes / 60);
}
