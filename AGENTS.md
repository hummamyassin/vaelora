# Repository Guidelines

## Product Scope

VAELORA is a Jordan-wide outdoor fitness platform: a bilingual (English/Arabic) web app and installable PWA. It helps people decide when and where to walk, run or hike, records the activity, explains the result and shares it beautifully. The core is weather-aware decisions and outdoor movement, not a generic weather dashboard or places map.

Core loop: **Plan → Discover → Track → Analyze → Share → Return.**

VAELORA combines Jordan-wide discovery, weather intelligence, the VAELORA Score and Best Window, route and place discovery, GPS activity tracking, activity analysis, local-first history, privacy-aware sharing and Ask VAELORA. Activities: walking, running, and hiking or outdoor routes where real route data supports them. Forecasts cover today and tomorrow, with a short outlook.

### Not a tourism product

Jordan-wide coverage is not permission to add hotels, restaurants, itineraries, sightseeing guides, travel booking, attraction catalogs, tourist packages or generic travel content. Places such as Petra, Wadi Rum, Dana or Ajloun appear only as outdoor routes, walking or running areas, or hiking and outdoor activity locations. The focus stays outdoor fitness.

### Geographic coverage

Planning and discovery coverage is Jordan, defined once in `src/lib/jordan.ts`: Jordan-wide search, current location inside Jordan, weather planning and route discovery across Jordan. Never silently fall back to Amman. Outside Jordan, planning and discovery say that VAELORA currently supports Jordan. Tracking is defined separately: geographic coverage rules must never interrupt, discard or corrupt an activity in progress.

## Route & Place Data

Location data comes in three categories that must never be confused:
- **VAELORA reviewed:** researched and approved places (`docs/research/activity-areas`).
- **Open data:** built from legitimate open or public sources such as OpenStreetMap, Wikidata, RSCN or the Jordan Trail Association. Not field-checked by VAELORA.
- **Dynamic locations:** search results or GPS positions. They are forecast cells only and never gain place attributes.

Model names (English and Arabic), coordinates, governorate, locality, supported activities, environment, terrain, surfaces, walking and running suitability, tier, route shape, sources and evidence. Track provenance for every entry (`docs/jordan-places.md`). Preserve uncertainty: unknown stays unknown. Prefer real, identifiable outdoor locations over vague neighborhoods, and quality over quantity.

Never fake reviewed status. Never invent locations, evidence, route geometry, distance, elevation or difficulty. Derived figures are labelled as estimates and their method documented. Never scrape or copy proprietary AllTrails or Komoot content: no descriptions, reviews, photos, ratings, difficulty labels or route files. They may only be used as research to identify popular areas. Write VAELORA's own descriptions. `npm run validate` must pass; invalid curated data fails the build.

## Recommendation Architecture

Follow: User Intent → Location Eligibility → Activity Fit → Environmental Conditions → Best Time → Top Matches.

Parse activity, time, and preferences; filter eligible locations; retrieve hourly environmental data; calculate activity-specific suitability; find best time windows; handle near-ties; return Top Matches. Treat location characteristics and user constraints as first-class inputs alongside weather.

Keep the engine deterministic, configurable, testable, and independent from the LLM. Potential environmental inputs: temperature, apparent temperature, humidity, wind speed, precipitation probability, UV index, and AQI when reliable.

### Weather principle

Weather primarily answers **when** to go; secondarily, **where** conditions may be better. Forecasts are regional, not street- or trail-level. Never claim a route is safe, conditions are guaranteed, or weather is certain at street level. Use "good", "favorable" or "less suitable conditions".

## AI Boundaries

Use one focused Outdoor Recommendation Agent to extract structured constraints and invoke real tools. AI orchestrates; the engine calculates and ranks. AI must never invent scores, weather, or locations. Expose only a safe factual action trace: activity detected, constraints extracted, eligible locations found, weather retrieved, scores calculated, best time evaluated, and matches returned. Never expose hidden chain-of-thought.

Ask VAELORA stays grounded. It may use:
- the selected Jordan location;
- real forecast data;
- the deterministic plan;
- curated place and route data;
- a local activity summary, only where the current architecture explicitly supports it.

It must never invent route safety, terrain or surface quality, lighting, road conditions, trail existence, water availability, or access and opening status, unless grounded in real data. AI supports the fitness product; it is not the product.

## Tracking, Privacy & Sharing

- **Tracking limits:** VAELORA is a web/PWA product. Never claim reliable background GPS, screen-locked tracking, or native-grade background navigation. Keep Awake and interruption detection reduce problems but do not remove browser limits; Follow Route works only while the app is open with the screen on.
- **Device-local by default:** raw activity and GPS data, history, saved places and preferences. Only coarse forecast cells reach the server; hash routes never carry coordinates.
- **AI:** never send personal activity history, routes or share photos to the AI provider (Groq) by default.
- **Secrets:** server secrets stay server-only and never use `NEXT_PUBLIC_*`. Never commit secrets or `.env.local`.
- **Share privacy:** share photos stay on the device. Share rendering happens locally on canvas, and route privacy masking (endpoint zones) is always respected.
- **Share Studio direction:** photo-first; a transparent overlay; the real privacy-trimmed GPS route; distance as the hero metric; compact icon-and-value metrics with no text labels; the approved V mark as the only brand signature, with no wordmark and no RUN/WALK text. Running uses a luminous platinum/silver route, walking a luminous olive/green route. No large cards, opaque boxes or map tiles behind the route, no ornamental Jordanian decoration unless explicitly requested, and do not imitate Strava.

## Design Direction

VAELORA should feel like a premium, modern mobile fitness product, not a SaaS dashboard, generic website, tourism app or Strava clone.
- **Product feel:** mobile-first, glanceable metrics, outdoor readability.
- **Language:** Arabic and English parity with intentional RTL.
- **Accessibility:** contrast, semantics, focus, touch targets, reduced motion.
- **System:** extend the existing design system (`DESIGN.md`, tokens, Phosphor icons, the V asset) rather than adding a second one.

## Engineering & Validation

Stack: Next.js (App Router), React, TypeScript, Tailwind CSS, MapLibre with OpenStreetMap, Open-Meteo, Photon search, an AI provider adapter with tool calling (Groq in production), IndexedDB, a PWA service worker, automated tests, Vercel and Git/GitHub. Add Supabase/PostgreSQL only if justified. Separate UI, data access, geographic coverage, route data, discovery, recommendation logic, weather integration, maps, tracking, sharing and Canvas rendering, and AI orchestration. Test eligibility, scoring, time windows, near-ties, coverage and data validation.

Commands (also run in CI, `.github/workflows/ci.yml`):
- `npm run validate`
- `npm test`
- `npm run eval`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Browser QA against a production build:
- `npm run qa:browser`
- `node scripts/v26-jordan-qa.mjs`

Document new commands when added. Never commit secrets.

## Incremental Development & Exclusions

Proceed incrementally with logical, reviewable commits: architecture → validation → data → services → engine → interface → AI → testing → documentation. Never build everything in one pass. Work on feature branches. Never merge to `main`, deploy, change Vercel settings or production environment variables, force-push, or rewrite history without explicit approval.

Exclude unless explicitly approved:
- social feeds, followers, comments, likes, public profiles and live social sharing;
- leaderboards, challenges, subscriptions and payments;
- authentication and cloud accounts, cloud GPS sync, Supabase/Firebase migration;
- Apple Health, Health Connect, wearables and native mobile app migration;
- tourism features;
- a second AI agent, multi-turn AI memory, notifications;
- a user-uploaded GPX route database, CMS, WebSockets and unnecessary infrastructure.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- context7 -->
Use the `ctx7` CLI to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service — even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer — your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

## Steps

1. Resolve library: `npx ctx7@latest library <name> "<what to look up>"` — use the official library name with proper punctuation (e.g., "Next.js" not "nextjs", "Customer.io" not "customerio", "Three.js" not "threejs")
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question)
3. Fetch docs: `npx ctx7@latest docs <libraryId> "<what to look up>"` — run a separate `docs` command per distinct concept if the question spans multiple topics, unless it's about how they interact
4. Answer using the fetched documentation

You MUST call `library` first to get a valid ID unless the user provides one directly in `/org/project` format. Be specific about what to look up in the library's documentation — specific and detailed queries return better results than vague single words, but keep each query to a single concept unless the question is about how concepts interact; combined multi-topic queries dilute ranking and return shallow results for each topic. Do not run more than 3 commands per question. Do not include sensitive information (API keys, passwords, credentials) in queries.

For version-specific docs, use `/org/project/version` from the `library` output (e.g., `/vercel/next.js/v14.3.0`).

If a command fails with a quota error, inform the user and suggest `npx ctx7@latest login` or setting `CONTEXT7_API_KEY` env var for higher limits. Do not silently fall back to training data.
Run Context7 CLI requests outside Codex's default sandbox. If a Context7 CLI command fails with DNS or network errors such as ENOTFOUND, host resolution failures, or fetch failed, rerun it outside the sandbox instead of retrying inside the sandbox.
<!-- context7 -->
