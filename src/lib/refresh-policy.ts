/**
 * Background refresh timing for Home conditions. The server caches forecasts for
 * 10 minutes, so polling faster only repeats work and resets the screen.
 */
export const refreshAfterMs = 5 * 60_000;
/** Conditions older than this are withdrawn, never shown as current. */
export const maxConditionsAgeMs = 20 * 60_000;
export type RefreshMode = "foreground" | "background" | "skip";
export function isWithinMaxAge(receivedAt: number | null, now: number) {
  return receivedAt !== null && now - receivedAt <= maxConditionsAgeMs;
}
export function isRefreshDue(lastCompletedAt: number | null, now: number) {
  return lastCompletedAt === null || now - lastCompletedAt >= refreshAfterMs;
}
/**
 * A changed request or missing/expired data loads in the foreground (cleared,
 * with a loading state). The same request with fresh data refreshes quietly in
 * the background, and is skipped until due unless the user asked for it.
 */
export function refreshMode({
  sameRequest,
  receivedAt,
  lastCompletedAt,
  explicit,
  now,
}: {
  sameRequest: boolean;
  receivedAt: number | null;
  lastCompletedAt: number | null;
  explicit: boolean;
  now: number;
}): RefreshMode {
  if (!sameRequest || !isWithinMaxAge(receivedAt, now)) return "foreground";
  if (!explicit && !isRefreshDue(lastCompletedAt, now)) return "skip";
  return "background";
}
