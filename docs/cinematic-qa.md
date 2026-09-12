# Premium visual polish QA — 2026-09-12

Continued the interrupted working tree without replacing the recommendation, weather,
map, or agent architecture. Existing polish included the topographic hero, motion
pause, responsive intent controls, best-window hierarchy, map selection styling,
hourly visualization, and factual AI presentation.

Completion fixes: brand icon, mobile map-caption/attribution separation, local QA
artifact lint exclusions, and Groq tool-only reply compatibility. Groq may omit
assistant `content`; omitted, null, and empty content are accepted only with the
existing strict tool-call validation. Nonempty prose remains rejected. A regression
test covers this boundary. No provider reasoning is rendered or logged.

## Browser verification

Playwright CLI tested desktop 1440×1000 and mobile 390×844 against the real local
recommendation endpoint: Running, Walking, all four time presets, flat/paved/park/
low-wind/avoid-heat preferences, results, evidence disclosure, hourly best-window
highlighting, real map markers, card-to-marker selection and marker-to-card pointer
and keyboard interaction. No mobile horizontal overflow was detected. Hero pause
and reduced-motion behavior passed.

Loading, network failure, no-eligible-area, and weather-unavailable states were
tested using browser-only request interception. No fixtures entered product code.
Settled screenshots confirmed map tiles and hourly cells render. The live mobile
Ask surface rendered a grounded answer and seven factual trace items.

## Controlled live Groq checks

Local model: `openai/gpt-oss-120b` on Groq. Credentials stayed server-side and
`.env.local` remained ignored and untracked.

- “Where should I run tonight?”: valid extraction and presentation, no matches
  for the elapsed extracted 18:00–22:00 window; no fabricated replacement.
- “I want to run tomorrow after 6 PM somewhere relatively flat and not too windy.”:
  tomorrow 18:00–22:00, flat terrain, 15 km/h wind ceiling; `sports-city` returned.
- “Find me a park for walking tomorrow morning.”: tomorrow 06:00–12:00, walking,
  park constraint; `al-nashama-park`, `king-abdullah-ii-park`, `king-hussein-park`,
  and `sports-city` returned.

All three passed presentation validation, production-ID checks, constraint checks,
and exact equality with deterministic response rendering. Weather limits were
checked against returned forecast hours. One additional browser prompt verified
the live Ask presentation. Earlier malformed credential and adapter failures
returned a graceful unavailable state; deterministic recommendations stayed usable.

## Boundaries

Final validation: 67/67 repository tests, 28/28 offline evaluations, dataset
validation (35 researched; 11 production), TypeScript, lint, and the Webpack
production build passed.

Live calls are controlled smoke checks, not a broad language-accuracy benchmark.
Forecasts, availability, and model-extracted time ranges can vary. Offline replay
uses synthetic weather and does not prove live extraction accuracy. Desktop/mobile
QA used Chrome, not a cross-browser/device lab. Public map tiles require network
access. Windows validation retains `next build --webpack` and `next dev --webpack`.
No deployment, new backend systems, or third-party local skill bundles are included.
