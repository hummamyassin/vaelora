import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { writeFile } from "node:fs/promises";
import cases from "../docs/evaluation/agent/cases.json" with { type: "json" };
import { createOutdoorAgent, renderRecommendation } from "../src/server/ai/agent.ts";
import { configuredModel } from "../src/server/ai/openai.ts";
import { recommendationTool, presentationTool, type RecommendationModel } from "../src/server/ai/contracts.ts";
import { createRecommendationPipeline } from "../src/server/recommendations/pipeline.ts";
import { createOpenMeteoAdapter } from "../src/server/weather/open-meteo.ts";

export const evaluationClock = new Date("2026-09-12T00:00:00Z");
/** Synthetic weather through the real adapter and engine; never represented as live data. */
export function evaluationPipeline() {
  return createRecommendationPipeline({ clock: () => evaluationClock, provider: createOpenMeteoAdapter({ clock: () => evaluationClock, fetch: async () => Response.json({
    latitude: 32, longitude: 35.9, elevation: 900, timezone: "Asia/Amman", utc_offset_seconds: 10800,
    hourly_units: { time: "iso8601", temperature_2m: "°C", apparent_temperature: "°C", relative_humidity_2m: "%", wind_speed_10m: "km/h", precipitation_probability: "%", uv_index: "" },
    hourly: { time: ["2026-09-12", "2026-09-13"].flatMap(d => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, "0")}:00`)),
      temperature_2m: Array(48).fill(20), apparent_temperature: Array(48).fill(20), relative_humidity_2m: Array(48).fill(50), wind_speed_10m: Array(48).fill(5), precipitation_probability: Array(48).fill(0), uv_index: Array(48).fill(0) },
  }) }) });
}
export function replayModel(intent: unknown): RecommendationModel {
  return { extract: async () => ({ name: recommendationTool.name, arguments: intent }),
    present: async (_, result) => ({ name: presentationTool.name, arguments: { areaIds: result.topMatches.map(m => m.area.id) } }) };
}

export async function evaluateAgent(model?: RecommendationModel, limit = cases.length) {
  const results = [];
  for (const c of cases.slice(0, limit)) {
    const metrics: Record<"activity" | "time" | "constraints" | "toolContract" | "locations" | "scores" | "grounding", boolean | null> = { activity: null, time: null, constraints: null, toolContract: null, locations: null, scores: null, grounding: null };
    try {
      let calls = 0;
      const pipeline = evaluationPipeline();
      const agent = createOutdoorAgent({ model: model ?? replayModel(c.mockIntent), clock: () => evaluationClock, run: async r => { calls++; return pipeline(r); } });
      const answer = await agent(c.prompt);
      const expected = c.expected;
      if (Array.isArray(expected) || ("clarification" in expected && expected.clarification)) {
        assert.equal(answer.status, "clarification");
        if (answer.status !== "clarification") throw new Error("Expected clarification");
        const issues = Array.isArray(expected) ? expected : [expected.clarification];
        for (const issue of issues) assert.ok(answer.issues.includes(issue as typeof answer.issues[number]));
        assert.equal(answer.intent.activity, c.mockIntent?.activity); metrics.activity = true;
        assert.equal(calls, 0); metrics.constraints = true; metrics.toolContract = true;
        assert.ok(!("matches" in answer)); metrics.locations = true; metrics.scores = true; metrics.grounding = true;
      } else if ("invalid" in expected) {
        assert.equal(answer.status, "invalid-request"); assert.equal(calls, 0); metrics.toolContract = true;
      } else {
        assert.equal(answer.status, "answered");
        if (answer.status !== "answered") throw new Error("Expected answer");
        assert.equal(answer.intent.activity, c.mockIntent?.activity); metrics.activity = true;
        for (const key of ["day", "startHour", "endHour", "durationHours"] as const) assert.equal(answer.intent[key], c.mockIntent?.[key]);
        for (const [key, value] of Object.entries(expected)) assert.deepEqual(answer.request[key as keyof typeof answer.request], value);
        metrics.time = true;
        assert.equal(calls, 1); assert.equal(answer.presentationValidated, true); metrics.toolContract = true;
        for (const key of ["terrain", "surface", "environment", "lowWind", "avoidHeat", "maxWindKmh", "maxTemperatureC", "maxApparentTemperatureC"] as const) assert.equal(answer.intent[key], c.mockIntent?.[key]);
        for (const match of answer.matches) {
          if (answer.request.terrain) assert.equal(match.terrain, answer.request.terrain);
          if (answer.request.surface) assert.ok(match.surfaces.includes(answer.request.surface));
          if (answer.request.environment) assert.equal(match.environment, answer.request.environment);
          for (const w of match.windows) {
            assert.ok(w.start >= `${answer.request.date}T${String(answer.request.startHour).padStart(2, "0")}:00`);
            assert.ok(w.end <= `${answer.request.date}T${String(answer.request.endHour).padStart(2, "0")}:00`);
            const weather = answer.result.weather.find(r => r.areaId === match.areaId)?.result;
            assert.ok(weather?.ok);
            if (weather?.ok) for (const hour of weather.hourly.filter(h => h.time >= w.start && h.time < w.end)) {
              const limits = answer.request.weatherLimits;
              if (limits?.maxWindKmh !== undefined) assert.ok(hour.windKmh! <= limits.maxWindKmh);
              if (limits?.maxTemperatureC !== undefined) assert.ok(hour.temperatureC! <= limits.maxTemperatureC);
              if (limits?.maxApparentTemperatureC !== undefined) assert.ok(hour.apparentTemperatureC! <= limits.maxApparentTemperatureC);
            }
          }
        }
        metrics.constraints = true;
        assert.deepEqual(answer.matches.map(m => m.areaId), answer.result.topMatches.map(m => m.area.id)); metrics.locations = true;
        assert.deepEqual(answer.matches.map(m => m.weatherSeverity), answer.result.topMatches.map(m => m.weatherSeverity)); metrics.scores = true;
        assert.deepEqual({ text: answer.text, matches: answer.matches }, renderRecommendation(answer.result, answer.assumptions)); metrics.grounding = true;
      }
      results.push({ id: c.id, passed: true, metrics });
    } catch { results.push({ id: c.id, passed: false, metrics }); }
  }
  return { mode: model ? "live-model-synthetic-weather" : "mock-replay-synthetic-weather", clock: evaluationClock.toISOString(),
    note: model ? "Live extraction measured against fixed historical clock; weather remains synthetic." : "Replay validates contracts and orchestration, not language-model extraction accuracy. Live-model verification pending.",
    total: results.length, passed: results.filter(r => r.passed).length, results };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const live = process.argv.includes("--live"), model = live ? configuredModel() : null;
  if (live && !model) console.log("Live-model verification pending: OPENAI_API_KEY and VAELORA_AI_MODEL are not configured.");
  else {
    const report = await evaluateAgent(model ?? undefined, live && !process.argv.includes("--all") ? 3 : cases.length);
    if (process.argv.includes("--save")) await writeFile(new URL(`../docs/evaluation/agent/${live ? "live-summary" : "summary"}.json`, import.meta.url), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report, null, 2));
    if (report.passed !== report.total) process.exitCode = 1;
  }
}
