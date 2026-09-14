import { createOutdoorAgent } from "../../../server/ai/agent.ts";
import { createAgentHandler } from "../../../server/ai/http.ts";
import { configuredModel } from "../../../server/ai/provider.ts";
import { createRecommendationPipeline } from "../../../server/recommendations/pipeline.ts";
import { createDashboardPipeline } from "../../../server/recommendations/dashboard.ts";

export const runtime = "nodejs";
const run = createRecommendationPipeline();
const weatherRun = createDashboardPipeline();
export const POST = createAgentHandler(() => {
  const model = configuredModel();
  return model ? createOutdoorAgent({ model, run, weatherRun }) : null;
});
