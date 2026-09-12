import type { Activity, UiPolicy } from "./types";

export type TimePreset = "now" | "tonight" | "tomorrow-morning" | "tomorrow-evening";
export type Preference = "flat" | "paved" | "park" | "lowWind" | "avoidHeat";

function ammanNow(now: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Amman", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

function tomorrow(date: string) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

/** Browser intent adapter only. Domain validation and ranking remain authoritative. */
export function buildUiRecommendationRequest(activity: Activity, preset: TimePreset, preferences: ReadonlySet<Preference>, policy: UiPolicy, now = new Date()) {
  const local = ammanNow(now);
  let date = local.date, startHour = 18, endHour = 24;
  if (preset === "now") {
    startHour = Math.min(local.minute === 0 ? local.hour : local.hour + 1, 23);
  } else if (preset === "tomorrow-morning") {
    date = tomorrow(local.date); startHour = 6; endHour = 12;
  } else if (preset === "tomorrow-evening") {
    date = tomorrow(local.date); startHour = 17; endHour = 22;
  }
  const weatherLimits: Record<string, number> = {};
  if (preferences.has("lowWind")) weatherLimits.maxWindKmh = policy[activity].maxPreferredWind;
  if (preferences.has("avoidHeat")) {
    weatherLimits.maxTemperatureC = policy[activity].maxPreferredHeat;
    weatherLimits.maxApparentTemperatureC = policy[activity].maxPreferredHeat;
  }
  return {
    activity, date, startHour, endHour, durationHours: 1,
    ...(preferences.has("flat") ? { terrain: "flat" as const } : {}),
    ...(preferences.has("paved") ? { surface: "paved" as const } : {}),
    ...(preferences.has("park") ? { environment: "park" as const } : {}),
    ...(Object.keys(weatherLimits).length ? { weatherLimits } : {}),
  };
}
