import { activityAreas } from "../../data/activity-areas.ts";
import type { ActivityArea } from "../../domain/activity-area.ts";
import { filterEligibleAreas } from "../../domain/recommendation/eligibility.ts";
import { recommend } from "../../domain/recommendation/recommend.ts";
import { createSixInputScorer } from "../../domain/recommendation/v1-environment.ts";
import type { HourlyConditions } from "../../domain/recommendation/types.ts";
import { createOpenMeteoAdapter, type ForecastResult, type WeatherProvider } from "../weather/open-meteo.ts";
import { parseRecommendationRequest } from "./request.ts";
import { v1WeatherPolicy, v1RecommendationPolicy } from "./policy.ts";

export function createRecommendationPipeline(options: { provider?: WeatherProvider; clock?: () => Date; areas?: readonly ActivityArea[] } = {}) {
  const provider = options.provider ?? createOpenMeteoAdapter();
  const clock = options.clock ?? (() => new Date());
  const areas = options.areas ?? activityAreas;
  const scorer = createSixInputScorer(v1WeatherPolicy);
  return async (input: unknown) => {
    const now = clock();
    const request = parseRecommendationRequest(input, now);
    const { eligible } = filterEligibleAreas(areas, request);
    const outcomes = new Map<string, ForecastResult>();
    let cursor = 0;
    // At most three provider calls at once for this bounded production cohort.
    await Promise.all(Array.from({ length: Math.min(3, eligible.length) }, async () => {
      while (cursor < eligible.length) {
        const area = eligible[cursor++];
        outcomes.set(area.id, await provider.getForecast(area, now));
      }
    }));
    const forecasts = new Map<string, readonly HourlyConditions[]>();
    for (const [id, result] of outcomes) if (result.ok) forecasts.set(id, result.hourly);
    const result = recommend(areas, request, forecasts, scorer, v1RecommendationPolicy, now);
    const weather = eligible.map(area => ({ areaId: area.id, result: outcomes.get(area.id)! }));
    const failures = weather.filter(w => !w.result.ok).length;
    const incomplete = weather.some(w => w.result.ok && w.result.issues.length > 0);
    const status = !eligible.length ? "no-eligible-areas" : failures === eligible.length ? "weather-unavailable" : failures || incomplete ? "partial" : "complete";
    return {
      status, evaluatedAt: now.toISOString(), timezone: "Asia/Amman" as const, request,
      policy: { id: scorer.id, provisional: true, ...structuredClone(v1RecommendationPolicy) },
      ...result, weather,
      warnings: ["Provisional comfort policy; not a safety assessment.", "Opening hours, live closures, route duration and accessibility are not verified by this pipeline; retain each area's access caveats.", "AQI is not assessed; nearby grid forecasts do not measure park microclimates."],
      trace: [
        { action: "activity-detected", detail: request.activity },
        { action: "constraints-extracted", detail: "Structured activity, date, hours and hard preferences validated" },
        { action: "eligible-locations-found", count: eligible.length },
        { action: "weather-retrieved", count: forecasts.size },
        { action: "suitability-calculated", detail: scorer.id },
        { action: "best-time-evaluated", count: result.bands.flat().length },
        { action: "matches-returned", count: result.topMatches.length },
      ],
    };
  };
}
export type RecommendationResponse = Awaited<ReturnType<ReturnType<typeof createRecommendationPipeline>>>;
