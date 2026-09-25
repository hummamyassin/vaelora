import {
  durationLabel,
  metrics,
  paceLabel,
  type GPSPoint,
  type RecordedActivity,
} from "./activity.ts";
import { distanceKm } from "../../lib/geography.ts";
export type ShareTemplate = "map" | "performance" | "minimal";
const metres = (a: GPSPoint, b: GPSPoint) => distanceKm(a, b) * 1000;
/** Remove whole edges intersecting either privacy zone, including later visits and paused segments. */
export function privateRoute(
  points: readonly GPSPoint[],
  radiusM = 300,
): GPSPoint[][] {
  if (!Number.isFinite(radiusM) || radiusM < 100)
    throw new Error("Privacy radius too small");
  if (points.length < 2) return [];
  const anchors = [points[0], points[points.length - 1]],
    paths: GPSPoint[][] = [];
  const intersects = (a: GPSPoint, b: GPSPoint, c: GPSPoint) => {
    const scale = Math.cos((c.latitude * Math.PI) / 180),
      xy = (p: GPSPoint) => [
        (p.longitude - c.longitude) * 111195 * scale,
        (p.latitude - c.latitude) * 111195,
      ];
    const [ax, ay] = xy(a),
      [bx, by] = xy(b),
      dx = bx - ax,
      dy = by - ay;
    const t = Math.max(
      0,
      Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)),
    );
    return Math.hypot(ax + t * dx, ay + t * dy) <= radiusM + 5;
  };
  let path: GPSPoint[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    const hidden =
      a.segment !== b.segment ||
      anchors.some(
        (c) =>
          metres(a, c) <= radiusM + 5 ||
          metres(b, c) <= radiusM + 5 ||
          intersects(a, b, c),
      );
    if (hidden) {
      if (path.length > 1) paths.push(path);
      path = [];
    } else {
      if (!path.length) path.push({ ...a });
      path.push({ ...b });
    }
  }
  if (path.length > 1) paths.push(path);
  return paths;
}
/** Normalized drawing data contains no geographic coordinates, names, IDs or timestamps. */
export function shareModel(
  a: RecordedActivity,
  locale: "en" | "ar",
  template: ShareTemplate,
) {
  const paths = privateRoute(a.points),
    points = paths.flat();
  let drawing: number[][][] = [];
  if (points.length) {
    const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length,
      scale = Math.cos((lat * Math.PI) / 180);
    const xs = points.map((p) => p.longitude * scale),
      ys = points.map((p) => -p.latitude),
      minX = Math.min(...xs),
      minY = Math.min(...ys),
      width = Math.max(...xs) - minX,
      height = Math.max(...ys) - minY,
      span = Math.max(width, height, 0.00001);
    drawing = paths.map((path) =>
      path.map((p) => [
        0.1 + (0.8 * (p.longitude * scale - minX + (span - width) / 2)) / span,
        0.1 + (0.8 * (-p.latitude - minY + (span - height) / 2)) / span,
      ]),
    );
  }
  const flatDrawing = drawing.flat();
  const drawingWidth = flatDrawing.length
    ? Math.max(...flatDrawing.map((p) => p[0])) - Math.min(...flatDrawing.map((p) => p[0]))
    : 0;
  const drawingHeight = flatDrawing.length
    ? Math.max(...flatDrawing.map((p) => p[1])) - Math.min(...flatDrawing.map((p) => p[1]))
    : 0;
  const routeUseful =
    flatDrawing.length >= 6 && drawingWidth >= 0.08 && drawingHeight >= 0.08;
  const valid = a.points.length >= 2 && a.distanceM >= 50;
  return {
    template,
    locale,
    route: drawing,
    routeUseful,
    activity:
      locale === "ar"
        ? a.activity === "walking"
          ? "مشي"
          : "جري"
        : a.activity === "walking"
          ? "WALK"
          : "RUN",
    distance: valid ? (a.distanceM / 1000).toFixed(2) : "—",
    duration: durationLabel(a.activeMs),
    pace: valid ? paceLabel(metrics(a).averagePaceSeconds) : "—",
    score: a.conditions?.score ?? null,
    temperature: a.conditions?.temperatureC ?? null,
  };
}
