export type Activity = "running" | "walking";

export interface ActivityAreaView {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  district: string;
  environment: string;
  terrain: string;
  surfaces: readonly string[];
  suitability: Record<Activity, string>;
  verificationStatus: "supported" | "verified";
  evidence: readonly { url: string; note: string }[];
  description: string;
}

export interface TimeWindowView {
  start: string;
  end: string;
  severity: 0 | 1 | 2;
  missingOptional: readonly string[];
}

export interface MatchView {
  area: ActivityAreaView;
  fit: "suitable" | "limited";
  bestWindows: readonly TimeWindowView[];
  weatherSeverity: 0 | 1 | 2;
}

export interface HourlyConditionsView {
  time: string;
  temperatureC?: number | null;
  apparentTemperatureC?: number | null;
  relativeHumidityPercent?: number | null;
  windKmh?: number | null;
  precipitationProbabilityPercent?: number | null;
  uvIndex?: number | null;
}

export type WeatherView = {
  areaId: string;
  result:
    | { ok: true; hourly: HourlyConditionsView[]; issues: string[]; metadata: { attribution: string; cache: "hit" | "miss" } }
    | { ok: false; code: string; message: string; retryable: boolean };
};

export interface RecommendationView {
  status: "complete" | "partial" | "weather-unavailable" | "no-eligible-areas";
  evaluatedAt: string;
  timezone: "Asia/Amman";
  request: { activity: Activity; date: string; startHour: number; endHour: number; durationHours: number; terrain?: string; surface?: string; environment?: string; weatherLimits?: { maxWindKmh?: number; maxTemperatureC?: number; maxApparentTemperatureC?: number } };
  policy: { id: string; provisional: boolean };
  topMatches: MatchView[];
  weather: WeatherView[];
  warnings: string[];
  hourlyAssessments?: Array<{ areaId: string; hours: Array<{ time: string; severity: number | null; eligible: boolean }> }>;
  trace: Array<{ action: string; detail?: string; count?: number }>;
}

export interface AgentView {
  status: "answered" | "conditions" | "clarification" | "model-error" | "service-error" | "invalid-request";
  text: string;
  matches?: Array<{ areaId: string; name: string }>;
  result?: RecommendationView;
  trace: Array<{ action: string; activity?: string; request?: unknown; assumptions?: string[]; count?: number; detail?: string; issues?: string[] }>;
}

export interface UiPolicy {
  running: { maxPreferredWind: number; maxPreferredHeat: number };
  walking: { maxPreferredWind: number; maxPreferredHeat: number };
}
