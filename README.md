# VAELORA

Weather-aware running and walking recommendations for Greater Amman, Jordan.
This repository contains a placeholder page, an isolated weather validation, a
framework-independent domain/recommendation foundation, and an evidence-reviewed Greater
Amman activity dataset (11 selected areas; five support running, all support walking).
See the [dataset review and limitations](docs/research/activity-areas/README.md).
A live deterministic weather pipeline and a single-turn AI tool-calling agent are
implemented. Comfort policy remains provisional; the page is still a placeholder.
See [AI agent, configuration and evaluation](docs/ai-agent.md).

## Local development

Use Node.js 24 LTS with npm available on your PATH.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The placeholder page needs no configuration. The optional
AI endpoint requires the server-only variables documented in `.env.example`.

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
- `npm run validate:data`: validate production records and the research decision crosswalk.
- `npm run smoke:weather`: make the controlled live Open-Meteo pipeline check and save its evidence.
- `npm run eval:agent`: run 28 offline agent evaluation replays with synthetic weather.
- `npm run smoke:agent`: run three controlled live-model cases if configured; otherwise skip.
- `npm run typecheck`: check TypeScript without emitting files.
- `npm run build`: create and type-check the production build.
- `npm start`: serve an existing production build.

Tests use Node.js 24's built-in test runner with TypeScript type stripping; no additional
test dependencies are required. The production build checks TypeScript types.

On this Windows setup, Turbopack currently fails to spawn its CSS worker with
`Access is denied (os error 5)`, including outside the execution sandbox. The
supported fallback `npm run build -- --webpack` produces the production build;
the default build command remains unchanged.

## Structure and boundaries

- `src/app/`: App Router routes, root layout, and global styles.
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
renderer; `src/app/api/agent/` is its HTTP boundary. UI remains future work. Domain logic remains
independent of UI, AI, and weather providers. See the
[weather integration](docs/weather-integration.md) for the live server pipeline.

Use two-space indentation and descriptive TypeScript names. Keep changes focused and
report validation in pull requests. Never commit secrets; `.env` and `.env.*` are ignored
except a future `.env.example`, which must contain placeholders only.

The documentation-only authorization and tooling status in the preserved `AGENTS.md`
describe the prior planning stage. The subsequent foundation task authorized this setup;
product implementation still proceeds incrementally within its scope boundaries.
