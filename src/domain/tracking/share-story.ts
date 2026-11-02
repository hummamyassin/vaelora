import { durationLabel, metrics, paceLabel, type ActivityKind, type RecordedActivity } from "./activity.ts";
import { gpsElevationGain } from "./elevation.ts";
import { privateRoute } from "./share.ts";

/** Story export size: 9:16 at 1080 × 1920. */
export const STORY = { width: 1080, height: 1920 } as const;
export const storyPositions = ["upper-left", "upper-center", "upper-right", "lower-left", "lower-right"] as const;
export type StoryPosition = (typeof storyPositions)[number];

/**
 * Route light by activity. Running is luminous platinum, walking luminous
 * olive; both keep a bright core, a metallic body, a soft glow and a halo.
 * The V and the figures stay white/platinum for every activity.
 */
export const storyPalettes = {
  running: { name: "platinum", core: "#ffffff", body: "#d3d8df", deep: "#8e96a3", glow: "rgba(214,222,235,0.55)", halo: "rgba(190,200,215,0.22)", icon: "#e3e7ec" },
  walking: { name: "olive", core: "#effadf", body: "#a6d46e", deep: "#4f6b2a", glow: "rgba(150,205,95,0.5)", halo: "rgba(110,160,60,0.22)", icon: "#b9e08c" },
} as const satisfies Record<ActivityKind, Record<string, string>>;

/** "33:49" under an hour, "1:42:10" beyond; never a zero-padded hour. */
export function compactDuration(ms: number) {
  const [h, m, s] = durationLabel(ms).split(":");
  return +h ? `${+h}:${m}:${s}` : `${+m}:${s}`;
}

/**
 * Everything the story image draws, and nothing more: the privacy-trimmed
 * route as unit-box paths with its true aspect ratio, and compact figures.
 * No coordinates, place names, dates or activity words leave this model.
 */
export function storyModel(a: RecordedActivity) {
  const paths = privateRoute(a.points);
  const all = paths.flat();
  let route: { paths: number[][][]; aspect: number } | null = null;
  if (all.length >= 2) {
    const lat = all.reduce((s, p) => s + p.latitude, 0) / all.length,
      k = Math.cos((lat * Math.PI) / 180);
    const xs = all.map((p) => p.longitude * k),
      ys = all.map((p) => -p.latitude);
    const minX = Math.min(...xs),
      minY = Math.min(...ys),
      w = Math.max(...xs) - minX,
      h = Math.max(...ys) - minY,
      span = Math.max(w, h);
    // Shape is preserved: one scale on both axes; a near-straight line stays thin.
    if (span > 0.00002)
      route = {
        aspect: Math.max(w, span * 0.02) / Math.max(h, span * 0.02),
        paths: paths.map((path) => path.map((p) => [(p.longitude * k - minX) / span, (-p.latitude - minY) / span])),
      };
  }
  const valid = a.points.length >= 2 && a.distanceM >= 50;
  const pace = valid ? paceLabel(metrics(a).averagePaceSeconds) : "—";
  return {
    activity: a.activity,
    palette: storyPalettes[a.activity],
    route,
    distance: (a.distanceM / 1000).toFixed(2),
    duration: compactDuration(a.activeMs),
    pace: pace === "—" ? null : `${pace}/km`,
    // Shown only when the phone reported altitude for most of the route.
    elevationM: gpsElevationGain(a.points),
  };
}
export type StoryModel = ReturnType<typeof storyModel>;

/** Instagram and WhatsApp cover the top and bottom of a story with their own UI. */
export const storySafe = { top: 250, bottom: 330, side: 80 } as const;
const base = { width: 560, routeHeight: 380, icon: 52, distance: 128, unit: 52, metrics: 38, mark: 76 } as const;

/**
 * Where each part of the overlay goes on the 1080 × 1920 canvas. Pure, so
 * preview and export share it and tests can check every position and size.
 */
export function storyLayout(model: StoryModel, position: StoryPosition, scale = 1) {
  const s = Math.max(0.75, Math.min(1.25, scale));
  const width = base.width * s,
    routeMax = { w: width, h: base.routeHeight * s };
  let route: { x: number; y: number; w: number; h: number } | null = null;
  if (model.route) {
    const aspect = model.route.aspect;
    const w = aspect >= routeMax.w / routeMax.h ? routeMax.w : routeMax.h * aspect;
    const h = aspect >= routeMax.w / routeMax.h ? routeMax.w / aspect : routeMax.h;
    route = { x: 0, y: 0, w, h: Math.max(h, 24 * s) };
  }
  const routeBlock = route ? route.h + 28 * s : 0;
  const distanceBaseline = routeBlock + base.distance * s * 0.82;
  const metricsBaseline = distanceBaseline + 34 * s + base.metrics * s;
  const markTop = metricsBaseline + 30 * s;
  const height = markTop + base.mark * s;
  const align = position.endsWith("left") ? "left" : position.endsWith("right") ? "right" : "center";
  const x =
    align === "left" ? storySafe.side : align === "right" ? STORY.width - storySafe.side - width : (STORY.width - width) / 2;
  const y = position.startsWith("upper") ? storySafe.top : STORY.height - storySafe.bottom - height;
  if (route) {
    // The route sits on the overlay's own alignment edge; the icon rides its upper corner.
    route.x = align === "left" ? x : align === "right" ? x + width - route.w : x + (width - route.w) / 2;
    route.y = y;
  }
  return {
    scale: s,
    align,
    box: { x, y, width, height },
    route,
    icon: { size: base.icon * s },
    distance: { baseline: y + distanceBaseline, size: base.distance * s, unit: base.unit * s },
    metrics: { baseline: y + metricsBaseline, size: base.metrics * s },
    mark: { top: y + markTop, height: base.mark * s },
  } as const;
}
export type StoryLayout = ReturnType<typeof storyLayout>;
