import type { ActivityArea } from "./activity-area.ts";

/**
 * How much VAELORA stands behind a location:
 * - reviewed: researched and approved by VAELORA (docs/research/activity-areas)
 * - open-data: built from open/public sources (OpenStreetMap, RSCN, Wikidata),
 *   not field-reviewed; unknown attributes stay unknown
 * Dynamic search/GPS locations are not places at all: they are forecast cells
 * (src/lib/dynamic-location.ts) and never appear in this dataset.
 */
export type PlaceTier = "reviewed" | "open-data";
/** A place to move around in, or a mapped trail with a line. */
export type PlaceKind = "place" | "trail";
/** "line": mapped one way; whether people return the same way is not recorded. */
export type RouteShape = "loop" | "out-and-back" | "point-to-point" | "line";
export type Difficulty = "easy" | "moderate" | "hard";

export interface Localized {
  en: string;
  ar: string;
}
export interface PlaceRoute {
  shape: RouteShape;
  /** Key into src/data/route-summaries.ts and public/routes/<id>.json. */
  summaryId: string;
  from?: Localized;
  to?: Localized;
}
export interface OutdoorPlace extends ActivityArea {
  tier: PlaceTier;
  kind: PlaceKind;
  /** Governorate id from src/lib/jordan.ts; validated against the coordinate. */
  governorate: string;
  locality: Localized;
  /** Inline Arabic for open-data places; reviewed places use area-translations. */
  ar: { name: string; description: string } | null;
  route: PlaceRoute | null;
  /** Access or conditions notes worth knowing before going. */
  caveats: readonly Localized[];
  lastReviewed: string;
}
