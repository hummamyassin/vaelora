import type { Activity } from "../activity-area.ts";
import type {
  HourlyConditions,
  RecommendationRequest,
  Severity,
} from "./types.ts";
import {
  createSixInputScorer,
  requiredWeatherMetrics,
  type SixInputPolicy,
} from "./v1-environment.ts";

export const scoreBands = [
  { min: 90, en: "Excellent", ar: "ممتاز" },
  { min: 80, en: "Very good", ar: "جيد جدًا" },
  { min: 70, en: "Good", ar: "جيد" },
  { min: 60, en: "Fair", ar: "مقبول" },
  { min: 40, en: "Less favorable", ar: "أقل ملاءمة" },
  { min: 0, en: "Unfavorable", ar: "غير ملائم" },
] as const;
export const scoreBand = (score: number) =>
  scoreBands.find((b) => score >= b.min) ?? scoreBands[5];
/** Monotonic display of the proven ordinal policy. No fabricated precision within ties. */
export function conditionScore(severity: Severity) {
  return [90, 65, 30][severity];
}
/** Suitable fit always outranks limited fit, matching the original lexicographic engine. */
export function placeScore(fit: "suitable" | "limited", severity: Severity) {
  return fit === "suitable" ? [90, 80, 70][severity] : [60, 50, 30][severity];
}
export function scoreHour(
  activity: Activity,
  hour: HourlyConditions,
  policy: SixInputPolicy,
  limits?: RecommendationRequest["weatherLimits"],
) {
  const assessment = createSixInputScorer(policy).evaluate(
    activity,
    hour,
    limits,
  );
  const factors = requiredWeatherMetrics.map((metric) => {
    const value = hour[metric],
      band = policy.activities[activity][metric];
    const severity =
      typeof value !== "number" || !Number.isFinite(value)
        ? null
        : value >= band.preferred[0] && value <= band.preferred[1]
          ? 0
          : value >= band.acceptable[0] && value <= band.acceptable[1]
            ? 1
            : 2;
    return { metric, value: value ?? null, severity };
  });
  return {
    time: hour.time,
    conditions: hour,
    score:
      assessment.severity === null ? null : conditionScore(assessment.severity),
    ...assessment,
    factors,
  };
}
export type ScoredHour = ReturnType<typeof scoreHour>;
/** Exact outing duration, conservative worst covered hourly interval; no minute-level weather interpolation. */
export function activityOutlook(
  activity: Activity,
  hourly: readonly HourlyConditions[],
  date: string,
  minutes: number,
  now: Date,
  policy: SixInputPolicy,
  limits?: RecommendationRequest["weatherLimits"],
) {
  if (![30, 60, 90].includes(minutes) || !Number.isFinite(now.getTime()))
    throw new Error("Invalid outlook request");
  const startOfDay = Date.parse(`${date}T00:00:00+03:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(startOfDay) ||
    new Date(startOfDay + 10800000).toISOString().slice(0, 10) !== date
  )
    throw new Error("Invalid outlook date");
  for (const h of hourly)
    if (
      !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00$/.test(h.time) ||
      !Number.isFinite(Date.parse(`${h.time}:00+03:00`))
    )
      throw new Error("Invalid forecast timestamp");
  const hours = hourly
    .filter(
      (h) =>
        h.time.startsWith(date) &&
        Date.parse(`${h.time}:00+03:00`) + 3600000 > now.getTime(),
    )
    .map((h) => scoreHour(activity, h, policy, limits))
    .sort((a, b) => a.time.localeCompare(b.time));
  if (new Set(hours.map((h) => h.time)).size !== hours.length)
    throw new Error("Duplicate hours");
  const windows = hours.flatMap((h) => {
    const forecastStart = Date.parse(`${h.time}:00+03:00`);
    const start = Math.max(
      forecastStart,
      Math.ceil(now.getTime() / 60000) * 60000,
    );
    if (start >= forecastStart + 3600000) return [];
    const end = start + minutes * 60000;
    if (end > startOfDay + 86400000) return [];
    const covered: ScoredHour[] = [];
    for (let cursor = forecastStart; cursor < end; cursor += 3600000) {
      const hour = hours.find(
        (item) => Date.parse(`${item.time}:00+03:00`) === cursor,
      );
      if (
        !hour ||
        !hour.eligible ||
        hour.severity === null ||
        hour.severity > 1
      )
        return [];
      covered.push(hour);
    }
    return [
      {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        score: Math.min(...covered.map((h) => h.score!)),
        severity: Math.max(...covered.map((h) => h.severity!)) as Severity,
      },
    ];
  });
  windows.sort((a, b) => b.score - a.score || a.start.localeCompare(b.start));
  return {
    activity,
    hours,
    current:
      hours.find((h) => Date.parse(`${h.time}:00+03:00`) <= now.getTime()) ??
      null,
    bestWindow: windows[0] ?? null,
    windows,
  };
}
