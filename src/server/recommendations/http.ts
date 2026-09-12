import { InvalidRecommendationRequest } from "./request.ts";
import type { createRecommendationPipeline } from "./pipeline.ts";

/** Bounded JSON body; provider details/stack traces never become public errors. */
export function createRecommendationHandler(run: ReturnType<typeof createRecommendationPipeline>) {
  return async (request: Request): Promise<Response> => {
    const headers = { "Cache-Control": "no-store" };
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return Response.json({ error: "Expected application/json" }, { status: 415, headers });
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Missing request body" }, { status: 400, headers });
    try {
      let length = 0, body = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 8192) { await reader.cancel(); return Response.json({ error: "Request body too large" }, { status: 413, headers }); }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
      let input: unknown;
      try { input = JSON.parse(body); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers }); }
      const result = await run(input);
      return Response.json(result, { status: result.status === "weather-unavailable" ? 503 : 200, headers });
    } catch (error) {
      return Response.json({ error: error instanceof InvalidRecommendationRequest ? error.message : "Recommendation service unavailable" }, { status: error instanceof InvalidRecommendationRequest ? 400 : 500, headers });
    } finally { reader.releaseLock(); }
  };
}
