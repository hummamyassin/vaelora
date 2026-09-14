import { createDashboardPipeline } from "../../../server/recommendations/dashboard.ts";
import { createDashboardHandler } from "../../../server/recommendations/dashboard-http.ts";
export const runtime = "nodejs";
export const POST = createDashboardHandler(createDashboardPipeline());
