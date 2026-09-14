import { weatherAreas } from "../../data/weather-areas.ts";
import { activityAreas } from "../../data/activity-areas.ts";
import { distanceKm } from "../../lib/geography.ts";
import { filterEligibleAreas } from "../../domain/recommendation/eligibility.ts";
import {
  activityOutlook,
  placeScore,
} from "../../domain/recommendation/score.ts";
import { bandMatches } from "../../domain/recommendation/recommend.ts";
import type {
  Match,
  RecommendationRequest,
} from "../../domain/recommendation/types.ts";
import {
  createOpenMeteoAdapter,
  forecastDates,
  type WeatherProvider,
} from "../weather/open-meteo.ts";
import { v1WeatherPolicy } from "./policy.ts";
import { InvalidRecommendationRequest } from "./request.ts";

export const dashboardPreferences = [
  "flat",
  "paved",
  "park",
  "avoidHeat",
  "lowWind",
] as const;
export function preferenceLimits(
  activity: "walking" | "running",
  preferences: readonly string[],
) {
  const policy = v1WeatherPolicy.activities[activity];
  return {
    ...(preferences.includes("avoidHeat")
      ? {
          maxTemperatureC: policy.temperatureC.preferred[1],
          maxApparentTemperatureC: policy.apparentTemperatureC.preferred[1],
        }
      : {}),
    ...(preferences.includes("lowWind")
      ? { maxWindKmh: policy.windKmh.preferred[1] }
      : {}),
  };
}
export interface DashboardRequest {
  areaId: string;
  activity: "walking" | "running";
  day: "today" | "tomorrow";
  minutes: number;
  preferences: string[];
  placeIds?: string[];
}
export function parseDashboardRequest(input: unknown): DashboardRequest {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new InvalidRecommendationRequest("Invalid dashboard request");
  const x = input as Record<string, unknown>;
  if (
    x.placeIds !== undefined &&
    (!Array.isArray(x.placeIds) ||
      x.placeIds.length > activityAreas.length ||
      new Set(x.placeIds).size !== x.placeIds.length ||
      x.placeIds.some(
        (id) =>
          !activityAreas.some(
            (a) => a.id === id && a.verificationStatus !== "unverified",
          ),
      ))
  )
    throw new InvalidRecommendationRequest("Invalid place selection");
  if (
    Object.keys(x).some(
      (k) =>
        ![
          "areaId",
          "activity",
          "day",
          "minutes",
          "preferences",
          "placeIds",
        ].includes(k),
    ) ||
    !weatherAreas.some((a) => a.id === x.areaId) ||
    !["walking", "running"].includes(x.activity as string) ||
    !["today", "tomorrow"].includes(x.day as string) ||
    ![30, 60, 90].includes(x.minutes as number) ||
    !Array.isArray(x.preferences) ||
    x.preferences.length > 5 ||
    new Set(x.preferences).size !== x.preferences.length ||
    x.preferences.some((p) => !dashboardPreferences.includes(p))
  )
    throw new InvalidRecommendationRequest("Invalid dashboard request");
  return structuredClone(x) as unknown as DashboardRequest;
}
export function createDashboardPipeline(
  options: { provider?: WeatherProvider; clock?: () => Date } = {},
) {
  const provider = options.provider ?? createOpenMeteoAdapter();
  return async (input: unknown) => {
    const request = parseDashboardRequest(input),
      now = (options.clock ?? (() => new Date()))();
    const area = weatherAreas.find((a) => a.id === request.areaId)!;
    const date = forecastDates(now)[request.day];
    const constraints: RecommendationRequest = {
      activity: request.activity,
      date,
      startHour: 0,
      endHour: 24,
      durationHours: Math.ceil(request.minutes / 60),
      ...(request.preferences.includes("flat") ? { terrain: "flat" } : {}),
      ...(request.preferences.includes("paved") ? { surface: "paved" } : {}),
      ...(request.preferences.includes("park") ? { environment: "park" } : {}),
      weatherLimits: {
        ...(request.preferences.includes("avoidHeat")
          ? {
              maxTemperatureC:
                v1WeatherPolicy.activities[request.activity].temperatureC
                  .preferred[1],
              maxApparentTemperatureC:
                v1WeatherPolicy.activities[request.activity]
                  .apparentTemperatureC.preferred[1],
            }
          : {}),
        ...(request.preferences.includes("lowWind")
          ? {
              maxWindKmh:
                v1WeatherPolicy.activities[request.activity].windKmh
                  .preferred[1],
            }
          : {}),
      },
    };
    // Radius is a transparent nearby search, never a claim of neighborhood membership.
    const nearby = activityAreas.filter((p) =>
      request.placeIds
        ? request.placeIds.includes(p.id)
        : distanceKm(area, p) <= 5,
    );
    const eligible = filterEligibleAreas(nearby, constraints).eligible;
    const forecast = await provider.getForecast(area, now);
    const walking = activityOutlook(
      "walking",
      forecast.ok ? forecast.hourly : [],
      date,
      request.minutes,
      now,
      v1WeatherPolicy,
      preferenceLimits("walking", request.preferences),
    );
    const running = activityOutlook(
      "running",
      forecast.ok ? forecast.hourly : [],
      date,
      request.minutes,
      now,
      v1WeatherPolicy,
      preferenceLimits("running", request.preferences),
    );
    const matches: Match[] = [];
    const weather: Array<{
      areaId: string;
      result: Awaited<ReturnType<WeatherProvider["getForecast"]>>;
    }> = [];
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(3, eligible.length) }, async () => {
        while (cursor < eligible.length) {
          const place = eligible[cursor++],
            result = await provider.getForecast(place, now);
          weather.push({ areaId: place.id, result });
          if (!result.ok) continue;
          const outlook = activityOutlook(
            request.activity,
            result.hourly,
            date,
            request.minutes,
            now,
            v1WeatherPolicy,
            constraints.weatherLimits,
          );
          if (!outlook.bestWindow) continue;
          const fit = place.suitability[request.activity];
          if (fit !== "suitable" && fit !== "limited") continue;
          const local = (iso: string) =>
            new Date(Date.parse(iso) + 10800000).toISOString().slice(0, 16);
          matches.push({
            area: place,
            fit,
            weatherSeverity: outlook.bestWindow.severity,
            bestWindows: outlook.windows
              .filter((w) => w.score === outlook.bestWindow!.score)
              .map((w) => ({
                start: local(w.start),
                end: local(w.end),
                severity: w.severity,
                missingOptional: ["usAqi"],
              })),
          });
        }
      }),
    );
    const bands = bandMatches(matches, 1);
    return {
      request,
      area,
      date,
      evaluatedAt: now.toISOString(),
      forecast,
      walking,
      running,
      coverageCount: nearby.length,
      eligibleCount: eligible.length,
      placeWeatherFailures: weather.filter((w) => !w.result.ok).length,
      status: forecast.ok
        ? ("complete" as const)
        : ("weather-unavailable" as const),
      topMatches: (bands[0] ?? []).map((m) => ({
        ...m,
        area: {
          ...m.area,
          verificationStatus: m.area.verificationStatus as
            "supported" | "verified",
        },
        score: placeScore(m.fit, m.weatherSeverity),
      })),
      weather,
      trace: [
        { action: "activity-detected", detail: request.activity },
        { action: "constraints-extracted" },
        { action: "eligible-locations-found", count: eligible.length },
        {
          action: "weather-retrieved",
          count:
            weather.filter((w) => w.result.ok).length + (forecast.ok ? 1 : 0),
        },
        { action: "suitability-calculated" },
        { action: "best-time-evaluated" },
        { action: "matches-returned", count: bands[0]?.length ?? 0 },
      ],
    };
  };
}
export type DashboardResponse = Awaited<
  ReturnType<ReturnType<typeof createDashboardPipeline>>
>;
