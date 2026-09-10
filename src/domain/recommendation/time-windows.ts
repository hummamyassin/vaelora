import type { EnvironmentalScorer, HourlyConditions, Metric, RecommendationRequest, Severity, TimeWindow, TimeWindowPolicy, TimeWindowResult } from "./types.ts";

export function validateTieThreshold(threshold: number) {
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 2) throw new Error("Tie threshold must be 0, 1, or 2 category steps");
}

const localParts = (now: Date) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Amman", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
}).formatToParts(now).map((part) => [part.type, part.value]));

export function validateRequest(request: RecommendationRequest, now: Date) {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid evaluation clock");
  const parts = localParts(now);
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
  if (request.date !== today && request.date !== tomorrow) throw new Error("Only today or tomorrow in Asia/Amman is supported");
  if (!["running", "walking"].includes(request.activity)) throw new Error("Unsupported activity");
  const { startHour, endHour, durationHours } = request;
  if (![startHour, endHour, durationHours].every(Number.isInteger)
    || startHour < 0 || endHour > 24 || startHour >= endHour || durationHours < 1 || durationHours > endHour - startHour) {
    throw new Error("Use a whole-hour window within one local day and a positive fitting duration");
  }
  for (const [name, value] of Object.entries(request.weatherLimits ?? {})) {
    if (value !== undefined && (!Number.isFinite(value) || (name === "maxWindKmh" && value < 0))) throw new Error(`Invalid weather limit: ${name}`);
  }
  const hour = Number(parts.hour);
  const nextFullHour = hour + (Number(parts.minute) || Number(parts.second) || now.getUTCMilliseconds() ? 1 : 0);
  return { earliestHour: request.date === today ? Math.max(startHour, nextFullHour) : startHour };
}

const timeAt = (date: string, hour: number) => hour === 24
  ? `${new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)}T00:00`
  : `${date}T${String(hour).padStart(2, "0")}:00`;

/** Finds contiguous whole-hour blocks, excluding past/partial hours and gaps.
 * Forecast retrieval and clock acquisition belong to the caller, not this function.
 */
export function findBestTimeWindows(
  request: RecommendationRequest,
  hourly: readonly HourlyConditions[],
  scorer: EnvironmentalScorer,
  policy: TimeWindowPolicy,
  now: Date,
): TimeWindowResult {
  const { earliestHour } = validateRequest(request, now);
  validateTieThreshold(policy.nearTieThreshold);
  if (![0, 1, 2].includes(policy.maxSeverity)) throw new Error("Invalid maximum severity");
  const byTime = new Map<string, HourlyConditions>();
  for (const hour of hourly) {
    if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00$/.test(hour.time)) throw new Error("Forecast timestamps must be local YYYY-MM-DDTHH:00");
    const parsed = new Date(`${hour.time}:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 16) !== hour.time) throw new Error("Invalid forecast date");
    if (byTime.has(hour.time)) throw new Error(`Duplicate forecast hour: ${hour.time}`);
    byTime.set(hour.time, hour);
  }
  const assessed = new Map<number, { severity: Severity; missing: readonly Metric[] }>();
  const excludedHours: { time: string; reasons: readonly string[] }[] = [];
  for (let h = earliestHour; h < request.endHour; h++) {
    const time = timeAt(request.date, h);
    const hour = byTime.get(time);
    if (!hour) { excludedHours.push({ time, reasons: ["missing-forecast-hour"] }); continue; }
    const assessment = scorer.evaluate(request.activity, hour, request.weatherLimits);
    if (assessment.severity !== null && ![0, 1, 2].includes(assessment.severity)) throw new Error("Scorer returned invalid severity");
    if (!assessment.eligible || assessment.severity === null) {
      excludedHours.push({ time, reasons: assessment.reasons });
    } else if (assessment.severity > policy.maxSeverity) {
      excludedHours.push({ time, reasons: ["exceeds-window-severity"] });
    } else assessed.set(h, { severity: assessment.severity, missing: assessment.missing });
  }
  const windows: TimeWindow[] = [];
  for (let start = earliestHour; start + request.durationHours <= request.endHour; start++) {
    const hours = Array.from({ length: request.durationHours }, (_, i) => assessed.get(start + i));
    if (hours.some((h) => !h)) continue;
    const valid = hours.filter((h) => h !== undefined);
    windows.push({
      start: timeAt(request.date, start), end: timeAt(request.date, start + request.durationHours),
      severity: Math.max(...valid.map((h) => h.severity)) as Severity,
      missingOptional: [...new Set(valid.flatMap((h) => h.missing))].sort(),
    });
  }
  const best = Math.min(...windows.map((w) => w.severity));
  // Compare every candidate to the best anchor: never chain adjacent near-ties.
  const topWindows = windows.filter((w) => w.severity <= best + policy.nearTieThreshold);
  return { windows, topWindows, excludedHours };
}
