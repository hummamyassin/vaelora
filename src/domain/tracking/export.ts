import {
  validateActivity,
  type RecordedActivity,
  type GPSPoint,
} from "./activity.ts";
export function routeSegments(points: readonly GPSPoint[]) {
  const groups: GPSPoint[][] = [];
  for (const p of points) {
    if (!groups.length || groups.at(-1)!.at(-1)!.segment !== p.segment)
      groups.push([]);
    groups.at(-1)!.push(p);
  }
  return groups;
}
const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function exportGPX(
  activity: RecordedActivity,
  name = "VAELORA activity",
) {
  const a = validateActivity(activity);
  if (a.state !== "finished" || !a.points.length)
    throw new Error("A completed route is required");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="VAELORA" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${xml(name.slice(0, 160))}</name><type>${a.activity}</type>${routeSegments(
    a.points,
  )
    .map(
      (points) =>
        `<trkseg>${points.map((p) => `<trkpt lat="${p.latitude}" lon="${p.longitude}"><time>${new Date(p.timestamp).toISOString()}</time></trkpt>`).join("")}</trkseg>`,
    )
    .join("")}</trk></gpx>`;
}
