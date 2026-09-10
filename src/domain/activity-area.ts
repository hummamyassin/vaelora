export type Activity = "running" | "walking";
export type Terrain = "flat" | "rolling" | "hilly" | "unknown";
export type Surface = "paved" | "track" | "gravel" | "dirt" | "unknown";
export type Environment = "park" | "urban" | "woodland" | "open-space" | "unknown";
export type ActivityFit = "suitable" | "limited" | "unsuitable" | "unknown";

export interface EvidenceReference {
  url: string;
  note: string;
}

/** An activity area, not a route geometry or a weather-grid cell. */
export interface ActivityArea {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  district: string;
  supportedActivities: readonly Activity[];
  environment: Environment;
  terrain: Terrain;
  surfaces: readonly Surface[];
  suitability: Readonly<Record<Activity, ActivityFit>>;
  verificationStatus: "unverified" | "supported" | "verified";
  evidence: readonly EvidenceReference[];
  description: string;
}
