import { createOutdoorAgent } from "../../../server/ai/agent.ts";
import { createAgentHandler } from "../../../server/ai/http.ts";
import { configuredModel } from "../../../server/ai/openai.ts";
import { createRecommendationPipeline } from "../../../server/recommendations/pipeline.ts";

export const runtime = "nodejs";
const run = createRecommendationPipeline();
export const POST = createAgentHandler(() => {
  const model = configuredModel();
  return model ? createOutdoorAgent({ model, run }) : null;
});
