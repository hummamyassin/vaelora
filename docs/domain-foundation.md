# VAELORA domain and engine foundation

## Architecture

All implementation lives in `src/domain/`, with no React, Next.js, provider, database, map, or AI imports. The existing weather proof of concept remains separate and unchanged. No production activity dataset or default scoring policy is introduced.

| File | Responsibility |
|---|---|
| `activity-area.ts` | Activity area, activity fit, terrain, surface, environment, and evidence types |
| `recommendation/types.ts` | Structured request, normalized hourly data, scorer contract, windows and matches |
| `recommendation/eligibility.ts` | Hard area filtering with exclusion reasons |
| `recommendation/environment.ts` | Configurable running/walking environmental categorization |
| `recommendation/time-windows.ts` | Local date validation, contiguous hourly windows, best-time alternatives |
| `recommendation/recommend.ts` | Pure orchestration and fit-first Top Matches bands |
| `tests/domain/recommendation.test.ts` | Synthetic offline behavior tests |

`recommend(areas, request, forecastsByAreaId, scorer, policy, now)` is the entry point. All data, policy, and the evaluation clock are injected. It returns the scorer identifier, ordered match bands, the first band's `topMatches`, location exclusions, and eligible locations with no practical forecast window. No fetch or side effect occurs.

## Filtering, scoring, time, and ties

1. Filter evidence, supported activity, activity-specific suitability, and explicit terrain/surface/environment requirements. Excluded locations never reach weather evaluation.
2. Assess each requested hour against an explicit running or walking policy. The supplied baseline categorizer takes the worse category of temperature and wind: **0 preferred, 1 acceptable, 2 poor**. These are ordinal labels, not weighted scores, percentages, or safety certifications. Preferred and acceptable intervals are nested, inclusive, and supplied by the caller. There are no default numerical weather thresholds.
3. Apply explicit maximum temperature, apparent temperature, or wind limits as hard hourly constraints. An uncheckable limit makes the hour unavailable.
4. Build contiguous, fixed-duration, whole-hour windows. Gaps, unacceptable hours, and already-started hours cannot be bridged. A window takes its worst hourly category; averaging cannot hide poor conditions. The caller supplies the highest category allowed.
5. Return every window within the configurable category tolerance of the best window. Chronological ordering does not imply superior weather among tied windows. Overlapping alternatives are retained instead of manufacturing minute-level distinctions.
6. Group viable locations by activity fit (`suitable` before `limited`), then environmental category. A better forecast cannot compensate for lower activity fit. Each new band is anchored to its best remaining category; ties do not chain transitively. All members of the leading band are Top Matches. Stable area-ID order inside each band is display order only, and no arbitrary top-N truncation splits a tie.

Time and location tolerances are independently configurable as 0, 1, or 2 category steps. Zero groups only identical categories; one also groups adjacent categories. With a tolerance of one, small differences across a preferred/acceptable boundary remain potential ties. Two intentionally removes weather-category separation among otherwise equal-fit candidates. These policy choices need validation; none is selected as a production default. Raw temperature decimals never directly order locations. No geographic-distance merge rule is inferred from the proof of concept.

## Missing data and policy limits

Temperature (°C) and wind (km/h) are required by this baseline categorizer. Absent, null, or nonfinite values make the hour unavailable. Negative wind is invalid. Optional apparent temperature, humidity, precipitation probability, UV, and US AQI are not weighted or categorized in this first strategy, even when present. Their absence is returned in `missingOptional`, without invented zeroes or bonuses. Apparent temperature becomes required if the user specifies its maximum.

A future separately validated scorer may use additional variables via the same contract; it must preserve comparable missing-data treatment. The present strategy does not evaluate precipitation, UV, or AQI hazards and cannot claim comprehensive environmental suitability. Reported categories mean suitability under the supplied temperature/wind policy only. Callers should retain the original hourly observations for explanations.

Missing forecasts return no matches with reasons, not fallback weather. Malformed requests, duplicate IDs/timestamps, invalid timestamps, and invalid configurations raise errors for the caller to correct. An empty result is legitimate, including when today's requested time has already passed.

## Assumptions and boundaries

- V1 has only running and walking. Activities are evaluated separately, with no inferred support based on another activity's suitability.
- Activity areas supplied by a future trusted data boundary belong to Greater Amman. This foundation does not implement a municipal polygon check or verify coordinates/evidence URLs at runtime. Synthetic test coordinates and example.invalid evidence are never real locations.
- `supported` or `verified` areas require at least one evidence reference to qualify. `unverified`, unknown activity fit, and unsuitable fit are excluded. Suitability labels are editorial inputs requiring evidence, not calculated facts.
- A structured terrain, surface, or environment preference is hard. Unknown values cannot satisfy it. A requested surface must be listed explicitly; mixed-surface areas qualify only when that surface is listed. Its presence does not establish a continuous route of any particular length.
- Without an explicit characteristic constraint, no terrain/surface/environment order is invented; activity suitability supplies the fit tier. No distance, pace, route-length guarantee, opening-hours inference, travel-time optimization, or personalization is implemented.
- Requests specify one Amman-local calendar date (today or tomorrow), whole start/end hours, and an integer duration of at least one hour. The end is exclusive and may be 24. Windows cannot span two request dates; an end at 24 is represented as next-day midnight. No duration is silently assumed.
- Hourly inputs must already be normalized to `YYYY-MM-DDTHH:00` in Asia/Amman, each representing the following hour. Units are named explicitly; AQI means US AQI. A future adapter owns conversion, physical plausibility checks for optional readings, forecast freshness, and provider metadata. The existing validation dataset is not an application forecast service.
- The caller supplies `now`; Amman calendar dates use `Intl` timezone conversion. The next complete local hour is the earliest candidate unless evaluation is exactly on an hour boundary. Algorithms are deterministic for the same data, policy, and clock.
- Weather shapes the best time for each eligible area and only then separates equal-fit areas. This intentionally compares each area's best available requested window, not an implicit single global hour.
- No global clock, network, persistence, randomized ranking, score weights, or production thresholds are hidden in the engine. Policy IDs must be changed when threshold semantics change.

## Verification and use

Use Node.js 24 and `npm test` for domain tests plus the preserved weather-validation tests. Tests read the saved proof-of-concept snapshot but make no live calls. All new engine fixtures are synthetic, and their thresholds must not be adopted as production defaults. `npm run lint` and `npm run build` check the full project; the build also type-checks the tests. `npm run typecheck` remains available separately.

The package is explicitly ESM so Node can run TypeScript tests using built-in type stripping; `allowImportingTsExtensions` supports explicit `.ts` imports under the existing no-emit TypeScript configuration. No test dependency was added. Native test execution does not itself type-check; the production build provides that check.
