import { createPlanningHandler, createPlanningPipeline } from "../../../server/recommendations/planning";
export const runtime="nodejs";
export const POST=createPlanningHandler(createPlanningPipeline());
