# Pre-deployment security audit

## V2.3 privacy amendment

Dynamic Home sends a coarse 0.02-degree cell ID to deterministic weather services;
precise GPS remains in browser memory/local activity storage. Submitted search
text goes through the server to Photon, with bounded responses, caching and rate
limits. Provider text is rendered as React text, never HTML. Dynamic cells and
routes never enter the AI payload. Maps still request OSM tiles for the viewed
region. Share images trim all start/end-zone crossings locally, contain no raw
coordinates, and do not alter original history. GPX retains explicit confirmation.
See [V2.3 details and limitations](v23.md). Public geocoder traffic requires
deployment-wide limits/provider review before scaling. No deployment performed.

## Readiness

READY WITH NOTES for a small public portfolio. Do not enable public AI until the edge rule below is published and verified. No deployment or external infrastructure configuration was performed by this audit.

## Public AI activation and abuse protection

Vercel Firewall is the primary distributed request protection; application memory is **not** a shared quota. In Vercel Project → Firewall → Configure, create a fixed-window rate-limit rule for the Ask VAELORA API path `/api/agent` (include its trailing-slash form), across production and preview hostnames. Count by source IP, allow 10 requests per 60 seconds, and enforce the 429 action, not Log. Publish the rule. Review plan limits before enabling it. Hobby currently includes one rate-limit rule; counters are regional, not a global financial cap.

Leave the server-side `VAELORA_AI_PUBLIC_ENABLED` activation switch disabled until this configuration is complete. The Vercel handler fails closed before accessing the provider unless explicitly enabled. This is an operator activation interlock, not automatic proof that the firewall remains configured. Re-disable AI if the rule is removed or abuse occurs. Use protected previews, inspect firewall events, and verify a burst is rejected **at the edge** before exposing live AI. Configure provider usage limits and Vercel spend controls available on your account; never assume per-IP limits stop distributed bots or cap spending.

Secondary application protection: AI allows 10 accepted requests/client/minute, 30/instance/minute and two simultaneous requests. Recommendations allow 30/client/minute, 120/instance/minute and six simultaneous requests. Limits reset with instances; no reliability claim is made across instances. Only Vercel-normalized forwarded addresses are used, hashed and held in bounded memory; expired buckets are cleared on the next request. Non-Vercel local requests share a bucket. No IP, prompt, coordinate or credential is logged or persisted by this code. Rate-limit responses use 429, Retry-After and no-store. Schema-valid requests can make at most two model calls, with existing token/time limits and no retry loop.

Deterministic recommendations do not depend on AI activation or credentials. If AI is disabled or unavailable, the existing bilingual UI directs the user to the manual planner. No authentication, paid service, Redis or new agent was added.

## Environment and hosting

Required server-side variable names for Groq: `GROQ_API_KEY`, `VAELORA_AI_PROVIDER`, `VAELORA_AI_MODEL`. Public activation uses `VAELORA_AI_PUBLIC_ENABLED`. Vercel supplies `VERCEL`; do not spoof it or expose credentials through NEXT_PUBLIC variables. The optional alternative adapter uses `OPENAI_API_KEY`; it is not required for Groq. Keep preview and production configuration separate.

Use Next.js framework detection, the committed lockfile, and a supported Node runtime compatible with the installed Next.js version. Production build uses the existing configuration; Windows validation uses `next build --webpack` to preserve the documented CSS-worker workaround. The homepage is static and public API POST routes execute on Node at request time. Credential lookup occurs only during agent requests, not static generation; `.env.local` is not needed in Git or in a deployment artifact.

Vercel must serve HTTPS. Verify its HTTPS redirect and HSTS on the actual deployment domain; localhost intentionally does not set HTTPS-upgrade/HSTS directives. A local production test cannot certify hosted TLS, firewall rules, regional behavior or provider account limits.

## HTTP, grounding and privacy findings

- Both public endpoints now enforce POST, exact JSON MIME type, same-origin browser requests, an 8 KiB actual-stream limit and a five-second body-read deadline. Existing strict schema validation rejects unknown fields; AI prompts are capped at 2,000 characters. Errors are fixed public messages, not raw exceptions.
- Origin checks are browser defense in depth, not bot authentication. Non-browser clients can spoof headers. Infrastructure request floods must be handled at the edge.
- AI input is a user message, tools have closed schemas, only real deterministic results are rendered, and presentation IDs must exactly match authoritative Top Matches. No arbitrary model prose is displayed, no generic chat/tool/URL execution is available, and prompts never receive credentials. Offline injection coverage does not prove perfect future model intent extraction.
- Application UI uses React text rendering, not user-controlled HTML. Map attribution HTML is static developer-owned text with fixed HTTPS links. No open redirects or user-controlled upstream hosts were found. Existing photo/evidence external links use rel protection.
- Geolocation is requested through explicit browser actions, with graceful denial/manual-reference fallback. It is held in React memory, not persisted, logged, or included in either API payload. User-typed text is still transmitted to the selected AI provider; a bilingual warning now discourages personal/sensitive information. OSM receives ordinary browser IP/referrer/tile requests, not the geolocation API result. Browser preferences/favorite IDs are stored locally; there is no background location watch.
- Weather responses deliberately retain public activity-area coordinates, forecast-grid metadata and provenance. These are not user coordinates or secret provider diagnostics. Raw provider exceptions and filesystem paths are not returned.

## Headers and external services

CSP restricts resources to same origin plus the actual OSM tile host. Blob workers/images support MapLibre. Static App Router hydration requires inline scripts; inline styles remain for Next/Image and maps. Production does not allow eval or third-party script hosts. This is a compatible baseline CSP, not a strict nonce-based XSS guarantee; a nonce migration would change rendering architecture and is outside this hardening pass.

Other headers: nosniff, strict-origin-when-cross-origin referrers, frame denial in CSP and X-Frame-Options, same-origin-only geolocation, camera/microphone disabled, and no X-Powered-By. AI/weather requests are server-side and need no browser connect-src permission. Photos are optimized local WebP assets with existing attribution. OSM license attribution now stays visible and linked, including mobile; tile referrers and browser caching remain enabled. Public OSM tiles are best-effort and unsuitable for unbounded traffic. Reassess weather/tile terms before commercial use or increased traffic.

## Repository review and audit limits

The exact configured-secret and common credential-pattern scan found no matches across tracked files, 151 reachable historical blobs in the final scan, and 28 production client assets. `.env.local` is ignored and untracked; no NEXT_PUBLIC secret usage or application secret logging was found. This is a bounded review, not proof about unreachable Git objects, deleted remote forks, external logs, or every possible credential format. Tracked weather/evaluation JSON files are intentional reproducible research, not personal tracking data. Photos and licensing records are intentional public assets. Local `.agents/`, AGENTS.md changes and ignored Playwright artifacts are preserved outside this commit.

Both npm production-only and full dependency audits reported zero known vulnerabilities at audit time. No dependency upgrades were necessary. Re-run the registry audit immediately before deployment because advisories change.

## Final validation

- Dataset validation passed: 35 researched, 11 production (3 supported, 8 verified).
- All 87 repository tests passed, including eight added security cases; existing tests were not weakened.
- All 28 AI offline replays passed. These test contracts and orchestration, not live model extraction accuracy.
- TypeScript, ESLint and production Webpack build passed.
- Playwright against `next start`: English/Arabic at 1440×1000 and 390×844, RTL/LTR, real running/walking recommendations, card/marker pointer and keyboard synchronization, hourly conditions, all existing photos/fallback rendering, geolocation permission denial/manual fallback, and reduced motion passed. No horizontal overflow in tested layouts. Production CSP produced no violations or application runtime errors.
- One controlled Groq browser request returned four real walking matches with validated presentation and the factual action trace. Browser request bodies contained no geolocation coordinates.
- Browser-only injected image/API/AI failures and delayed loading behaved gracefully. An impossible temperature constraint went through the real endpoint and rendered the empty state. No mocks or fabricated results were added to the product.
- Minor non-blocking browser image-preload warnings appeared during viewport changes; deliberate fault-injection requests produced expected console errors. Hosted WAF, TLS and account usage controls remain unverified until operator configuration.

## References

- [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy): static-compatible policy and nonce tradeoffs, checked with Context7 and installed Next.js documentation.
- [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting): edge configuration, regional counters and plan limits.
- [Vercel request headers](https://vercel.com/docs/headers/request-headers): platform-normalized forwarded IP.
- [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/): attribution, referrers, caching and service limits.
