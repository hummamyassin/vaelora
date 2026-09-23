import { createDiscovery } from "../../../server/recommendations/discovery";
import { createDashboardHandler } from "../../../server/recommendations/dashboard-http";
export const runtime = "nodejs";
export const POST = createDashboardHandler(createDiscovery());
