import { weatherAreas } from "../data/weather-areas.ts";
export interface SavedArea {
  areaId: string;
  label: string;
}
export function parseSavedAreas(input: unknown): SavedArea[] {
  if (!Array.isArray(input) || input.length > 9)
    throw new Error("Invalid saved areas");
  const ids = new Set<string>();
  return input.map((v) => {
    if (
      !v ||
      typeof v !== "object" ||
      Object.keys(v).some((k) => !["areaId", "label"].includes(k)) ||
      !weatherAreas.some((a) => a.id === v.areaId) ||
      ids.has(v.areaId) ||
      typeof v.label !== "string" ||
      !v.label.trim() ||
      v.label.length > 40
    )
      throw new Error("Invalid saved area");
    ids.add(v.areaId);
    return { areaId: v.areaId, label: v.label.trim() };
  });
}
