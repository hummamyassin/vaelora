import { test } from "node:test";
import assert from "node:assert/strict";
import { BodyError, checkJsonRequest, createRequestBudget, readJson } from "../../src/server/http-security.ts";
import { createAgentHandler } from "../../src/server/ai/http.ts";
import { createRecommendationHandler } from "../../src/server/recommendations/http.ts";

const request = (body = "{}", headers: Record<string, string> = {}) => new Request("http://localhost/api/agent", { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
test("Public APIs reject unsupported methods, cross-origin requests and invalid MIME types", () => {
  assert.equal(checkJsonRequest(new Request("http://localhost/api/agent"))?.status, 405);
  assert.equal(checkJsonRequest(request("{}", { origin: "https://attacker.example" }))?.status, 403);
  assert.equal(checkJsonRequest(request("{}", { "sec-fetch-site": "cross-site" }))?.status, 403);
  assert.equal(checkJsonRequest(request("{}", { "content-type": "application/json-evil" }))?.status, 415);
  assert.equal(checkJsonRequest(request("{}", { origin: "http://localhost", "content-type": "application/json; charset=utf-8" })), null);
});
test("JSON reader rejects malformed JSON and both declared and streamed oversized bodies", async () => {
  for (const [req, status] of [[request("{"), 400], [request("{}", { "content-length": "9000" }), 413], [request(JSON.stringify("ع".repeat(5000))), 413]] as const) {
    await assert.rejects(() => readJson(req), (e: unknown) => e instanceof BodyError && e.status === status);
  }
});
test("Slow bodies time out and release the reader", async () => {
  const body = new ReadableStream({ start() {} });
  const req = new Request("http://localhost", { method: "POST", body, duplex: "half" } as RequestInit);
  await assert.rejects(() => readJson(req, 10), (e: unknown) => e instanceof BodyError && e.status === 408);
  assert.equal(body.locked, false);
});
test("Request budget bounds concurrency and repeated calls, then recovers", () => {
  let now = 0;
  const budget = createRequestBudget({ perMinute: 2, perClient: 2, concurrent: 1, clock: () => now });
  const first = budget(request()); assert.equal(typeof first, "function");
  const blocked = budget(request()); assert.ok(blocked instanceof Response); assert.equal(blocked.status, 429); assert.equal(blocked.headers.get("Retry-After"), "60");
  if (typeof first === "function") { first(); first(); }
  const second = budget(request()); assert.equal(typeof second, "function"); if (typeof second === "function") second();
  assert.ok(budget(request()) instanceof Response);
  now = 60000; assert.equal(typeof budget(request()), "function");
});
test("Invalid agent payloads never invoke the provider", async () => {
  let calls = 0;
  for (const body of ["{", "{}", '{"prompt":""}', JSON.stringify({ prompt: "x".repeat(2001) }), '{"prompt":"run","model":"evil"}', '{"prompt":"run","locale":"xx"}']) {
    const handler = createAgentHandler(() => { calls++; return null; });
    assert.equal((await handler(request(body))).status, 400);
  }
  assert.equal(calls, 0);
});
test("Provider and internal errors are redacted and non-cacheable", async () => {
  const handler = createAgentHandler(() => { throw new Error("private provider/path/config"); });
  const result = await handler(request('{"prompt":"run tonight"}'));
  assert.equal(result.status, 503); assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.doesNotMatch(await result.text(), /private|provider\/path/);
  const recommend = createRecommendationHandler(async () => { throw new Error("private filesystem path"); });
  const failure = await recommend(request()); assert.equal(failure.status, 500); assert.doesNotMatch(await failure.text(), /private|filesystem/);
});
test("Agent spam stops before provider access", async () => {
  let calls = 0;
  const handler = createAgentHandler(() => { calls++; return null; });
  for (let i = 0; i < 10; i++) assert.equal((await handler(request('{"prompt":"run tonight"}'))).status, 503);
  assert.equal((await handler(request('{"prompt":"run tonight"}'))).status, 429);
  assert.equal(calls, 10);
});
test("Vercel AI stays disabled until explicitly activated after edge protection", async () => {
  const previous = process.env.VERCEL, enabled = process.env.VAELORA_AI_PUBLIC_ENABLED;
  try {
    process.env.VERCEL = "1"; delete process.env.VAELORA_AI_PUBLIC_ENABLED;
    const response = await createAgentHandler(() => { throw new Error("must not execute"); })(request('{"prompt":"run tonight"}'));
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: "AI service unavailable" });
  } finally {
    if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous;
    if (enabled === undefined) delete process.env.VAELORA_AI_PUBLIC_ENABLED; else process.env.VAELORA_AI_PUBLIC_ENABLED = enabled;
  }
});

test("Edge rate limit: no-op off Vercel, closes AI without the rule, opens weather", async () => {
  const { edgeLimit, edgeRuleId } = await import("../../src/server/edge-limit.ts");
  const request = new Request("https://vaelora.test/api/agent", { method: "POST" });
  const seen: string[] = [];
  const answer = (result: { rateLimited: boolean; error?: "not-found" | "blocked" }) =>
    (async (id: string) => {
      seen.push(id);
      return result;
    }) as never;
  assert.equal(await edgeLimit(request, { required: true, onVercel: false, check: answer({ rateLimited: true }) }), null);
  assert.equal(seen.length, 0);
  assert.equal((await edgeLimit(request, { required: false, onVercel: true, check: answer({ rateLimited: true }) }))?.status, 429);
  assert.equal(seen[0], edgeRuleId);
  assert.equal((await edgeLimit(request, { required: true, onVercel: true, check: answer({ rateLimited: false, error: "not-found" }) }))?.status, 503);
  assert.equal(await edgeLimit(request, { required: false, onVercel: true, check: answer({ rateLimited: false, error: "not-found" }) }), null);
  assert.equal(await edgeLimit(request, { required: true, onVercel: true, check: answer({ rateLimited: false }) }), null);
  const broken = (async () => {
    throw new Error("TimeoutError");
  }) as never;
  assert.equal((await edgeLimit(request, { required: true, onVercel: true, check: broken }))?.status, 503);
  assert.equal(await edgeLimit(request, { required: false, onVercel: true, check: broken }), null);
});
