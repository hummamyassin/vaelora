/** Opt-in live integration verification. Never imported by the offline test command. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { activityAreas } from "../src/data/activity-areas.ts";
import { createOpenMeteoAdapter, forecastDates } from "../src/server/weather/open-meteo.ts";
import { createRecommendationPipeline } from "../src/server/recommendations/pipeline.ts";

const now = new Date();
const { today, tomorrow } = forecastDates(now);
const requests: { url: string; fetchedAt: string; status: number; body: unknown }[] = [];
const provider = createOpenMeteoAdapter({ timeoutMs: 15000, fetch: async (url, init) => {
  const response = await fetch(url, init);
  requests.push({ url: String(url), fetchedAt: new Date().toISOString(), status: response.status, body: await response.clone().json() as unknown });
  return response;
} });
const run = createRecommendationPipeline({ provider, clock: () => now });
const scenarios = [
  { label: "Running tonight", input: { activity: "running", date: today, startHour: 18, endHour: 24, durationHours: 1 } },
  { label: "Walking tomorrow morning", input: { activity: "walking", date: tomorrow, startHour: 6, endHour: 11, durationHours: 1 } },
  { label: "Running tomorrow evening, flat terrain", input: { activity: "running", date: tomorrow, startHour: 17, endHour: 21, durationHours: 1, terrain: "flat" } },
];
const results = [];
for (const scenario of scenarios) results.push({ ...scenario, result: await run(scenario.input) });
const directory = new URL("../docs/validation/weather-pipeline/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL("smoke.json", directory), JSON.stringify({ evaluatedAt: now.toISOString(), timezone: "Asia/Amman", requests, scenarios: results }, null, 2) + "\n");
const summary = results.map(({ label, result }) => ({ label, status: result.status, eligible: result.weather.length,
  providerErrors: result.weather.filter(w => !w.result.ok).length,
  topMatches: result.topMatches.map(m => ({ id: m.area.id, name: m.area.name, severity: m.weatherSeverity, windows: m.bestWindows.map(w => `${w.start}–${w.end}`) })) }));
await writeFile(new URL("summary.json", directory), JSON.stringify({ evaluatedAt: now.toISOString(), networkRequests: requests.length, scenarios: summary }, null, 2) + "\n");
console.log(JSON.stringify({ evaluatedAt: now.toISOString(), networkRequests: requests.length, scenarios: summary }, null, 2));
assert.ok(results.every(s => s.result.weather.every(w => w.result.ok)), "Live provider errors occurred; inspect smoke.json");
assert.equal(requests.length, activityAreas.length, "Each exact production point should be fetched once across scenarios");
assert.ok(results[2].result.weather.every(w => activityAreas.find(a => a.id === w.areaId)?.terrain === "flat"));
assert.ok(results.every(s => s.result.topMatches.every(m => m.bestWindows.every(w => w.start.startsWith(s.input.date)))));
