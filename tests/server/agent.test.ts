import assert from "node:assert/strict";
import test from "node:test";
import cases from "../../docs/evaluation/agent/cases.json" with { type: "json" };
import { parseIntent, resolveIntent } from "../../src/server/ai/intent.ts";
import { createOutdoorAgent, validatePresentation } from "../../src/server/ai/agent.ts";
import { createOpenAIModel } from "../../src/server/ai/openai.ts";
import { createAgentHandler } from "../../src/server/ai/http.ts";
import { recommendationTool, presentationTool } from "../../src/server/ai/contracts.ts";
import { evaluateAgent, evaluationClock, evaluationPipeline, replayModel } from "../../scripts/agent-evaluation.ts";
import { createRecommendationPipeline } from "../../src/server/recommendations/pipeline.ts";

const intent = cases[0].mockIntent!;
test("intent schema rejects missing/extra fields, invented scores/locations, malformed limits and enums", () => {
  for (const input of [null, [], {}, { ...intent, score: 99 }, { ...intent, areaId: "fake" }, { ...intent, activity: "hiking" }, { ...intent, startHour: 18.5 }, { ...intent, maxWindKmh: -1 }, { ...intent, lowWind: "yes" }, { ...intent, issues: ["invented"] }, { ...intent, maxTemperatureC: Infinity }, { ...intent, terrain: undefined }]) assert.throws(() => parseIntent(input));
  assert.deepEqual(parseIntent(intent), intent);
});
test("intent resolution discloses defaults, derives qualitative limits in code, preserves stricter explicit limits", () => {
  const resolved = resolveIntent(parseIntent({ ...intent, avoidHeat: true, lowWind: true, maxWindKmh: 8 }), evaluationClock);
  assert.equal(resolved.kind, "ready");
  if (resolved.kind === "ready") {
    assert.deepEqual(resolved.request.weatherLimits, { maxWindKmh: 8, maxTemperatureC: 22, maxApparentTemperatureC: 22 });
    assert.equal(resolved.assumptions.length, 5);
    assert.equal(resolved.request.date, "2026-09-13");
  }
  const rollover = resolveIntent(parseIntent(intent), new Date("2026-12-31T22:00:00Z"));
  if (rollover.kind === "ready") assert.equal(rollover.request.date, "2027-01-02");
});
test("28 fixed evaluation replays pass without live model or weather calls", async () => {
  const report = await evaluateAgent();
  assert.equal(report.total, 28); assert.equal(report.passed, 28, JSON.stringify(report.results.filter(r => !r.passed)));
});
test("unsupported, contradictory and ambiguous intent cannot reach recommendation tool", async () => {
  for (const issues of [["route-distance"], ["unsupported-constraint"], ["contradictory"], ["ambiguous"]]) {
    const agent = createOutdoorAgent({ model: replayModel({ ...intent, issues }), clock: () => evaluationClock, run: async () => { throw new Error("Must not execute"); } });
    assert.equal((await agent("test")).status, "clarification");
  }
});
test("unknown tools and malformed tool arguments fail closed before weather I/O", async () => {
  for (const call of [{ name: "shell", arguments: intent }, { name: recommendationTool.name, arguments: "invalid JSON" }, { name: recommendationTool.name, arguments: { ...intent, weather: 30 } }]) {
    const model = { ...replayModel(intent), extract: async () => call };
    const agent = createOutdoorAgent({ model, run: async () => { assert.fail("Unexpected tool execution"); }, clock: () => evaluationClock });
    assert.equal((await agent("run tomorrow")).status, "model-error");
  }
});
test("presentation rejects hallucinated IDs/scores/prose, duplicates and omissions; trusted fallback keeps all matches", async () => {
  const result = await evaluationPipeline()({ activity: "running", date: "2026-09-13", startHour: 6, endHour: 22, durationHours: 1 });
  const ids = result.topMatches.map(m => m.area.id);
  assert.ok(ids.length > 1);
  for (const value of [{ areaIds: ["imaginary-park"] }, { areaIds: ids, score: 99 }, { areaIds: ids, text: "Fake park is best" }, { areaIds: ids.slice(1) }, { areaIds: ids.map(() => ids[0]) }]) assert.throws(() => validatePresentation(value, result));
  validatePresentation({ areaIds: [...ids].reverse() }, result);
  const model = { ...replayModel(intent), present: async () => ({ name: presentationTool.name, arguments: { areaIds: ["imaginary-park"], score: 99 } }) };
  const answer = await createOutdoorAgent({ model, run: evaluationPipeline(), clock: () => evaluationClock })("run tomorrow");
  assert.equal(answer.status, "answered");
  if (answer.status === "answered") {
    assert.equal(answer.presentationValidated, false); assert.deepEqual(answer.matches.map(m => m.areaId), ids);
    assert.ok(!answer.text.includes("imaginary-park")); assert.ok(!answer.text.includes("99"));
    assert.ok(!JSON.stringify(answer.trace).includes("continuation"));
  }
});
test("no matches are grounded and provider presentation failure cannot invent an answer", async () => {
  const model = replayModel({ ...intent, maxTemperatureC: -20 });
  model.present = async () => { throw new Error("private provider details"); };
  const answer = await createOutdoorAgent({ model, run: evaluationPipeline(), clock: () => evaluationClock })("Run tomorrow below -20 C");
  assert.equal(answer.status, "answered");
  if (answer.status === "answered") { assert.equal(answer.matches.length, 0); assert.match(answer.text, /No matches/); assert.ok(!answer.text.includes("private")); }
});
test("OpenAI adapter exchanges real function call output with store disabled and no cross-request memory", async () => {
  const bodies: Record<string, unknown>[] = [];
  const model = createOpenAIModel({ apiKey: "test-placeholder", model: "test-model", fetch: async (_, init) => {
    const body = JSON.parse(String(init?.body)); bodies.push(body);
    const first = body.tools[0].name === recommendationTool.name;
    return Response.json({ status: "completed", output: [{ type: "function_call", call_id: first ? "c1" : "c2", name: first ? recommendationTool.name : presentationTool.name, arguments: JSON.stringify(first ? intent : { areaIds: [] }) }] });
  } });
  const call = await model.extract("run tomorrow", evaluationClock);
  const result = await evaluationPipeline()({ activity: "running", date: "2026-09-13", startHour: 6, endHour: 22, durationHours: 1, weatherLimits: { maxTemperatureC: -20 } });
  await model.present(call, result);
  await model.extract("walk today", evaluationClock);
  assert.equal(bodies.length, 3);
  for (const body of bodies) { assert.equal(body.store, false); assert.equal(body.parallel_tool_calls, false); assert.ok(!("previous_response_id" in body)); }
  const second = bodies[1].input as Record<string, unknown>[];
  assert.equal(second.at(-1)?.type, "function_call_output"); assert.equal(second.at(-1)?.call_id, "c1");
  assert.deepEqual(bodies[2].input, [{ role: "user", content: "walk today" }]);
});
test("OpenAI adapter rejects refusal, incomplete output, multiple calls, bad JSON, errors and timeout without leaking secrets", async () => {
  for (const raw of [{ status: "incomplete", output: [] }, { status: "completed", output: [{ type: "message", content: "refusal" }] }, { status: "completed", output: [1, 2].map(() => ({ type: "function_call", call_id: "x", name: recommendationTool.name, arguments: "{}" })) }, { status: "completed", output: [{ type: "function_call", call_id: "x", name: recommendationTool.name, arguments: "bad" }] }]) {
    const model = createOpenAIModel({ apiKey: "secret-placeholder", model: "test", fetch: async () => Response.json(raw) });
    await assert.rejects(model.extract("test", evaluationClock), /AI provider unavailable/);
  }
  for (const fetcher of [async () => new Response("secret-placeholder", { status: 429 }), () => new Promise<Response>(() => {})]) {
    const model = createOpenAIModel({ apiKey: "secret-placeholder", model: "test", fetch: fetcher, timeoutMs: 10 });
    await assert.rejects(model.extract("test", evaluationClock), error => error instanceof Error && !error.message.includes("secret-placeholder"));
  }
});
test("HTTP boundary validates input, limits body, and handles absent credentials without model calls", async () => {
  const handler = createAgentHandler(() => null);
  const req = (body: string, contentType = "application/json") => new Request("http://localhost/api/agent", { method: "POST", headers: { "Content-Type": contentType }, body });
  for (const body of ["{}", "{", JSON.stringify({ prompt: "" }), JSON.stringify({ prompt: "x", history: [] }), JSON.stringify({ prompt: "x".repeat(2001) })]) assert.equal((await handler(req(body))).status, 400);
  assert.equal((await handler(req("x", "text/plain"))).status, 415);
  assert.equal((await handler(req("x".repeat(8193)))).status, 413);
  const response = await handler(req(JSON.stringify({ prompt: "run tomorrow" })));
  assert.equal(response.status, 503); assert.equal(response.headers.get("cache-control"), "no-store");
});
test("weather failure and empty eligibility retain factual trace and never fabricate matches", async () => {
  for (const areas of [undefined, []]) {
    const run = createRecommendationPipeline({ areas, clock: () => evaluationClock, provider: { getForecast: async () => ({ ok: false, code: "network", message: "Open-Meteo network", retryable: true }) } });
    const agent = createOutdoorAgent({ model: replayModel(intent), run, clock: () => evaluationClock });
    const handler = createAgentHandler(() => agent);
    const response = await handler(new Request("http://localhost/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "Run tomorrow" }) }));
    assert.equal(response.status, areas ? 200 : 503);
    const answer = await response.json();
    assert.deepEqual(answer.matches, []);
    assert.equal(answer.result.status, areas ? "no-eligible-areas" : "weather-unavailable");
    assert.equal(answer.trace.find((t: { action: string }) => t.action === "weather-retrieved").count, 0);
    assert.equal(answer.trace.find((t: { action: string }) => t.action === "matches-returned").count, 0);
  }
});
test("invalid prompt and failed pipeline return controlled errors without exposing model internals", async () => {
  let extracted = 0;
  const model = { ...replayModel(intent), extract: async () => { extracted++; return { name: recommendationTool.name, arguments: intent, continuation: "private-reasoning" }; } };
  const agent = createOutdoorAgent({ model, clock: () => evaluationClock, run: async () => { throw new Error("private-key"); } });
  for (const prompt of [null, "", " ", {}, "x".repeat(2001)]) assert.equal((await agent(prompt)).status, "invalid-request");
  assert.equal(extracted, 0);
  const answer = await agent("Run tomorrow");
  assert.equal(answer.status, "service-error"); assert.ok(!JSON.stringify(answer).includes("private"));
});
