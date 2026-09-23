import { activityAreas } from "../../data/activity-areas.ts";
import { parseCell } from "../../lib/dynamic-location.ts";
import { distanceKm } from "../../lib/geography.ts";
import { filterEligibleAreas } from "../../domain/recommendation/eligibility.ts";
import {
  activityOutlook,
  placeScore,
} from "../../domain/recommendation/score.ts";
import { dailyPlan } from "../../domain/recommendation/daily-plan.ts";
import { rankNearby } from "../../domain/recommendation/nearby.ts";
import {
  createOpenMeteoAdapter,
  forecastDates,
  type WeatherProvider,
} from "../weather/open-meteo.ts";
import { dashboardPreferences, preferenceLimits } from "./dashboard.ts";
import { v1WeatherPolicy } from "./policy.ts";
import { InvalidRecommendationRequest } from "./request.ts";

export function parseDiscovery(input: unknown) {
  const x = input as Record<string, unknown>;
  if (
    !x ||
    typeof x !== "object" ||
    Array.isArray(x) ||
    Object.keys(x).some(
      (k) =>
        !["cellId", "activity", "minutes", "radius", "preferences"].includes(k),
    ) ||
    !["walking", "running"].includes(x.activity as string) ||
    ![30, 60, 90].includes(x.minutes as number) ||
    ![3, 5, 10].includes(x.radius as number) ||
    !Array.isArray(x.preferences) ||
    x.preferences.length > 5 ||
    x.preferences.some((p) => !dashboardPreferences.includes(p))
  )
    throw new InvalidRecommendationRequest("Invalid discovery request");
  let context;
  try {
    context = parseCell(x.cellId);
  } catch {
    throw new InvalidRecommendationRequest("Unsupported location");
  }
  return {
    context,
    activity: x.activity as "walking" | "running",
    minutes: x.minutes as number,
    radius: x.radius as number,
    preferences: x.preferences as string[],
  };
}
export function createDiscovery(
  options: { provider?: WeatherProvider; clock?: () => Date } = {},
) {
  const provider = options.provider ?? createOpenMeteoAdapter();
  return async (input: unknown) => {
    const request = parseDiscovery(input),
      now = (options.clock ?? (() => new Date()))(),
      date = forecastDates(now).today;
    const { activity, minutes, preferences, context, radius } = request;
    const evaluate = async (point: { latitude: number; longitude: number }) => {
      const result = await provider.getForecast(point, now);
      return activityOutlook(
        activity,
        result.ok ? result.hourly : [],
        date,
        minutes,
        now,
        v1WeatherPolicy,
        preferenceLimits(activity, preferences),
      );
    };
    const outlook = await evaluate(context);
    const eligible = filterEligibleAreas(activityAreas, {
      activity,
      date,
      startHour: 0,
      endHour: 24,
      durationHours: Math.ceil(minutes / 60),
      ...(preferences.includes("flat") ? { terrain: "flat" as const } : {}),
      ...(preferences.includes("paved") ? { surface: "paved" as const } : {}),
      ...(preferences.includes("park") ? { environment: "park" as const } : {}),
    }).eligible;
    // 1.6 km margin admits candidates close to the cell boundary. Exact radius is applied locally.
    const candidates = eligible.filter(
      (a) => distanceKm(context, a) <= radius + 1.6,
    );
    const rows = [];
    for (let i = 0; i < candidates.length; i += 3)
      rows.push(
        ...(await Promise.all(
          candidates.slice(i, i + 3).map(async (area) => {
            const conditions = await evaluate(area),
              plan = dailyPlan(conditions, now),
              fit = area.suitability[activity] as "suitable" | "limited";
            return {
              area,
              distanceKm: distanceKm(context, area),
              conditions,
              plan,
              fit,
              score: plan.window ? placeScore(fit, plan.window.severity) : null,
            };
          }),
        )),
      );
    return {
      request,
      evaluatedAt: now.toISOString(),
      outlook,
      plan: dailyPlan(outlook, now),
      places: rankNearby(rows, context),
      status: outlook.hours.some((h) => h.score !== null)
        ? "complete"
        : "weather-unavailable",
    };
  };
}
export type DiscoveryResponse = Awaited<
  ReturnType<ReturnType<typeof createDiscovery>>
>;
