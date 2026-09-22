# Repository Guidelines

## Product & V1 Scope

VAELORA is a weather-aware outdoor activity recommendation web application for Greater Amman, Jordan. Help users decide where to run or walk, when to go, which area fits their needs, and why. The core is recommendations, not a generic weather dashboard or places map. V1 supports running and walking only, with forecasts for today and tomorrow. Aim for a polished, technically credible, finishable first serious portfolio project.

## Activity-Area Data

Research approximately 30–35 candidate areas; launch only sufficiently supported or verified locations, with no mandatory count. Prefer real, identifiable outdoor activity areas over vague neighborhoods. Model names, coordinates, districts, supported activities, environment types, terrain, surfaces, running/walking suitability, verification status, and sources/evidence. Preserve uncertainty; never invent locations or evidence.

## Recommendation Architecture

Follow: User Intent → Location Eligibility → Activity Fit → Environmental Conditions → Best Time → Top Matches.

Parse activity, time, and preferences; filter eligible locations; retrieve hourly environmental data; calculate activity-specific suitability; find best time windows; handle near-ties; return Top Matches. Treat location characteristics and user constraints as first-class inputs alongside weather.

Keep the engine deterministic, configurable, testable, and independent from the LLM. Potential environmental inputs: temperature, apparent temperature, humidity, wind speed, precipitation probability, UV index, and AQI when reliable.

## AI Boundaries

Use one focused Outdoor Recommendation Agent to extract structured constraints and invoke real tools. AI orchestrates; the engine calculates and ranks. AI must never invent scores, weather, or locations. Expose only a safe factual action trace: activity detected, constraints extracted, eligible locations found, weather retrieved, scores calculated, best time evaluated, and matches returned. Never expose hidden chain-of-thought.

## Engineering & Validation

Intended stack: Next.js, TypeScript, Tailwind CSS, MapLibre with OpenStreetMap, a weather API (initially evaluating Open-Meteo), an AI API with tool calling, automated tests, Vercel, and Git/GitHub. Add Supabase/PostgreSQL only if justified. Separate UI, data access, recommendation logic, weather integration, maps, and AI orchestration. Test eligibility, scoring, time windows, and near-ties. No application, tooling, or commands exist yet; document actual commands when established. Never commit secrets.

## Incremental Development & Exclusions

Proceed incrementally: architecture → validation → data → weather service → recommendation engine → interface/map → AI agent → testing/evaluation → deployment. Never build everything in one pass. Current authorization covers this guide only: no installation, application generation, or feature coding.

Exclude unless explicitly requested: hiking, authentication, social/community features, a second AI agent, notifications, GPX route database, nationwide coverage, multi-turn AI memory, wearables, CMS, WebSockets, and unnecessary infrastructure.

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
