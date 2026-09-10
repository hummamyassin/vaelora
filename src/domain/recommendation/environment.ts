import type { Activity } from "../activity-area.ts";
import type { EnvironmentalScorer, Metric, Severity } from "./types.ts";

export interface ComfortBand {
  preferred: readonly [number, number];
  acceptable: readonly [number, number];
}
/** All values are caller-supplied; there is deliberately no production default. */
export interface EnvironmentalPolicy {
  id: string;
  activities: Readonly<Record<Activity, {
    temperatureC: ComfortBand;
    windKmh: ComfortBand;
  }>>;
}

const optionalMetrics: readonly Metric[] = ["apparentTemperatureC", "relativeHumidityPercent", "precipitationProbabilityPercent", "uvIndex", "usAqi"];
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function validateBand(band: ComfortBand) {
  const [lo, hi] = band.preferred;
  const [outerLo, outerHi] = band.acceptable;
  if (![lo, hi, outerLo, outerHi].every(finite) || outerLo > lo || lo > hi || hi > outerHi) {
    throw new Error("Preferred interval must be finite and nested in acceptable interval");
  }
}
function category(value: number, band: ComfortBand): Severity {
  if (value >= band.preferred[0] && value <= band.preferred[1]) return 0;
  if (value >= band.acceptable[0] && value <= band.acceptable[1]) return 1;
  return 2;
}

/** Small baseline strategy: worst of temperature/wind categories, without weights.
 * Optional observations are returned as context and never added as implicit bonuses.
 */
export function createEnvironmentalScorer(input: EnvironmentalPolicy): EnvironmentalScorer {
  // Capture configuration so later caller mutation cannot change a scorer's behavior.
  const policy = structuredClone(input);
  if (!policy.id.trim()) throw new Error("Scoring policy needs an id");
  for (const activity of ["running", "walking"] as const) {
    validateBand(policy.activities[activity].temperatureC);
    validateBand(policy.activities[activity].windKmh);
    if (policy.activities[activity].windKmh.acceptable[0] < 0) throw new Error("Wind thresholds cannot be negative");
  }
  return {
    id: policy.id,
    evaluate(activity, hour, limits) {
      const missing: Metric[] = optionalMetrics.filter((metric) => !finite(hour[metric]));
      const reasons: string[] = [];
      if (!finite(hour.temperatureC)) { missing.push("temperatureC"); reasons.push("missing-temperatureC"); }
      if (!finite(hour.windKmh)) { missing.push("windKmh"); reasons.push("missing-windKmh"); }
      else if (hour.windKmh < 0) reasons.push("invalid-windKmh");
      const checks = [
        ["temperatureC", limits?.maxTemperatureC],
        ["apparentTemperatureC", limits?.maxApparentTemperatureC],
        ["windKmh", limits?.maxWindKmh],
      ] as const;
      for (const [metric, limit] of checks) {
        if (limit === undefined) continue;
        if (!finite(limit) || (metric === "windKmh" && limit < 0)) throw new Error(`Invalid limit: ${metric}`);
        const value = hour[metric];
        if (!finite(value)) reasons.push(`cannot-check-${metric}-limit`);
        else if (value > limit) reasons.push(`exceeds-${metric}-limit`);
      }
      if (reasons.length) return { severity: null, eligible: false, reasons, missing };
      const config = policy.activities[activity];
      // Narrowing is explicit; missing readings have already returned above.
      if (!finite(hour.temperatureC) || !finite(hour.windKmh)) throw new Error("Unreachable missing required input");
      const severity = Math.max(category(hour.temperatureC, config.temperatureC), category(hour.windKmh, config.windKmh)) as Severity;
      return { severity, eligible: true, reasons: [`environment-category-${severity}`], missing };
    },
  };
}
