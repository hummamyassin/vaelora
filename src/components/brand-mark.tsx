/* eslint-disable @next/next/no-img-element -- tiny static brand asset, no optimisation needed */
import { useId } from "react";

/**
 * The VAELORA app icon (ribbon V over the stitch band), cropped from the
 * identity sheet's artwork. Never redrawn; decorative next to the wordmark.
 */
export function BrandMark({ size = 30, className = "wordmark-mark" }: { size?: number; className?: string }) {
  return <img className={className} src="/brand/mark.png" width={size} height={size} alt="" aria-hidden="true" />;
}

// Platinum thread (see --metal-stitch): specular, platinum, steel, darker silver.
// On cream the thread runs one step darker so it still reads as silver.
const THREAD = {
  dark: ["#eef0f2", "#c7cbcf", "#8e949a", "#5e6268"],
  light: ["#c7cbcf", "#8e949a", "#5e6268", "#3a3d42"],
} as const;

/**
 * Cross-stitch band from the icon, embroidered in platinum metal thread: a
 * zig-zag row over two straight rows. Each cross has a restrained drop shade,
 * a top-lit metal stroke and a pale reflective edge. `line` keeps only the
 * first row as a quiet divider. Purely decorative.
 */
export function StitchBand({
  variant = "full",
  tone = "dark",
  className = "",
}: {
  variant?: "full" | "line";
  tone?: "dark" | "light";
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const rows = variant === "full" ? 3 : 1;
  const h = rows === 3 ? 34 : 12;
  const thread = THREAD[tone];
  // Lower rows sit a little further from the light, so the band has depth.
  const cross = (x: number, y: number, depth = 1) => {
    const d = `M${x - 4} ${y - 4}L${x + 4} ${y + 4}M${x + 4} ${y - 4}L${x - 4} ${y + 4}`;
    return (
      <g key={`${x}-${y}`} strokeLinecap="round" opacity={depth}>
        <path d={d} transform="translate(0 0.8)" stroke={tone === "dark" ? "rgb(0 0 0 / 0.55)" : "rgb(28 29 32 / 0.16)"} strokeWidth="2.1" />
        <path d={d} stroke={`url(#${id}-thread)`} strokeWidth="2.1" />
        <path d={d} transform="translate(0 -0.45)" stroke="rgb(255 255 255 / 0.32)" strokeWidth="0.7" />
      </g>
    );
  };
  return (
    <svg className={`stitch-band ${className}`} data-variant={variant} height={h} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-thread`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor={thread[0]} />
          <stop offset="0.3" stopColor={thread[1]} />
          <stop offset="0.66" stopColor={thread[2]} />
          <stop offset="1" stopColor={thread[3]} />
        </linearGradient>
        <pattern id={id} width="26" height={h} patternUnits="userSpaceOnUse">
          {cross(6.5, rows === 3 ? 8.5 : 7)}
          {cross(19.5, 5)}
          {rows === 3 && [cross(6.5, 17.5, 0.8), cross(19.5, 17.5, 0.8), cross(6.5, 27.5, 0.62), cross(19.5, 27.5, 0.62)]}
        </pattern>
      </defs>
      <rect width="100%" height={h} fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * VAELORA Score as a crafted meter: ten stitches, one per ten points, lit in the
 * condition colour. The number stays beside it; the meter never replaces it.
 */
export function StitchMeter({ score, label }: { score: number | null; label: string }) {
  const lit = score == null ? 0 : Math.round(score / 10);
  const tone = score == null ? "unknown" : score >= 80 ? "good" : score >= 60 ? "fair" : "poor";
  return (
    <span className="stitch-meter" data-tone={tone} role="img" aria-label={label}>
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} data-on={i < lit || undefined} />
      ))}
    </span>
  );
}
