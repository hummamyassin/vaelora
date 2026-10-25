/**
 * VAELORA mark: three forecast bars under a bracket, the meteogram reduced to a
 * glyph. Bars take the current text colour; the bracket takes the course ink.
 */
export function BrandMark({ className = "wordmark-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="13" width="4" height="8" rx="1" fill="currentColor" />
      <rect x="10" y="9" width="4" height="12" rx="1" fill="currentColor" />
      <rect x="17" y="11" width="4" height="10" rx="1" fill="currentColor" opacity="0.55" />
      <path
        d="M8.5 6.5V3.5h7v3"
        fill="none"
        stroke="var(--course, #9b1c3c)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
