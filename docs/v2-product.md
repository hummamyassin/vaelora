# VAELORA V2 — Outdoor activity intelligence

V2 replaces the homepage's marketing hero and mandatory planner with a mobile-first dashboard. The previous security checkpoint is `3df0bf83a65d91d165a7267fdbc8aa865e170ca5`. Its validation, server-only providers, bounded bodies, same-origin checks, rate/concurrency limits, safe errors and headers remain in place. V2 adds no login, database, second agent, tracking, deployment, or unrelated activity.

## Architecture

- `src/data/weather-areas.ts`: nine bilingual forecast reference points with reviewed sources and aliases. They have no terrain, surface, suitability or route fields.
- `src/data/activity-areas.ts`: unchanged reviewed place dataset (11 production entries; 8 verified and 3 supported, from 35 researched candidates). Existing photos, licenses and evidence remain unchanged. The current photo catalog contains five existing assets, including the three explicitly requested for preservation.
- `src/domain/recommendation/score.ts`: pure score presentation and continuous outing-window calculation over the existing six-input comfort policy. No LLM or I/O.
- `src/server/recommendations/dashboard.ts`: strict request validation, place eligibility, weather retrieval, both activity outlooks, and the original fit-first/near-tie ranking policy. The existing Open-Meteo adapter handles bounded concurrency, exact-coordinate caching, validation and safe provider failures.
- `/api/dashboard`: protected POST endpoint; only known area/place IDs and bounded filters are accepted. Unknown coordinates, policies, weather or scores are rejected.
- `dashboard-app.tsx` / `dashboard.css`: bilingual dashboard, area selection, score explanation, hourly timeline, filter sheet, place cards, lazy map and assistant drawer.
- The existing single agent extracts a closed intent schema. Its new weather branch uses the same deterministic outlooks, applies requested time/numeric constraints, and renders factual templates. No freeform model prose or model-authored scores are displayed. The legacy grounded place tool remains available for existing contracts.

## Scores and ranking

The engine has ordinal comfort categories, not a calibrated continuous health formula. V2 deliberately does not invent distinctions inside those categories. Conditions scores map preferred / acceptable / unfavorable to **90 / 65 / 30**. Missing inputs or an uncheckable/failed hard limit yield no score, not zero. Temperature, apparent temperature, humidity, wind, precipitation probability and UV all come from real hourly forecasts; the least favorable factor controls the category. AQI is not currently assessed. Walking and running use their own policy bands, including their own qualitative heat/wind limits.

Place scores preserve the engine's lexicographic ordering: suitable fit maps weather categories 0/1/2 to **90/80/70**, limited fit to **60/50/30**. Unfavorable category-2 windows are excluded from recommendations. Conditions and place scores have different scopes and are labeled separately. Scores never break the original near-tie band; distance orders candidates within that existing top band. An 80-point and 90-point place may remain near-tied by policy.

| Band | English | Arabic |
|---|---|---|
| 90–100 | Excellent | ممتاز |
| 80–89 | Very good | جيد جدًا |
| 70–79 | Good | جيد |
| 60–69 | Fair | مقبول |
| 40–59 | Less favorable | أقل ملاءمة |
| 0–39 | Unfavorable | غير ملائم |

These are provisional comfort labels, not clinical validation, exercise prescriptions, route safety, or health outcomes. The interface explains this under “Why this score?” rather than presenting internal math in the primary flow.

## Windows and time

Today is the default; all dates and times use Asia/Amman. The default outing is 60 minutes; 30 and 90 are optional. Candidate starts are the next whole minute for the current forecast hour and each subsequent whole hour. Every hourly interval touched by the outing must be present, eligible, and no worse than acceptable. The worst covered interval determines the score. The highest score wins; equal windows choose the earliest start. An outing cannot cross local midnight or bridge a forecast gap. The duration is exact; the weather resolution remains one hour and is explicitly disclosed. No route duration or opening time is inferred.

Today’s main gauge shows this hour; tomorrow’s shows the best available window. The hourly strip selects the metrics and six-factor explanation. Automatic refresh while visible keeps day boundaries/current windows fresh without replacing the entire screen with a loading state every minute. Request cancellation and stale-response guards prevent slower prior selections from overwriting newer ones.

## Locations, Near Me and privacy

Manual selection uses a sourced forecast reference point and a clearly labeled 5 km search for reviewed places. This is proximity, not neighborhood-boundary verification. Near Me asks for browser permission only after an explicit action, picks a supported weather reference point, calculates Haversine distances locally, and sends only reviewed place IDs within 2/5/10 km. Place filtering happens before server ranking. Coordinates remain in component memory; there is no location watch or coordinate storage. Denial, invalid location and out-of-coverage results open manual selection. The 25 km nearest-reference cutoff is a product coverage limit, not a municipal polygon.

Local storage holds language, selected supported area and activity. Ask VAELORA receives a validated context with those supported values and optional reviewed IDs, not precise coordinates. Explicit named areas and constraints take precedence. Without a UI context, weather answers disclose the Central Amman default. Unknown named places, route safety and fabrication requests must return clarification. The existing provider prompt privacy notice remains visible.

## UX and accessibility

Navy score surface, warm ivory canvas, sand activity selection and restrained green status surfaces form the original V2 visual system. Photography is confined to reviewed-place cards. Filters, area search and AI use native modal dialogs: bottom sheets on mobile, side panels on desktop, Escape support, focus containment/return and background scroll locking. Controls use semantic buttons and pressed states. Numeric labels accompany color; best hours have accessible labels. RTL uses logical spacing, isolated times, localized messages and Arabic typography. The map is dynamically imported only when requested; charts use CSS, with no animation/chart dependency.

Keyboard, reduced motion, mobile safe-area spacing and browser failure states are included in QA. A screen reader audit and field usability study are not claimed.

## Commands

```text
npm run validate:data
npm test
npm run eval:agent
npm run typecheck
npm run lint
npm run build -- --webpack
npm run dev -- --webpack --port 3001
```

`eval:agent` preserves the original 28 offline replays and runs the V2 bilingual comparison, context, rejection and grounding cases. These are offline contract/orchestration checks, not estimates of live model accuracy. The existing Windows Webpack fallback is retained. Temporary Playwright artifacts stay in ignored `.playwright-cli/`.

## Limits retained intentionally

Forecasts are hourly model/grid values, not local measurements of a path. No verified route geometry, lighting/safety guarantees, live closures, opening hours, accessibility guarantees, AQI or medical guidance is added. Supported place evidence remains distinct from verified evidence. Photo capture dates and licensing caveats remain available. Hosting/firewall activation from the security audit remains an operator task; this phase does not deploy or enable public AI on Vercel.
