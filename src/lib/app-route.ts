/**
 * Hash routes for the single-page shell, so Back, refresh and installed-PWA
 * navigation behave like an app. The hash never carries coordinates or routes;
 * only screen names, sheet names and reviewed place or local activity IDs.
 */
export const screens = [
  "home",
  "map",
  "track",
  "compare",
  "outlook",
  "saved",
] as const;
export const sheets = ["ask", "profile", "filters", "area"] as const;
export type Screen = (typeof screens)[number];
export type SheetName = (typeof sheets)[number];
export interface AppRoute {
  screen: Screen;
  sheet: SheetName | null;
  /** Reviewed place profile open over Home. */
  place: string | null;
  /** Saved activity recap open on Track. */
  activity: string | null;
}
export const homeRoute: AppRoute = {
  screen: "home",
  sheet: null,
  place: null,
  activity: null,
};
const idPattern = /^[a-zA-Z0-9-]{1,80}$/;
const validId = (v: string | null) => (v && idPattern.test(v) ? v : null);

export function parseRoute(hash: string): AppRoute {
  const raw = hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?", 2);
  const screen = (screens as readonly string[]).includes(path)
    ? (path as Screen)
    : "home";
  const params = new URLSearchParams(query);
  const sheet = params.get("sheet");
  return {
    screen,
    sheet: (sheets as readonly string[]).includes(sheet ?? "")
      ? (sheet as SheetName)
      : null,
    // Place profiles live on Home and recaps on Track; anything else is dropped.
    place: screen === "home" ? validId(params.get("place")) : null,
    activity: screen === "track" ? validId(params.get("activity")) : null,
  };
}
export function formatRoute(route: AppRoute) {
  const params = new URLSearchParams();
  if (route.screen === "home" && route.place) params.set("place", route.place);
  if (route.screen === "track" && route.activity)
    params.set("activity", route.activity);
  if (route.sheet) params.set("sheet", route.sheet);
  const query = params.toString();
  return `#/${route.screen}${query ? `?${query}` : ""}`;
}
export function sameRoute(a: AppRoute, b: AppRoute) {
  return formatRoute(a) === formatRoute(b);
}
/** Merge a partial change; changing screen drops screen-scoped details and sheets. */
export function nextRoute(current: AppRoute, change: Partial<AppRoute>): AppRoute {
  const screen = change.screen ?? current.screen;
  const screenChanged = screen !== current.screen;
  return parseRoute(
    formatRoute({
      screen,
      sheet: "sheet" in change ? (change.sheet ?? null) : screenChanged ? null : current.sheet,
      place: "place" in change ? (change.place ?? null) : screenChanged ? null : current.place,
      activity:
        "activity" in change
          ? (change.activity ?? null)
          : screenChanged
            ? null
            : current.activity,
    }),
  );
}
export interface HistoryEntry {
  vaelora: 1;
  depth: number;
  route: AppRoute;
}
export function isHistoryEntry(value: unknown): value is HistoryEntry {
  return (
    !!value &&
    typeof value === "object" &&
    (value as HistoryEntry).vaelora === 1 &&
    Number.isInteger((value as HistoryEntry).depth) &&
    typeof (value as HistoryEntry).route === "object"
  );
}
/**
 * Closing an overlay steps back when the overlay owns the current history entry,
 * otherwise (deep link or refresh) it replaces the entry so Back never leaves the app
 * unexpectedly.
 */
export function closeStrategy(entry: unknown): "back" | "replace" {
  return isHistoryEntry(entry) && entry.depth > 0 ? "back" : "replace";
}
