# V2 validation record

Validation continued from the existing working tree; no reset, stash or discard was used. The original security checkpoint `3df0bf83a65d91d165a7267fdbc8aa865e170ca5`, place dataset, photo assets and attribution were preserved.

## Automated results

| Check | Result |
|---|---|
| Activity dataset validation | Passed: 35 researched, 11 production; 8 verified, 3 supported |
| Weather reference validation | Passed: 9 sourced reference points; no route attributes |
| Full repository tests | 124 passed, 0 failed, 0 skipped |
| V2 scoring tests | 11 passed within the full suite |
| V2 dashboard/coverage/AI tests | 26 passed within the full suite |
| Original offline AI evaluation | 28/28 passed |
| Additional V2 AI grounding/contract checks | 16/16 passed (also included in repository tests) |
| TypeScript | Passed |
| ESLint | Passed with zero warnings |
| Production build | Passed using the documented Windows Webpack fallback |

Commands are documented in [V2 product notes](v2-product.md). The installed Node runtime was invoked directly when npm was absent from the sandbox PATH; the same checked scripts are exposed through package.json. No tests were weakened.

## Browser evidence

Playwright operated the actual local application, including its production build on port 3002, with live Open-Meteo forecasts. English LTR and Arabic RTL were inspected at 1440×1000 and 390×844. Screenshots and temporary CLI scripts remain in ignored `.playwright-cli/` and are not committed.

Passed interaction checks:

- Automatic initial dashboard and numeric score; Walking/Running and Today/Tomorrow.
- Hour selection, best-hour indication, automatic Best Window and six-factor score explanation.
- 30/60/90-minute requests and exact full windows on tomorrow; late-today incomplete windows correctly unavailable.
- Immediate smart filters, reset, mobile sheet, desktop panel, Escape and keyboard focus restoration.
- Bilingual area search, Shafa Badran weather-only state and nonselectable pending Hay Al-Shaheed Al-Janoubi.
- Near Me with permission, local distance filtering at 2/5/10 km, reviewed IDs sent without coordinates, and denial fallback to manual selection.
- Reviewed-place cards, card-to-marker and keyboard marker-to-card selection, real OSM tiles and attribution.
- All five existing photographs loaded at their actual reviewed places, with source and license links. A real no-photo place and an injected image failure both use the explicit place-profile fallback.
- English and Arabic assistant drawers; a live Groq response used actual dashboard context and deterministic results. Offline checks cover bilingual comparisons and rejection/grounding contracts.
- Browser-only delayed/503 dashboard responses, loading with no stale score, retry recovery, and injected AI unavailability in the drawer.
- Reduced-motion preference and no horizontal document overflow in all four viewport/language combinations.

Visual QA found and fixed inherited footer contrast, missing map-control styling, stretched late-day timeline cells, and missing V2 fallback layout styles. Expected console errors during fault injection were checked against the injected 503/image-abort cases; these were not treated as unexplained application failures. Map readiness uses completed tile requests rather than global network-idle because map traffic can continue.

## Limits

Offline evaluations validate contracts and orchestration, not live model accuracy. The live prompt is a smoke check, not a comprehensive model benchmark. Chromium desktop and mobile viewport emulation were tested; real-device Safari, a screen-reader audit and field usability testing were not performed.

Scores are a disclosed ordinal comfort policy on a 0–100 display scale, not a clinically calibrated continuous measure. Forecasts are hourly grid data; exact outing durations do not imply minute-resolution weather. No AQI, route geometry, safety, access or opening-hours guarantee is added. Hay Al-Shaheed Al-Janoubi remains pending because a reliable geographic reference coordinate was not established. The nine supported weather points and sources are documented in [the coordinate review](research/weather-areas.md).

No deployment was performed. Public hosting/firewall activation remains outside this phase.
