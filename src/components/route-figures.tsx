import { numberText, type Locale } from "../lib/i18n";

export interface RouteFile {
  geometry: [number, number][];
  profile: [number, number][];
  license: string;
  source: string;
}

/** The mapped line as a north-up sketch, aspect preserved; no map tiles. */
export function RoutePreview({ geometry, label }: { geometry: [number, number][]; label: string }) {
  const lat = geometry.reduce((s, p) => s + p[1], 0) / geometry.length,
    k = Math.cos((lat * Math.PI) / 180);
  const xs = geometry.map((p) => p[0] * k),
    ys = geometry.map((p) => -p[1]);
  const minX = Math.min(...xs),
    minY = Math.min(...ys),
    w = Math.max(...xs) - minX || 1e-6,
    h = Math.max(...ys) - minY || 1e-6;
  const W = 320,
    H = 180,
    pad = 14,
    scale = Math.min((W - pad * 2) / w, (H - pad * 2) / h);
  const ox = (W - w * scale) / 2,
    oy = (H - h * scale) / 2;
  const pts = geometry.map((p, i) => [ox + (xs[i] - minX) * scale, oy + (ys[i] - minY) * scale]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const [sx, sy] = pts[0],
    [ex, ey] = pts.at(-1)!;
  return (
    <svg className="route-preview" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <path d={d} className="route-preview-glow" />
      <path d={d} className="route-preview-line" />
      <circle cx={sx} cy={sy} r="5" className="route-preview-start" />
      <circle cx={ex} cy={ey} r="5" className="route-preview-end" />
    </svg>
  );
}

/** Distance (km) against elevation (m) from the DEM samples; axis in plain numbers. */
export function ElevationProfile({ profile, locale, label }: { profile: [number, number][]; locale: Locale; label: string }) {
  const W = 320,
    H = 120,
    left = 6,
    right = 6,
    top = 10,
    bottom = 22;
  const total = profile.at(-1)![0] || 1;
  const heights = profile.map((p) => p[1]);
  const low = Math.min(...heights),
    high = Math.max(...heights),
    span = Math.max(high - low, 20);
  const x = (d: number) => left + (d / total) * (W - left - right);
  const y = (e: number) => top + (1 - (e - low) / span) * (H - top - bottom);
  const line = profile.map(([d, e], i) => `${i ? "L" : "M"}${x(d).toFixed(1)} ${y(e).toFixed(1)}`).join("");
  const area = `${line}L${x(total).toFixed(1)} ${H - bottom}L${x(0).toFixed(1)} ${H - bottom}Z`;
  const km = total / 1000;
  const ticks = [0, km / 2, km];
  return (
    <svg className="elevation-profile" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} direction="ltr">
      <path d={area} className="elevation-area" />
      <path d={line} className="elevation-line" />
      {ticks.map((t, i) => (
        <text
          key={i}
          x={x(t * 1000)}
          y={H - 6}
          textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
          className="elevation-tick num"
        >
          {numberText(locale, t, 1)} {locale === "ar" ? "كم" : "km"}
        </text>
      ))}
    </svg>
  );
}
