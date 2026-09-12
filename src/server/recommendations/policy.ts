import type { SixInputPolicy } from "../../domain/recommendation/v1-environment.ts";
import type { RecommendationPolicy } from "../../domain/recommendation/recommend.ts";

/** Explicit provisional product policy, not medically validated thresholds. */
export const v1WeatherPolicy: SixInputPolicy = {
  id: "vaelora-six-input-comfort-v1-provisional",
  activities: {
    running: {
      temperatureC: { preferred: [8, 22], acceptable: [3, 30] },
      apparentTemperatureC: { preferred: [8, 22], acceptable: [3, 30] },
      relativeHumidityPercent: { preferred: [20, 70], acceptable: [0, 90] },
      windKmh: { preferred: [0, 15], acceptable: [0, 30] },
      precipitationProbabilityPercent: { preferred: [0, 20], acceptable: [0, 50] },
      uvIndex: { preferred: [0, 2], acceptable: [0, 5] },
    },
    walking: {
      temperatureC: { preferred: [12, 26], acceptable: [5, 32] },
      apparentTemperatureC: { preferred: [12, 26], acceptable: [5, 32] },
      relativeHumidityPercent: { preferred: [20, 75], acceptable: [0, 95] },
      windKmh: { preferred: [0, 20], acceptable: [0, 35] },
      precipitationProbabilityPercent: { preferred: [0, 20], acceptable: [0, 60] },
      uvIndex: { preferred: [0, 2], acceptable: [0, 5] },
    },
  },
};
export const v1RecommendationPolicy: RecommendationPolicy = {
  timeWindows: { maxSeverity: 1, nearTieThreshold: 0 },
  locationNearTieThreshold: 1,
};
