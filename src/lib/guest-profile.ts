import type { RecordedActivity } from "../domain/tracking/activity.ts";
export const profileKey = "vaelora:guest-profile";
export interface GuestProfile {
  version: 1;
  name: string;
  activity: "walking" | "running";
  minutes: 30 | 60 | 90;
  locale: "en" | "ar";
  theme: "system" | "light" | "dark";
  onboarding: boolean;
}
export const defaultProfile: GuestProfile = {
  version: 1,
  name: "",
  activity: "walking",
  minutes: 60,
  locale: "en",
  theme: "system",
  onboarding: false,
};
export function parseProfile(value: unknown): GuestProfile {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid profile");
  const p = value as GuestProfile;
  if (
    p.version !== 1 ||
    typeof p.name !== "string" ||
    p.name.length > 40 ||
    /[\p{Cc}\p{Cf}]/u.test(p.name) ||
    !["walking", "running"].includes(p.activity) ||
    ![30, 60, 90].includes(p.minutes) ||
    !["en", "ar"].includes(p.locale) ||
    !["system", "light", "dark"].includes(p.theme) ||
    typeof p.onboarding !== "boolean"
  )
    throw new Error("Invalid profile");
  return {
    version: 1,
    name: p.name.trim(),
    activity: p.activity,
    minutes: p.minutes,
    locale: p.locale,
    theme: p.theme,
    onboarding: p.onboarding,
  };
}
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => Array.from(s)[0])
      .join("")
      .toLocaleUpperCase() || "V"
  );
}
export function activityTotals(
  activities: readonly RecordedActivity[],
  kind?: "walking" | "running",
) {
  const rows = activities.filter(
    (a) => a.state === "finished" && (!kind || a.activity === kind),
  );
  const distanceM = rows.reduce((s, a) => s + a.distanceM, 0),
    activeMs = rows.reduce((s, a) => s + a.activeMs, 0);
  return {
    count: rows.length,
    distanceM,
    activeMs,
    paceSeconds:
      kind && distanceM >= 50 && activeMs > 0 ? activeMs / distanceM : null,
  };
}
export const preferenceKeys = [
  profileKey,
  "vaelora:locale",
  "vaelora:activity",
  "vaelora:area",
];
export function clearPreferences(storage: Pick<Storage, "removeItem">) {
  for (const key of preferenceKeys) storage.removeItem(key);
}
export function clearAppPreferences(storage: Pick<Storage, "removeItem">) {
  clearPreferences(storage);
  storage.removeItem("vaelora:saved-areas");
}
