import { checkRateLimit } from "@vercel/firewall";
import { publicError } from "./http-security.ts";

/** One Vercel Firewall rule (Rate limit ID) shared by every server route; Hobby allows one. */
export const edgeRuleId = "vaelora-api";
type Check = typeof checkRateLimit;

/**
 * Edge rate limit through the Vercel Firewall, counted per client IP across
 * regions' edges rather than per function instance. Off Vercel it is a no-op
 * and the in-memory budgets remain the only guard.
 *
 * `required` routes (AI) fail closed: without the firewall rule, or when the
 * check cannot run, they refuse. Weather and search fail open so planning
 * keeps working while the rule is being set up.
 */
export async function edgeLimit(
  request: Request,
  { required, check = checkRateLimit, onVercel = process.env.VERCEL === "1" }: { required: boolean; check?: Check; onVercel?: boolean },
): Promise<Response | null> {
  if (!onVercel) return null;
  try {
    const { rateLimited, error } = await check(edgeRuleId, { request, timeout: 1500 });
    if (rateLimited || error === "blocked")
      return publicError("Too many requests. Please try again shortly.", 429, { "Retry-After": "60" });
    if (error === "not-found" && required) return publicError("AI service unavailable", 503);
    return null;
  } catch {
    return required ? publicError("AI service unavailable", 503) : null;
  }
}
