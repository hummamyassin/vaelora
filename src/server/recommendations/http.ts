import { InvalidRecommendationRequest } from "./request.ts";
import type { createRecommendationPipeline } from "./pipeline.ts";
import { BodyError, checkJsonRequest, createRequestBudget, privateHeaders, publicError, readJson } from "../http-security.ts";

/** Bounded JSON body; provider details/stack traces never become public errors. */
export function createRecommendationHandler(run: ReturnType<typeof createRecommendationPipeline>) {
  const budget = createRequestBudget({ perMinute: 120, perClient: 30, concurrent: 6 });
  return async (request: Request): Promise<Response> => {
    const headers = privateHeaders;
    const rejected = checkJsonRequest(request);
    if (rejected) return rejected;
    const release = budget(request);
    if (release instanceof Response) return release;
    try {
      const input = await readJson(request);
      const result = await run(input);
      return Response.json(result, { status: result.status === "weather-unavailable" ? 503 : 200, headers });
    } catch (error) {
      if (error instanceof BodyError) return publicError(error.message, error.status);
      return Response.json({ error: error instanceof InvalidRecommendationRequest ? error.message : "Recommendation service unavailable" }, { status: error instanceof InvalidRecommendationRequest ? 400 : 500, headers });
    } finally { release(); }
  };
}
