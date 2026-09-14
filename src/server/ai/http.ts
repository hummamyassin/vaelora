import type { createOutdoorAgent } from "./agent.ts";
import { isObject } from "./intent.ts";
import { parseDashboardRequest } from "../recommendations/dashboard.ts";
import { InvalidRecommendationRequest } from "../recommendations/request.ts";
import { BodyError, checkJsonRequest, createRequestBudget, privateHeaders, publicError, readJson } from "../http-security.ts";

export function createAgentHandler(getAgent: () => ReturnType<typeof createOutdoorAgent> | null) {
  const budget = createRequestBudget({ perMinute: 30, perClient: 10, concurrent: 2 });
  return async (request: Request) => {
    const headers = privateHeaders;
    const reply = (body: unknown, status: number) => Response.json(body, { status, headers });
    const rejected = checkJsonRequest(request);
    if (rejected) return rejected;
    // Explicit deployment activation after edge protections are configured; local AI is unchanged.
    if (process.env.VERCEL === "1" && process.env.VAELORA_AI_PUBLIC_ENABLED !== "true") return publicError("AI service unavailable", 503);
    const release = budget(request);
    if (release instanceof Response) return release;
    try {
      const input = await readJson(request);
      if (!isObject(input) || Object.keys(input).some(k => !["prompt","locale","context"].includes(k)) || (input.locale !== undefined && input.locale !== "ar" && input.locale !== "en") || typeof input.prompt !== "string" || !input.prompt.trim() || input.prompt.length > 2000) return reply({ error: "Expected a nonempty prompt and optional supported locale" }, 400);
      const context = input.context === undefined ? undefined : parseDashboardRequest(input.context);
      const agent = getAgent();
      if (!agent) return reply({ error: "AI provider is not configured" }, 503);
      const result = await agent(input.prompt, input.locale === "ar" ? "ar" : "en", context);
      return reply(result, result.status === "model-error" || result.status === "service-error" || (result.status === "answered" && result.result.status === "weather-unavailable") ? 503 : result.status === "invalid-request" ? 400 : 200);
    } catch (error) { return error instanceof BodyError ? publicError(error.message, error.status) : error instanceof InvalidRecommendationRequest ? publicError("Invalid dashboard context",400) : reply({ error: "Agent service unavailable" }, 503); }
    finally { release(); }
  };
}
