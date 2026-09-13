import { createHash } from "node:crypto";

export const privateHeaders = { "Cache-Control": "no-store" };
export function publicError(error: string, status: number, extra: Record<string, string> = {}) {
  return Response.json({ error }, { status, headers: { ...privateHeaders, ...extra } });
}

/** Browser-origin check is defense in depth, not authentication or bot protection. */
export function checkJsonRequest(request: Request): Response | null {
  if (request.method !== "POST") return publicError("Method not allowed", 405, { Allow: "POST" });
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) return publicError("Cross-origin request rejected", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return publicError("Expected application/json", 415);
  return null;
}

export class BodyError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
/** Bound actual streamed bytes and total read time, not just Content-Length. */
export async function readJson(request: Request, timeoutMs = 5000): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > 8192) throw new BodyError("Request body too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new BodyError("Missing request body", 400);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const decoder = new TextDecoder();
        let length = 0, body = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > 8192) throw new BodyError("Request body too large", 413);
          body += decoder.decode(value, { stream: true });
        }
        body += decoder.decode();
        try { return JSON.parse(body); } catch { throw new BodyError("Invalid JSON", 400); }
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new BodyError("Request body timed out", 408)), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
    // Do not wait on a hostile stream's cancellation hook.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Per-instance safety net only. Vercel edge rate limiting is required before public AI activation. */
export function createRequestBudget(options: { perMinute: number; perClient: number; concurrent: number; clock?: () => number }) {
  let reset = 0, count = 0, active = 0;
  const clients = new Map<string, number>();
  return (request: Request): Response | (() => void) => {
    const now = (options.clock ?? Date.now)();
    if (now >= reset) { reset = now + 60000; count = 0; clients.clear(); }
    // Only trust the platform-normalized header on Vercel, not arbitrary proxy headers elsewhere.
    const address = process.env.VERCEL === "1" ? request.headers.get("x-forwarded-for")?.split(",")[0].trim().slice(0, 64) : undefined;
    const key = address ? createHash("sha256").update(address).digest("hex") : "local";
    const used = clients.get(key) ?? 0;
    if (count >= options.perMinute || used >= options.perClient || active >= options.concurrent) return publicError("Too many requests. Please try again shortly.", 429, { "Retry-After": String(Math.max(1, Math.ceil((reset - now) / 1000))) });
    count++; clients.set(key, used + 1); active++;
    let released = false;
    return () => { if (!released) { released = true; active--; } };
  };
}
