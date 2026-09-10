import type { Activity, ActivityArea, Environment, Surface, Terrain } from "../activity-area.ts";

export interface RecommendationRequest {
  activity: Activity;
  /** YYYY-MM-DD in Asia/Amman; restricted to today or tomorrow at evaluation. */
  date: string;
  /** Whole local hours: [startHour, endHour); endHour may be 24. */
  startHour: number;
  endHour: number;
  durationHours: number;
  terrain?: Exclude<Terrain, "unknown">;
  surface?: Exclude<Surface, "unknown">;
  environment?: Exclude<Environment, "unknown">;
  weatherLimits?: {
    maxTemperatureC?: number;
    maxApparentTemperatureC?: number;
    maxWindKmh?: number;
  };
}

/** Normalized provider-independent units. Null/absent means unknown, never zero. */
export interface HourlyConditions {
  /** YYYY-MM-DDTHH:00 local Asia/Amman; describes [hour, hour + 1). */
  time: string;
  temperatureC?: number | null;
  apparentTemperatureC?: number | null;
  relativeHumidityPercent?: number | null;
  windKmh?: number | null;
  precipitationProbabilityPercent?: number | null;
  uvIndex?: number | null;
  /** US AQI only. A future adapter must not mix AQI scales. */
  usAqi?: number | null;
}

export type Metric = Exclude<keyof HourlyConditions, "time">;
/** Ordered categories, not a percentage score or validated production formula. */
export type Severity = 0 | 1 | 2;
export interface HourAssessment {
  severity: Severity | null;
  eligible: boolean;
  reasons: readonly string[];
  missing: readonly Metric[];
}
export interface EnvironmentalScorer {
  /** Caller-owned version identifier for reproducibility. Same input => same output. */
  id: string;
  evaluate(activity: Activity, hour: HourlyConditions, limits?: RecommendationRequest["weatherLimits"]): HourAssessment;
}

export interface TimeWindow {
  start: string;
  end: string;
  /** Worst hourly severity: good hours cannot average away a poor hour. */
  severity: Severity;
  missingOptional: readonly Metric[];
}
export interface TimeWindowPolicy {
  maxSeverity: Severity;
  /** 0 means same category only; 1 also groups an adjacent category. */
  nearTieThreshold: number;
}
export interface TimeWindowResult {
  windows: readonly TimeWindow[];
  topWindows: readonly TimeWindow[];
  excludedHours: readonly { time: string; reasons: readonly string[] }[];
}
export interface Match {
  area: ActivityArea;
  fit: "suitable" | "limited";
  bestWindows: readonly TimeWindow[];
  weatherSeverity: Severity;
}
