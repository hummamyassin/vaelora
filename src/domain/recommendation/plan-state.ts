export type PlanningState =
  | "recommended"
  | "checking"
  | "no-window"
  | "weather-unavailable"
  | "location-unavailable";

export function planningState({
  hasLocation,
  loading,
  failed,
  status,
}: {
  hasLocation: boolean;
  loading: boolean;
  failed: boolean;
  status?: string;
}): PlanningState {
  if (!hasLocation) return "location-unavailable";
  if (loading) return "checking";
  if (failed || !status || status === "insufficient")
    return "weather-unavailable";
  if (status === "now" || status === "later") return "recommended";
  return "no-window";
}
