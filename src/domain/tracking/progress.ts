import { metrics, type RecordedActivity } from "./activity.ts";
const dayMs = 86400000;
function localDay(ms: number) {
  return Math.floor((ms + 10800000) / dayMs);
}
/** Monday weeks in Asia/Amman. Totals include elapsed time even when GPS was unavailable. */
export function personalProgress(
  activities: readonly RecordedActivity[],
  now = new Date(),
) {
  const day = localDay(now.getTime()),
    weekday = new Date(day * dayMs).getUTCDay(),
    start = day - ((weekday + 6) % 7);
  const completed = activities.filter(
    (a) => a.state === "finished" && a.startedAt <= now.getTime(),
  );
  const totals = (rows: readonly RecordedActivity[]) => ({
    count: rows.length,
    distanceM: rows.reduce((s, a) => s + a.distanceM, 0),
    activeMs: rows.reduce((s, a) => s + a.activeMs, 0),
  });
  const week = completed.filter((a) => localDay(a.startedAt) >= start),
    previous = completed.filter(
      (a) =>
        localDay(a.startedAt) >= start - 7 && localDay(a.startedAt) < start,
    );
  const month = new Date(now.getTime() + 10800000).toISOString().slice(0, 7);
  const sport = (kind: "walking" | "running") => {
    const rows = week.filter((a) => a.activity === kind),
      valid = rows.filter(
        (a) => a.distanceM >= 50 && a.activeMs > 0 && a.points.length >= 2,
      );
    const longest =
      completed
        .filter(
          (a) =>
            a.activity === kind &&
            a.distanceM >= 50 &&
            a.points.length >= 2 &&
            new Date(a.startedAt + 10800000).toISOString().slice(0, 7) ===
              month,
        )
        .sort(
          (a, b) => b.distanceM - a.distanceM || a.startedAt - b.startedAt,
        )[0] ?? null;
    return {
      ...totals(rows),
      paceSeconds: metrics(totals(valid)).averagePaceSeconds,
      longest,
    };
  };
  return {
    week: totals(week),
    previous: previous.length && week.length ? totals(previous) : null,
    walking: sport("walking"),
    running: sport("running"),
    recent: [...completed].sort((a, b) => b.startedAt - a.startedAt)[0] ?? null,
  };
}
