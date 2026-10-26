/* eslint-disable @next/next/no-img-element -- tiny static brand asset, no optimisation needed */

/**
 * The VAELORA app icon (ribbon V over the stitch band), cropped from the
 * identity sheet's artwork. Never redrawn; decorative next to the wordmark.
 */
export function BrandMark({ size = 30, className = "wordmark-mark" }: { size?: number; className?: string }) {
  return <img className={className} src="/brand/mark.png" width={size} height={size} alt="" aria-hidden="true" />;
}
