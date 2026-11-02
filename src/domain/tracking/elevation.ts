import type { GPSPoint } from "./activity.ts";

/**
 * Climb from GPS altitude, or null when the device did not report enough of
 * it. Phone altitude is noisy, so each segment is median-smoothed and only
 * rises of 4 m or more after a turn count. Never estimated from a map.
 */
export function gpsElevationGain(points: readonly GPSPoint[]): number | null {
  const withAltitude = points.filter((p) => typeof p.altitude === "number" && Number.isFinite(p.altitude));
  if (withAltitude.length < 20 || withAltitude.length < points.length * 0.7) return null;
  let gain = 0;
  const segments = new Map<number, number[]>();
  for (const p of withAltitude) segments.set(p.segment, [...(segments.get(p.segment) ?? []), p.altitude as number]);
  for (const heights of segments.values()) {
    const smooth = heights.map((_, i) => {
      const window = heights.slice(Math.max(0, i - 2), i + 3).sort((a, b) => a - b);
      return window[Math.floor(window.length / 2)];
    });
    let low = smooth[0],
      high = smooth[0],
      rising = true;
    for (const h of smooth.slice(1)) {
      if (rising) {
        if (h > high) high = h;
        else if (high - h >= 4) {
          gain += high - low;
          rising = false;
          low = h;
        }
      } else if (h < low) low = h;
      else if (h - low >= 4) {
        rising = true;
        high = h;
      }
    }
    if (rising && high - low >= 4) gain += high - low;
  }
  return Math.round(gain);
}
