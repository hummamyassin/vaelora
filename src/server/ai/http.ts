import type { createOutdoorAgent } from "./agent.ts";
import { isObject } from "./intent.ts";

export function createAgentHandler(getAgent: () => ReturnType<typeof createOutdoorAgent> | null) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "no-store" };
    const reply = (body: unknown, status: number) => Response.json(body, { status, headers });
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return reply({ error: "Expected application/json" }, 415);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Missing request body" }, 400);
    try {
      const decoder = new TextDecoder();
      let length = 0, body = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 8192) { await reader.cancel(); return reply({ error: "Request body too large" }, 413); }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
      let input: unknown;
      try { input = JSON.parse(body); } catch { return reply({ error: "Invalid JSON" }, 400); }
      if (!isObject(input) || Object.keys(input).length !== 1 || typeof input.prompt !== "string" || !input.prompt.trim() || input.prompt.length > 2000) return reply({ error: "Expected only a nonempty prompt of at most 2000 characters" }, 400);
      const agent = getAgent();
      if (!agent) return reply({ error: "AI provider is not configured" }, 503);
      const result = await agent(input.prompt);
      return reply(result, result.status === "model-error" || result.status === "service-error" || (result.status === "answered" && result.result.status === "weather-unavailable") ? 503 : result.status === "invalid-request" ? 400 : 200);
    } catch { return reply({ error: "Agent service unavailable" }, 503); }
    finally { reader.releaseLock(); }
  };
}
