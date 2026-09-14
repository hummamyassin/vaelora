import type { Intent } from "./intent.ts";
import type {
  createDashboardPipeline,
  DashboardRequest,
} from "../recommendations/dashboard.ts";
import {
  activityOutlook,
  placeScore,
} from "../../domain/recommendation/score.ts";
import { activityAreas } from "../../data/activity-areas.ts";
import { bandMatches } from "../../domain/recommendation/recommend.ts";
import type { Match } from "../../domain/recommendation/types.ts";
import { areaName } from "../../lib/i18n.ts";
import { v1WeatherPolicy } from "../recommendations/policy.ts";
import type { Locale } from "../../lib/i18n.ts";

/** Same agent, new grounded tool branch. Only deterministic templates are visible. */
export async function answerWeather(
  intent: Intent,
  run: ReturnType<typeof createDashboardPipeline>,
  now: Date,
  locale: Locale,
  context?: DashboardRequest,
) {
  const ar = locale === "ar",
    text = (en: string, arabic: string) => (ar ? arabic : en);
  const minutes =
    intent.durationMinutes ??
    (intent.durationHours != null
      ? intent.durationHours * 60
      : (context?.minutes ?? 60));
  if (
    intent.issues.length ||
    ![30, 60, 90].includes(minutes) ||
    (intent.durationMinutes != null &&
      intent.durationHours != null &&
      intent.durationMinutes !== intent.durationHours * 60) ||
    (intent.terrain && intent.terrain !== "flat") ||
    (intent.surface && intent.surface !== "paved") ||
    (intent.environment && intent.environment !== "park") ||
    (intent.startHour ?? 0) >= (intent.endHour ?? 24) ||
    (intent.weatherQuery === "compare-areas" &&
      intent.weatherAreaIds?.length !== 2)
  ) {
    return {
      status: "clarification" as const,
      intent,
      issues: ["unsupported-constraint"] as Intent["issues"],
      text: text(
        "Please clarify the unsupported or conflicting constraints. No conditions or places were invented.",
        "يرجى توضيح القيود المتعارضة أو غير المدعومة. لم نختلق ظروفًا أو أماكن.",
      ),
      trace: [],
    };
  }
  const areas = intent.weatherAreaIds?.length
    ? intent.weatherAreaIds
    : [context?.areaId ?? "amman-central"];
  const days: Array<"today" | "tomorrow"> =
    intent.weatherQuery === "tonight-tomorrow-morning"
      ? ["today", "tomorrow"]
      : [intent.day ?? context?.day ?? "today"];
  const activities: Array<"walking" | "running"> =
    intent.weatherQuery === "compare-activities"
      ? ["walking", "running"]
      : [intent.activity ?? context?.activity ?? "walking"];
  const preferences = [
    ...(intent.terrain ? ["flat"] : []),
    ...(intent.surface ? ["paved"] : []),
    ...(intent.environment ? ["park"] : []),
    ...(intent.lowWind ? ["lowWind"] : []),
    ...(intent.avoidHeat ? ["avoidHeat"] : []),
  ];
  const statements: string[] = [],
    results = [];
  for (const areaId of areas)
    for (const day of days) {
      const data = await run({
        areaId,
        activity: activities[0],
        day,
        minutes,
        preferences,
        ...(context?.placeIds && areaId === context.areaId
          ? { placeIds: context.placeIds }
          : {}),
      });
      for (const activity of activities) {
        const policy = v1WeatherPolicy.activities[activity];
        const limits = {
          maxTemperatureC: Math.min(
            intent.maxTemperatureC ?? Infinity,
            intent.avoidHeat ? policy.temperatureC.preferred[1] : Infinity,
          ),
          maxApparentTemperatureC: Math.min(
            intent.maxApparentTemperatureC ?? Infinity,
            intent.avoidHeat
              ? policy.apparentTemperatureC.preferred[1]
              : Infinity,
          ),
          maxWindKmh: Math.min(
            intent.maxWindKmh ?? Infinity,
            intent.lowWind ? policy.windKmh.preferred[1] : Infinity,
          ),
        };
        const finiteLimits = Object.fromEntries(
          Object.entries(limits).filter(([, v]) => Number.isFinite(v)),
        );
        const start =
            intent.weatherQuery === "tonight-tomorrow-morning"
              ? day === "today"
                ? 18
                : 6
              : (intent.startHour ?? 0),
          end =
            intent.weatherQuery === "tonight-tomorrow-morning"
              ? day === "today"
                ? 24
                : 12
              : (intent.endHour ?? 24);
        const hours = data.forecast.ok
          ? data.forecast.hourly.filter(
              (h) =>
                Number(h.time.slice(11, 13)) >= start &&
                Number(h.time.slice(11, 13)) < end,
            )
          : [];
        const outlook = activityOutlook(
            activity,
            hours,
            data.date,
            minutes,
            now,
            v1WeatherPolicy,
            finiteLimits,
          ),
          best = outlook.bestWindow;
        const clock = (s: string) =>
          new Intl.DateTimeFormat(ar ? "ar-JO" : "en-GB", {
            timeZone: "Asia/Amman",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(new Date(s));
        statements.push(
          `${data.area.name[locale]} · ${day === "today" ? text("Today", "اليوم") : text("Tomorrow", "غدًا")} · ${activity === "walking" ? text("Walking", "المشي") : text("Running", "الجري")}: ${best ? `${best.score}/100 · ${clock(best.start)}–${clock(best.end)} · ${minutes} ${text("minutes", "دقيقة")}` : text("No suitable complete forecast window.", "لا تتوفر فترة توقعات مكتملة وملائمة.")}`,
        );
        results.push({ areaId, day, activity, bestWindow: best });
        if (!data.forecast.ok)
          statements.push(
            text(
              "Area forecast unavailable; no area score can be calculated.",
              "توقعات المنطقة غير متاحة؛ لا يمكن حساب مؤشرها.",
            ),
          );
        // Apply explicit numeric and time constraints again to the authoritative place forecasts.
        if (activities.length === 1) {
          const candidates: Match[] = [];
          for (const weather of data.weather) {
            if (!weather.result.ok) continue;
            const place = activityAreas.find((a) => a.id === weather.areaId)!;
            const fit = place.suitability[activity];
            if (fit !== "suitable" && fit !== "limited") continue;
            const placeOutlook = activityOutlook(
              activity,
              weather.result.hourly.filter(
                (h) =>
                  Number(h.time.slice(11, 13)) >= start &&
                  Number(h.time.slice(11, 13)) < end,
              ),
              data.date,
              minutes,
              now,
              v1WeatherPolicy,
              finiteLimits,
            );
            const w = placeOutlook.bestWindow;
            if (!w) continue;
            candidates.push({
              area: place,
              fit,
              weatherSeverity: w.severity,
              bestWindows: [
                {
                  start: w.start,
                  end: w.end,
                  severity: w.severity,
                  missingOptional: ["usAqi"],
                },
              ],
            });
          }
          const top = bandMatches(candidates, 1)[0] ?? [];
          if (top.length)
            statements.push(
              text("Reviewed top places: ", "أفضل الأماكن المدروسة: ") +
                top
                  .map(
                    (m) =>
                      `${areaName(locale, m.area)} · ${placeScore(m.fit, m.weatherSeverity)}/100 · ${clock(m.bestWindows[0].start)}–${clock(m.bestWindows[0].end)}`,
                  )
                  .join("; "),
            );
          else if (data.coverageCount)
            statements.push(
              text(
                "No reviewed place has a complete matching window under these constraints.",
                "لا يتوفر مكان مدروس بفترة مكتملة تطابق هذه القيود.",
              ),
            );
        }
      }
      if (!data.coverageCount)
        statements.push(
          text(
            "No reviewed activity places in this search area. Area forecasts do not establish route suitability.",
            "لا تتوفر أماكن نشاط مدروسة في نطاق البحث. توقعات المنطقة لا تثبت ملاءمة المسارات.",
          ),
        );
    }
  statements.push(
    text(
      "Hourly forecast comfort policy; not route safety. No route, access or surface is inferred from a weather area.",
      "مؤشر راحة مبني على توقعات ساعية، وليس تقييم سلامة. لا نستنتج مسارًا أو إمكانية دخول أو طبيعة سطح من منطقة الطقس.",
    ),
  );
  if (!intent.weatherAreaIds?.length && !context)
    statements.unshift(
      text(
        "Using Central Amman by default.",
        "تُستخدم منطقة وسط عمّان افتراضيًا.",
      ),
    );
  return {
    status: "conditions" as const,
    text: statements.join("\n\n"),
    weatherResults: results,
    trace: [
      { action: "activity-detected" },
      { action: "constraints-extracted" },
      { action: "weather-retrieved" },
      { action: "suitability-calculated" },
      { action: "best-time-evaluated" },
    ],
  };
}
