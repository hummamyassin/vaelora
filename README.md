# VAELORA

V2.3 adds dynamic urban Amman conditions, bilingual search, deterministic daily
plans and nearby discovery, a burgundy Jordanian identity, generated place art,
private route-image sharing and local weekly progress. See
[V2.3 architecture, coverage, privacy and QA](docs/v23.md).

Weather-aware running and walking recommendations for Greater Amman, Jordan.
V2 opens directly into a bilingual activity dashboard with deterministic scores,
hourly conditions, exact outing windows, optional filters, nearby reviewed places,
a synchronized map, and a grounded AI drawer. Nine sourced weather reference areas
are separate from the evidence-reviewed activity dataset (11 selected places;
five support running, all support walking).
See the [dataset review and limitations](docs/research/activity-areas/README.md).
A live deterministic weather pipeline and a single-turn AI tool-calling agent are
implemented. The mobile-first English/Arabic interface connects the dashboard endpoint
to Top Matches and a MapLibre/OpenStreetMap map.
Comfort policy remains provisional.
See [AI agent, configuration and evaluation](docs/ai-agent.md).
See [V2 architecture and limits](docs/v2-product.md) and [V2 validation](docs/v2-qa.md).

V2.1 adds local GPS walking/running recording, activity summaries and IndexedDB
history, explicit GPX export, privacy-safe image cards, Compare Areas, a three-day
outlook, discrete area-score maps, saved areas and an offline PWA shell.
See [V2.1 architecture and limitations](docs/v2.1-product.md) and
[V2.1 validation](docs/v2.1-qa.md). Background GPS with a locked screen is **not
guaranteed**; leaving the foreground pauses recording.

V2.2 adds a graphite/citrine sports identity, light/dark/system appearance,
optional bilingual onboarding, a device-local guest profile, personalized Home,
activity statistics and direct history access. See
[V2.2 product experience and validation](docs/v2.2-product.md).

## Local development

Use Node.js 24 LTS with npm available on your PATH.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The recommendation interface needs no AI configuration.
The optional AI endpoint supports OpenAI or Groq through the server-only variables
documented in `.env.example`.

On the initial setup machine, npm was absent from PATH. npm 12.0.2 was downloaded
to temporary tooling storage. Until npm is installed on PATH, PowerShell can run
the same commands with this temporary CLI (which may be removed by system cleanup):

```powershell
node "$env:TEMP\vaelora-npm-tooling\package\bin\npm-cli.js" run dev
```

## Commands

- `npm ci`: install dependencies from the committed lockfile.
- `npm run dev`: start the local development server.
- `npm run lint`: run ESLint; warnings fail the check.
- `npm test`: run offline domain, dataset, weather integration and AI-agent tests.
- `npm run validate:data`: validate production records, the research decision crosswalk and weather reference areas.
- `npm run smoke:weather`: make the controlled live Open-Meteo pipeline check and save its evidence.
- `npm run eval:agent`: run 28 original offline replays plus 16 V2 grounding and contract checks.
- `npm run smoke:agent`: run three controlled live-model cases if configured; otherwise skip.
- `npm run typecheck`: check TypeScript without emitting files.
- `npm run build`: prepare the same-origin MapLibre worker, build/type-check production, and generate the public offline asset list.
- `npm start`: serve an existing production build.

Tests use Node.js 24's built-in test runner with TypeScript type stripping; no additional
test dependencies are required. The production build checks TypeScript types.

On this Windows setup, Turbopack currently fails to spawn its CSS worker with
`Access is denied (os error 5)`, including outside the execution sandbox. The
supported fallbacks `npm run dev -- --webpack` and `npm run build -- --webpack`
run successfully; the default commands remain unchanged.

## Structure and boundaries

- `src/app/`: App Router routes, API routes, root layout, and global design tokens.
- `src/components/`: responsive intent, recommendation, detail, timeline, trace, AI,
  and MapLibre map UI. The browser receives only API-returned production coordinates.
- `src/domain/`: activity types and pure filtering, environmental categorization,
  best-time, and Top Matches functions. See [domain foundation](docs/domain-foundation.md).
- `tests/domain/`: synthetic, offline engine tests.
- `src/data/activity-areas.ts`: selected production activity areas and source notes.
- `docs/research/activity-areas/`: evidence policy, 35 research proposals and decisions.
- `tests/data/`: dataset integrity and real-data eligibility tests.
- `src/server/weather/`: server-only Open-Meteo transport, validation, normalization and cache.
- `src/server/recommendations/`: typed request, policy, pipeline and HTTP boundaries.
- `src/app/api/recommendations/`: Node.js `POST /api/recommendations` route for future consumers.
- `tests/server/`: mocked weather, pipeline and API integration tests; no live calls.
- `next.config.ts`: Next.js configuration.
- `tsconfig.json`: strict TypeScript and the `@/*` alias for `src/*`.
- `eslint.config.mjs`: Next.js and TypeScript lint rules.
- `postcss.config.mjs`: Tailwind CSS integration.
- `AGENTS.md`: product scope and contributor guidance, preserved from planning.

`src/server/ai/` contains the agent, provider adapter, intent/tool contracts and grounded
renderer; `src/app/api/agent/` is its HTTP boundary. The Ask VAELORA interface reports
an explicit unavailable state when provider configuration is absent. Domain logic remains
independent of UI, AI, and weather providers. See the
[weather integration](docs/weather-integration.md) for the live server pipeline.

Use two-space indentation and descriptive TypeScript names. Keep changes focused and
report validation in pull requests. Never commit secrets; `.env` and `.env.*` are ignored
except a future `.env.example`, which must contain placeholders only.

The documentation-only authorization and tooling status in the preserved `AGENTS.md`
describe the prior planning stage. The subsequent foundation task authorized this setup;
product implementation still proceeds incrementally within its scope boundaries.
