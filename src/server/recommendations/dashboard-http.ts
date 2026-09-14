import {
  BodyError,
  checkJsonRequest,
  createRequestBudget,
  privateHeaders,
  publicError,
  readJson,
} from "../http-security.ts";
import { InvalidRecommendationRequest } from "./request.ts";
import type { createDashboardPipeline } from "./dashboard.ts";
export function createDashboardHandler(
  run: ReturnType<typeof createDashboardPipeline>,
) {
  const budget = createRequestBudget({
    perMinute: 120,
    perClient: 30,
    concurrent: 6,
  });
  return async (request: Request) => {
    const rejected = checkJsonRequest(request);
    if (rejected) return rejected;
    const release = budget(request);
    if (release instanceof Response) return release;
    try {
      const result = await run(await readJson(request));
      return Response.json(result, {
        status: result.status === "weather-unavailable" ? 503 : 200,
        headers: privateHeaders,
      });
    } catch (error) {
      return error instanceof BodyError
        ? publicError(error.message, error.status)
        : publicError(
            error instanceof InvalidRecommendationRequest
              ? "Invalid dashboard request"
              : "Conditions unavailable",
            error instanceof InvalidRecommendationRequest ? 400 : 503,
          );
    } finally {
      release();
    }
  };
}
