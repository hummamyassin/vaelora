import { weatherAreas } from "../../data/weather-areas.ts";
import { activityOutlook } from "../../domain/recommendation/score.ts";
import {
  createOpenMeteoAdapter,
  forecastDates,
  type WeatherProvider,
} from "../weather/open-meteo.ts";
import { v1WeatherPolicy } from "./policy.ts";
import { InvalidRecommendationRequest } from "./request.ts";
import {
  BodyError,
  checkJsonRequest,
  createRequestBudget,
  privateHeaders,
  publicError,
  readJson,
} from "../http-security.ts";
export interface PlanningRequest {
  mode: "compare" | "outlook" | "map";
  areaIds: string[];
  minutes: 30 | 60 | 90;
}
export function parsePlanningRequest(value: unknown): PlanningRequest {
  const x = value as PlanningRequest;
  if (
    !x ||
    typeof x !== "object" ||
    Array.isArray(x) ||
    Object.keys(x).some((k) => !["mode", "areaIds", "minutes"].includes(k)) ||
    !["compare", "outlook", "map"].includes(x.mode) ||
    ![30, 60, 90].includes(x.minutes) ||
    !Array.isArray(x.areaIds) ||
    new Set(x.areaIds).size !== x.areaIds.length ||
    x.areaIds.some((id) => !weatherAreas.some((a) => a.id === id)) ||
    x.areaIds.length < (x.mode === "compare" ? 2 : 1) ||
    x.areaIds.length > (x.mode === "outlook" ? 1 : x.mode === "compare" ? 3 : 9)
  )
    throw new InvalidRecommendationRequest("Invalid planning request");
  return structuredClone(x);
}
export function createPlanningPipeline(
  options: { provider?: WeatherProvider; clock?: () => Date } = {},
) {
  const provider = options.provider ?? createOpenMeteoAdapter({ days: 3 });
  return async (value: unknown) => {
    const request = parsePlanningRequest(value),
      now = (options.clock ?? (() => new Date()))(),
      today = forecastDates(now).today;
    const rows = [];
    let cursor = 0;
    const fetchArea = async (areaId: string) => {
      const area = weatherAreas.find((a) => a.id === areaId)!,
        forecast = await provider.getForecast(area, now);
      const days = Array.from(
        { length: request.mode === "outlook" ? 3 : 1 },
        (_, i) => {
          const date = new Date(Date.parse(`${today}T00:00:00Z`) + i * 86400000)
            .toISOString()
            .slice(0, 10);
          const summarize = (activity: "walking" | "running") => {
            const outlook = activityOutlook(
              activity,
              forecast.ok ? forecast.hourly : [],
              date,
              request.minutes,
              now,
              v1WeatherPolicy,
            );
            const hour =
              i === 0
                ? outlook.current
                : outlook.hours.find(
                    (h) =>
                      outlook.bestWindow &&
                      Date.parse(`${h.time}:00+03:00`) <=
                        Date.parse(outlook.bestWindow.start) &&
                      Date.parse(`${h.time}:00+03:00`) + 3600000 >
                        Date.parse(outlook.bestWindow.start),
                  );
            return {
              score:
                i === 0
                  ? (outlook.current?.score ?? null)
                  : (outlook.bestWindow?.score ?? null),
              bestWindow: outlook.bestWindow,
              temperatureC: hour?.conditions.temperatureC ?? null,
              windKmh: hour?.conditions.windKmh ?? null,
              precipitationPercent:
                hour?.conditions.precipitationProbabilityPercent ?? null,
            };
          };
          return {
            date,
            walking: summarize("walking"),
            running: summarize("running"),
          };
        },
      );
      return { area, available: forecast.ok, days };
    };
    const results: Awaited<ReturnType<typeof fetchArea>>[] = new Array(
      request.areaIds.length,
    );
    await Promise.all(
      Array.from({ length: Math.min(3, request.areaIds.length) }, async () => {
        while (cursor < request.areaIds.length) {
          const index = cursor++;
          results[index] = await fetchArea(request.areaIds[index]);
        }
      }),
    );
    rows.push(...results);
    return { evaluatedAt: now.toISOString(), minutes: request.minutes, rows };
  };
}
export type PlanningResponse = Awaited<
  ReturnType<ReturnType<typeof createPlanningPipeline>>
>;
export function createPlanningHandler(
  run: ReturnType<typeof createPlanningPipeline>,
) {
  const budget = createRequestBudget({
    perMinute: 90,
    perClient: 20,
    concurrent: 4,
  });
  return async (request: Request) => {
    const rejected = checkJsonRequest(request);
    if (rejected) return rejected;
    const release = budget(request);
    if (release instanceof Response) return release;
    try {
      return Response.json(await run(await readJson(request)), {
        headers: privateHeaders,
      });
    } catch (e) {
      return e instanceof BodyError
        ? publicError(e.message, e.status)
        : publicError(
            e instanceof InvalidRecommendationRequest
              ? "Invalid planning request"
              : "Planning unavailable",
            e instanceof InvalidRecommendationRequest ? 400 : 503,
          );
    } finally {
      release();
    }
  };
}
