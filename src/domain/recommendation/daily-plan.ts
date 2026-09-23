import type { activityOutlook } from "./score.ts";
export type Outlook = ReturnType<typeof activityOutlook>;
/** A plan requires a complete outing window, not just one favorable reading. */
export function dailyPlan(
  outlook: Outlook | null,
  now: Date,
  hasLocation = true,
) {
  if (!hasLocation) return { status: "no-location" as const, window: null };
  if (!outlook || !outlook.hours.some((h) => h.score !== null))
    return { status: "insufficient" as const, window: null };
  const best = outlook.bestWindow;
  if (!best) return { status: "poor" as const, window: null };
  const immediate = outlook.windows.find(
    (w) => Date.parse(w.start) <= now.getTime() + 60000,
  );
  if (immediate && immediate.score >= best.score)
    return { status: "now" as const, window: immediate };
  return { status: "later" as const, window: best };
}
