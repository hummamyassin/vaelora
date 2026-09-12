// Node builtins keep this I/O adapter out of browser bundles; tests need no framework.
import { setTimeout, clearTimeout } from "node:timers";
import type { ActivityArea } from "../../domain/activity-area.ts";
import type { HourlyConditions } from "../../domain/recommendation/types.ts";

const fields = [
  ["temperature_2m", "temperatureC", "°C", -100, 70],
  ["apparent_temperature", "apparentTemperatureC", "°C", -120, 90],
  ["relative_humidity_2m", "relativeHumidityPercent", "%", 0, 100],
  ["wind_speed_10m", "windKmh", "km/h", 0, 400],
  ["precipitation_probability", "precipitationProbabilityPercent", "%", 0, 100],
  ["uv_index", "uvIndex", "", 0, 30],
] as const;
const object = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const finite = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

export function forecastDates(now: Date) {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid clock");
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Amman", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).map(p => [p.type, p.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  return { today, tomorrow: new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10) };
}

export interface ForecastMetadata {
  provider: "open-meteo";
  attribution: string;
  requested: { latitude: number; longitude: number };
  returned: { latitude: number; longitude: number; elevation: number | null };
  timezone: "Asia/Amman";
  utcOffsetSeconds: number;
  retrievedAt: string;
  requestUrl: string;
  units: Record<string, string>;
  cache: "hit" | "miss";
}
export type WeatherErrorCode = "timeout" | "network" | "rate-limited" | "provider-http" | "invalid-response";
export type ForecastResult = {
  ok: true; hourly: HourlyConditions[]; metadata: ForecastMetadata; issues: string[];
} | { ok: false; code: WeatherErrorCode; message: string; retryable: boolean };
export interface WeatherProvider {
  getForecast(area: Pick<ActivityArea, "latitude" | "longitude">, now: Date): Promise<ForecastResult>;
}

function normalize(raw: unknown, dates: ReturnType<typeof forecastDates>) {
  if (!object(raw) || raw.error || raw.timezone !== "Asia/Amman" || raw.utc_offset_seconds !== 10800 ||
      !finite(raw.latitude) || !finite(raw.longitude) || Math.abs(raw.latitude) > 90 || Math.abs(raw.longitude) > 180 ||
      !object(raw.hourly) || !object(raw.hourly_units) || raw.hourly_units.time !== "iso8601") throw new Error("Invalid provider metadata");
  const data = raw.hourly, units = raw.hourly_units;
  if (!Array.isArray(data.time) || data.time.length === 0 || data.time.length > 48) throw new Error("Invalid hourly timestamps");
  const byTime = new Map<string, number>();
  data.time.forEach((time, index) => {
    if (typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00$/.test(time) ||
        ![dates.today, dates.tomorrow].includes(time.slice(0, 10)) || byTime.has(time)) throw new Error("Invalid/duplicate/out-of-scope hour");
    byTime.set(time, index);
  });
  for (const [key, , unit] of fields) {
    if (data[key] === undefined) continue; // Missing whole column stays missing, never zero.
    if (!Array.isArray(data[key]) || data[key].length !== data.time.length || units[key] !== unit) throw new Error(`Invalid array or units: ${key}`);
  }
  const issues: string[] = [];
  const hourly: HourlyConditions[] = [];
  for (const date of [dates.today, dates.tomorrow]) for (let h = 0; h < 24; h++) {
    const time = `${date}T${String(h).padStart(2, "0")}:00`;
    const index = byTime.get(time);
    const hour: HourlyConditions = { time };
    if (index === undefined) issues.push(`${time}: missing-forecast-hour`);
    for (const [key, metric, , lo, hi] of fields) {
      const values = data[key];
      const value: unknown = index !== undefined && Array.isArray(values) ? values[index] : undefined;
      hour[metric] = finite(value) && value >= lo && value <= hi ? value : null;
      if (hour[metric] === null && index !== undefined) issues.push(`${time}: missing-or-invalid-${metric}`);
    }
    hourly.push(hour);
  }
  return { hourly, issues, returned: { latitude: raw.latitude, longitude: raw.longitude, elevation: finite(raw.elevation) ? raw.elevation : null },
    units: Object.fromEntries(fields.map(([key, , unit]) => [key, typeof units[key] === "string" ? units[key] : `missing (expected ${unit || "dimensionless"})`])) };
}

/** One request per exact point; bounded successful cache and in-flight deduplication.
 * No rounding, city fallback, retries, stale-on-error serving or grid-cell merging.
 */
export function createOpenMeteoAdapter(options: { fetch?: typeof fetch; clock?: () => Date; timeoutMs?: number; ttlMs?: number } = {}): WeatherProvider {
  const fetcher = options.fetch ?? fetch, clock = options.clock ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? 10000, ttlMs = options.ttlMs ?? 600000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isFinite(ttlMs) || ttlMs < 0) throw new Error("Invalid adapter timing");
  const cache = new Map<string, { expires: number; value: Extract<ForecastResult, { ok: true }> }>();
  const pending = new Map<string, Promise<ForecastResult>>();
  return { async getForecast(area, now) {
    if (!finite(area.latitude) || !finite(area.longitude) || Math.abs(area.latitude) > 90 || Math.abs(area.longitude) > 180) throw new Error("Invalid requested coordinates");
    const dates = forecastDates(now);
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({ latitude: String(area.latitude), longitude: String(area.longitude), hourly: fields.map(f => f[0]).join(","),
      timezone: "Asia/Amman", start_date: dates.today, end_date: dates.tomorrow, temperature_unit: "celsius", wind_speed_unit: "kmh", timeformat: "iso8601", cell_selection: "land" }).toString();
    const key = url.toString();
    const saved = cache.get(key);
    if (saved && saved.expires > clock().getTime()) {
      const copy = structuredClone(saved.value); copy.metadata.cache = "hit"; return copy;
    }
    cache.delete(key);
    const existing = pending.get(key);
    if (existing) return structuredClone(await existing);
    const run = async (): Promise<ForecastResult> => {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const response = await Promise.race([
          (async () => {
            const res = await fetcher(url, { signal: controller.signal, cache: "no-store", redirect: "error" });
            if (!res.ok) return { httpStatus: res.status };
            return { raw: await res.json() as unknown };
          })(),
          new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("timeout")); }, timeoutMs); }),
        ]);
        if ("httpStatus" in response && typeof response.httpStatus === "number") {
          const status = response.httpStatus;
          return { ok: false, code: status === 429 ? "rate-limited" : "provider-http", message: `Open-Meteo HTTP ${status}`, retryable: status === 429 || status >= 500 };
        }
        let normalized: ReturnType<typeof normalize>;
        try { normalized = normalize(response.raw, dates); }
        catch { return { ok: false, code: "invalid-response", message: "Open-Meteo returned invalid metadata, timestamps, units or array alignment", retryable: false }; }
        const result: Extract<ForecastResult, { ok: true }> = { ok: true, hourly: normalized.hourly, issues: normalized.issues, metadata: {
          provider: "open-meteo", attribution: "Weather data by Open-Meteo (CC BY 4.0)", requested: { latitude: area.latitude, longitude: area.longitude }, returned: normalized.returned,
          timezone: "Asia/Amman", utcOffsetSeconds: 10800, retrievedAt: clock().toISOString(), requestUrl: key, units: normalized.units, cache: "miss",
        } };
        if (cache.size >= 64) cache.delete(cache.keys().next().value!);
        cache.set(key, { expires: clock().getTime() + ttlMs, value: structuredClone(result) });
        return result;
      } catch (error) {
        const code = controller.signal.aborted ? "timeout" : error instanceof SyntaxError ? "invalid-response" : "network";
        return { ok: false, code, message: `Open-Meteo ${code}`, retryable: code !== "invalid-response" };
      } finally { clearTimeout(timer); }
    };
    const job = run(); pending.set(key, job);
    try { return structuredClone(await job); } finally { pending.delete(key); }
  } };
}
