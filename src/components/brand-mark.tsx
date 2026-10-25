/* eslint-disable @next/next/no-img-element -- tiny static brand asset, no optimisation needed */
import { useId } from "react";

/**
 * The VAELORA app icon (ribbon V over the stitch band), cropped from the
 * identity sheet's artwork. Never redrawn; decorative next to the wordmark.
 */
export function BrandMark({ size = 30, className = "wordmark-mark" }: { size?: number; className?: string }) {
  return <img className={className} src="/brand/mark.png" width={size} height={size} alt="" aria-hidden="true" />;
}

/**
 * Cross-stitch band from the icon: a cream (or ink) zig-zag row, an alternating
 * olive/terracotta row and a gold row. `line` keeps only the first row as a
 * quiet divider. Purely decorative.
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
  const first = tone === "dark" ? "var(--stitch-cream)" : "var(--brand-ink)";
  const rows = variant === "full" ? 3 : 1;
  const h = rows === 3 ? 34 : 12;
  const cross = (x: number, y: number, color: string) => (
    <path
      d={`M${x - 4} ${y - 4}L${x + 4} ${y + 4}M${x + 4} ${y - 4}L${x - 4} ${y + 4}`}
      stroke={color}
      strokeWidth="2.3"
      strokeLinecap="round"
    />
  );
  return (
    <svg className={`stitch-band ${className}`} data-variant={variant} height={h} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="26" height={h} patternUnits="userSpaceOnUse">
          {cross(6.5, rows === 3 ? 8.5 : 7, first)}
          {cross(19.5, rows === 3 ? 5 : 5, first)}
          {rows === 3 && (
            <>
              {cross(6.5, 17.5, "var(--stitch-olive)")}
              {cross(19.5, 17.5, "var(--stitch-terracotta)")}
              {cross(6.5, 27.5, "var(--stitch-gold)")}
              {cross(19.5, 27.5, "var(--stitch-gold)")}
            </>
          )}
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
