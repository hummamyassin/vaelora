import { parseRecommendationRequest } from "../recommendations/request.ts";
import { forecastDates } from "../weather/open-meteo.ts";
import { v1WeatherPolicy } from "../recommendations/policy.ts";

export const issueCodes = ["missing-activity", "ambiguous", "contradictory", "unsupported-activity", "unsupported-date", "unsupported-constraint", "route-distance", "fractional-time"] as const;
const choice = (values: readonly string[]) => ({ type: ["string", "null"], enum: [...values, null] });
const number = { type: ["number", "null"] };
export const intentProperties = {
  activity: choice(["running", "walking"]), day: choice(["today", "tomorrow"]),
  startHour: number, endHour: number, durationHours: number,
  terrain: choice(["flat", "rolling", "hilly"]), surface: choice(["paved", "track", "gravel", "dirt"]),
  environment: choice(["park", "urban", "woodland", "open-space"]),
  lowWind: { type: "boolean" }, avoidHeat: { type: "boolean" },
  maxWindKmh: number, maxTemperatureC: number, maxApparentTemperatureC: number,
  issues: { type: "array", items: { type: "string", enum: issueCodes }, maxItems: 8 },
};
export const intentSchema = { type: "object", properties: intentProperties, required: Object.keys(intentProperties), additionalProperties: false };
export interface Intent {
  activity: "running" | "walking" | null; day: "today" | "tomorrow" | null;
  startHour: number | null; endHour: number | null; durationHours: number | null;
  terrain: "flat" | "rolling" | "hilly" | null;
  surface: "paved" | "track" | "gravel" | "dirt" | null;
  environment: "park" | "urban" | "woodland" | "open-space" | null;
  lowWind: boolean; avoidHeat: boolean;
  maxWindKmh: number | null; maxTemperatureC: number | null; maxApparentTemperatureC: number | null;
  issues: (typeof issueCodes)[number][];
}
export const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function parseIntent(value: unknown): Intent {
  if (!isObject(value) || Object.keys(value).length !== Object.keys(intentProperties).length || Object.keys(value).some(k => !Object.hasOwn(intentProperties, k))) throw new Error("Invalid intent fields");
  for (const [key, schema] of Object.entries(intentProperties)) {
    const v = value[key];
    if ("enum" in schema) { if (!(schema.enum as readonly unknown[]).includes(v)) throw new Error(`Invalid ${key}`); }
    else if (key === "issues") {
      if (!Array.isArray(v) || v.length > 8 || v.some(x => !issueCodes.includes(x))) throw new Error("Invalid issues");
    } else if (schema.type === "boolean") { if (typeof v !== "boolean") throw new Error(`Invalid ${key}`); }
    else if (v !== null && (typeof v !== "number" || !Number.isFinite(v))) throw new Error(`Invalid ${key}`);
  }
  for (const key of ["startHour", "endHour", "durationHours"] as const) {
    const v = value[key];
    if (v !== null && (!Number.isInteger(v) || (v as number) < (key === "startHour" ? 0 : 1) || (v as number) > (key === "startHour" ? 23 : 24))) throw new Error(`Invalid ${key}`);
  }
  if (typeof value.maxWindKmh === "number" && value.maxWindKmh < 0) throw new Error("Invalid wind limit");
  return structuredClone(value) as unknown as Intent;
}

export function resolveIntent(intent: Intent, now: Date) {
  const issues = [...intent.issues];
  if (!intent.activity) issues.push("missing-activity");
  if (!intent.day) issues.push("ambiguous");
  if (issues.length) return { kind: "clarification" as const, issues: [...new Set(issues)] };
  const assumptions: string[] = [];
  const startHour = intent.startHour ?? 6, endHour = intent.endHour ?? 22, durationHours = intent.durationHours ?? 1;
  if (intent.startHour === null) assumptions.push("Search starts at 06:00 Amman time by default.");
  if (intent.endHour === null) assumptions.push("Search ends at 22:00 Amman time by default.");
  if (intent.durationHours === null) assumptions.push("Using one-hour forecast windows; this is not a route-duration guarantee.");
  if (startHour >= endHour || durationHours > endHour - startHour) return { kind: "clarification" as const, issues: ["contradictory" as const] };
  const policy = v1WeatherPolicy.activities[intent.activity!];
  const limits: Record<string, number> = {};
  if (intent.lowWind) { limits.maxWindKmh = policy.windKmh.preferred[1]; assumptions.push(`Low wind means at most ${limits.maxWindKmh} km/h under the provisional activity policy.`); }
  if (intent.avoidHeat) {
    limits.maxTemperatureC = policy.temperatureC.preferred[1]; limits.maxApparentTemperatureC = policy.apparentTemperatureC.preferred[1];
    assumptions.push(`Heat avoidance caps temperature at ${limits.maxTemperatureC} °C and apparent temperature at ${limits.maxApparentTemperatureC} °C under the provisional policy.`);
  }
  for (const key of ["maxWindKmh", "maxTemperatureC", "maxApparentTemperatureC"] as const) if (intent[key] !== null) limits[key] = Math.min(limits[key] ?? Infinity, intent[key]);
  const request = parseRecommendationRequest({ activity: intent.activity, date: forecastDates(now)[intent.day!], startHour, endHour, durationHours,
    ...(intent.terrain ? { terrain: intent.terrain } : {}), ...(intent.surface ? { surface: intent.surface } : {}),
    ...(intent.environment ? { environment: intent.environment } : {}), ...(Object.keys(limits).length ? { weatherLimits: limits } : {}),
  }, now);
  return { kind: "ready" as const, request, assumptions };
}
