import type { RecommendationRequest } from "../../domain/recommendation/types.ts";
import { validateRequest } from "../../domain/recommendation/time-windows.ts";

export class InvalidRecommendationRequest extends Error {}
const object = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Reject unknown fields: clients cannot supply coordinates, forecasts or policy. */
export function parseRecommendationRequest(input: unknown, now: Date): RecommendationRequest {
  if (!object(input)) throw new InvalidRecommendationRequest("Expected a structured request object");
  const keys = ["activity", "date", "startHour", "endHour", "durationHours", "terrain", "surface", "environment", "weatherLimits"];
  if (Object.keys(input).some(k => !keys.includes(k))) throw new InvalidRecommendationRequest("Unknown request field");
  for (const [key, values] of [["terrain", ["flat", "rolling", "hilly"]], ["surface", ["paved", "track", "gravel", "dirt"]], ["environment", ["park", "urban", "woodland", "open-space"]]] as const) {
    if (input[key] !== undefined && !values.some(v => v === input[key])) throw new InvalidRecommendationRequest(`Invalid ${key}`);
  }
  if (input.weatherLimits !== undefined) {
    if (!object(input.weatherLimits) || Object.entries(input.weatherLimits).some(([key, value]) =>
      !["maxTemperatureC", "maxApparentTemperatureC", "maxWindKmh"].includes(key) || typeof value !== "number" || !Number.isFinite(value))) throw new InvalidRecommendationRequest("Invalid weather limits");
  }
  const request = structuredClone(input) as unknown as RecommendationRequest;
  try { validateRequest(request, now); } catch (error) { throw new InvalidRecommendationRequest(error instanceof Error ? error.message : "Invalid request"); }
  return request;
}
