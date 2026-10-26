import { useId } from "react";

export type ScoreTone = "good" | "fair" | "poor" | "unknown";
/** Score bands used everywhere a VAELORA Score is drawn. */
export const scoreTone = (score: number | null): ScoreTone =>
  score == null ? "unknown" : score >= 80 ? "good" : score >= 60 ? "fair" : "poor";

const R = 42,
  C = 2 * Math.PI * R,
  SLOT = 36,
  GAP = 4;
const dash = `${(C * (SLOT - GAP)) / 360} ${(C * GAP) / 360}`;
// Start half a gap past twelve o'clock so the ten segments sit symmetrically.
const offset = (C * (SLOT - GAP / 2)) / 360;
const stroke = { sm: 11, md: 9, lg: 8 } as const;

/**
 * The VAELORA Score as ten segments, one per ten points. A mask reveals the lit
 * arc, so a partial segment shows the remainder honestly. The number stays in
 * the centre; the ring never replaces it.
 */
export function ScoreRing({
  score,
  label,
  size = "md",
  max = false,
  tone,
}: {
  score: number | null;
  label: string;
  size?: keyof typeof stroke;
  /** Show "/100" under the figure. */
  max?: boolean;
  tone?: ScoreTone;
}) {
  const id = useId().replace(/:/g, "");
  const value = score == null ? 0 : Math.max(0, Math.min(100, score));
  const w = stroke[size];
  return (
    <span className="score-ring" data-size={size} data-tone={tone ?? scoreTone(score)} role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <defs>
          <mask id={`${id}-lit`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
            <circle
              className="score-ring-mask"
              cx="50"
              cy="50"
              r={R}
              fill="none"
              strokeWidth={w + 6}
              strokeDasharray={`${C} ${C}`}
              style={{ strokeDashoffset: C - (value / 100) * C, "--ring-c": C } as React.CSSProperties}
            />
          </mask>
        </defs>
        <circle
          className="score-ring-track"
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth={w}
          strokeDasharray={dash}
          strokeDashoffset={offset}
        />
        <circle
          className="score-ring-fill"
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth={w}
          strokeDasharray={dash}
          strokeDashoffset={offset}
          mask={`url(#${id}-lit)`}
        />
      </svg>
      <span className="score-ring-value" aria-hidden="true">
        <b className="num">{score ?? "–"}</b>
        {max && <small>/100</small>}
      </span>
    </span>
  );
}

/**
 * A continuous progress ring for real quantities with a known whole, such as
 * elapsed time against the planned minutes or active days in the week.
 */
export function ProgressRing({
  value,
  label,
  className = "",
  children,
}: {
  /** 0 to 1. */
  value: number;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const p = Math.max(0, Math.min(1, value));
  return (
    <span className={`progress-ring ${className}`} role={label ? "img" : undefined} aria-label={label}>
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <circle className="progress-ring-track" cx="50" cy="50" r={R} fill="none" />
        <circle
          className="progress-ring-fill"
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeDasharray={`${C} ${C}`}
          style={{ strokeDashoffset: C - p * C, "--ring-c": C } as React.CSSProperties}
          data-empty={p === 0 || undefined}
        />
      </svg>
      {children}
    </span>
  );
}
