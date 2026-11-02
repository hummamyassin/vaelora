import { placeById } from "../data/outdoor-places.ts";

/** Places the user wants to try, by curated place ID. Local to this device. */
export const savedPlacesKey = "vaelora:saved-places";
const limit = 50;
export const savedPlacesEvent = "vaelora:saved-places";

/** Strict parse: unknown IDs, duplicates and malformed storage are dropped. */
export function parseSavedPlaces(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && placeById(id) !== null))].slice(0, limit);
}
export function loadSavedPlaces(storage: Pick<Storage, "getItem"> = localStorage): string[] {
  try {
    return parseSavedPlaces(JSON.parse(storage.getItem(savedPlacesKey) ?? "[]"));
  } catch {
    return [];
  }
}
/** Adds or removes a place; returns the new list. Storage failures keep the session list. */
export function toggleSavedPlace(id: string, current: readonly string[], storage: Pick<Storage, "setItem"> = localStorage) {
  const next = current.includes(id) ? current.filter((x) => x !== id) : parseSavedPlaces([id, ...current]);
  try {
    storage.setItem(savedPlacesKey, JSON.stringify(next));
  } catch {
    /* Saving is best-effort without storage. */
  }
  if (typeof dispatchEvent === "function") dispatchEvent(new Event(savedPlacesEvent));
  return next;
}
