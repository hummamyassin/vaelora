import type { Activity } from "../activity-area.ts";
import type { ComfortBand } from "./environment.ts";
import type { EnvironmentalScorer, Metric, Severity } from "./types.ts";

export const requiredWeatherMetrics = ["temperatureC", "apparentTemperatureC", "relativeHumidityPercent", "windKmh", "precipitationProbabilityPercent", "uvIndex"] as const;
export type RequiredWeatherMetric = typeof requiredWeatherMetrics[number];
export interface SixInputPolicy {
  id: string;
  activities: Record<Activity, Record<RequiredWeatherMetric, ComfortBand>>;
}

/** Product comfort categories, not probabilities or a health/safety assessment. */
export function createSixInputScorer(input: SixInputPolicy): EnvironmentalScorer {
  const policy = structuredClone(input);
  if (!policy.id.trim()) throw new Error("Scoring policy needs an id");
  for (const activity of ["running", "walking"] as const) {
    for (const metric of requiredWeatherMetrics) {
      const { preferred: [lo, hi], acceptable: [outerLo, outerHi] } = policy.activities[activity][metric];
      if (![lo, hi, outerLo, outerHi].every(Number.isFinite) || outerLo > lo || lo > hi || hi > outerHi) {
        throw new Error(`Invalid comfort band: ${activity}/${metric}`);
      }
    }
  }
  return {
    id: policy.id,
    evaluate(activity, hour, limits) {
      const missing: Metric[] = requiredWeatherMetrics.filter((metric) => typeof hour[metric] !== "number" || !Number.isFinite(hour[metric]));
      const reasons = missing.map((metric) => `missing-${metric}`);
      if (typeof hour.usAqi !== "number" || !Number.isFinite(hour.usAqi)) missing.push("usAqi");
      for (const [metric, limit] of [["temperatureC", limits?.maxTemperatureC], ["apparentTemperatureC", limits?.maxApparentTemperatureC], ["windKmh", limits?.maxWindKmh]] as const) {
        if (limit === undefined) continue;
        if (!Number.isFinite(limit) || (metric === "windKmh" && limit < 0)) throw new Error(`Invalid limit: ${metric}`);
        if (typeof hour[metric] !== "number" || !Number.isFinite(hour[metric])) reasons.push(`cannot-check-${metric}-limit`);
        else if (hour[metric] > limit) reasons.push(`exceeds-${metric}-limit`);
      }
      for (const metric of ["relativeHumidityPercent", "windKmh", "precipitationProbabilityPercent", "uvIndex"] as const) {
        const value = hour[metric];
        if (typeof value === "number" && (value < 0 || ((metric === "relativeHumidityPercent" || metric === "precipitationProbabilityPercent") && value > 100))) reasons.push(`invalid-${metric}`);
      }
      if (reasons.length) return { severity: null, eligible: false, reasons, missing };
      let severity: Severity = 0;
      for (const metric of requiredWeatherMetrics) {
        const value = hour[metric] as number;
        const band = policy.activities[activity][metric];
        const category: Severity = value >= band.preferred[0] && value <= band.preferred[1] ? 0
          : value >= band.acceptable[0] && value <= band.acceptable[1] ? 1 : 2;
        severity = Math.max(severity, category) as Severity;
        if (category > 0) reasons.push(`${metric}-category-${category}`);
      }
      return { severity, eligible: true, reasons, missing };
    },
  };
}
