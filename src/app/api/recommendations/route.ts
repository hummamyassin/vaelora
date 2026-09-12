import { createRecommendationPipeline } from "../../../server/recommendations/pipeline.ts";
import { createRecommendationHandler } from "../../../server/recommendations/http.ts";

export const runtime = "nodejs";
export const POST = createRecommendationHandler(createRecommendationPipeline());
