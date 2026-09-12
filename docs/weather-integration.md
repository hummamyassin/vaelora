# Live weather and recommendation pipeline

VAELORA's server-side pipeline connects the evidence-reviewed activity dataset to
Open-Meteo while keeping network I/O separate from deterministic recommendation logic.

```text
typed request
  → validate activity, Today/Tomorrow, hours and hard preferences
  → filter eligible production areas
  → fetch each eligible area's exact coordinate from Open-Meteo
  → normalize and validate 48 Amman-local hourly observations
  → apply the activity-specific six-input comfort policy
  → find each area's best whole-hour window
  → group Top Matches by activity fit, then weather-category near-ties
```

## Boundaries

- `src/server/weather/open-meteo.ts` owns the provider URL, timeout, units,
  response validation, normalization, bounded successful-result cache, and provider
  metadata. It requests temperature, apparent temperature, humidity, 10 m wind,
  precipitation probability, and UV for Today and Tomorrow in `Asia/Amman`.
- `src/domain/recommendation/v1-environment.ts` is provider-independent. It requires
  all six V1 inputs and assigns ordinal preferred/acceptable/poor categories. AQI is
  retained as optional context and does not affect results.
- `src/server/recommendations/policy.ts` contains the explicit provisional Running
  and Walking bands. The two activities are evaluated independently.
- `src/server/recommendations/pipeline.ts` filters locations before I/O, limits
  provider concurrency, invokes the existing pure engine, and returns typed status,
  metadata, warnings, and a factual action trace.
- `src/server/recommendations/request.ts` rejects unknown or invalid client fields.
  Clients cannot submit coordinates, forecasts, policies, or scores.
- `src/server/recommendations/http.ts` provides a framework-light JSON boundary;
  `src/app/api/recommendations/route.ts` exposes it as `POST /api/recommendations`
  on the Node.js runtime.

## Request

The JSON body follows the existing `RecommendationRequest` type. This example asks
for a one-hour Running window tomorrow evening and requires known flat terrain:

```json
{
  "activity": "running",
  "date": "2026-09-13",
  "startHour": 17,
  "endHour": 21,
  "durationHours": 1,
  "terrain": "flat"
}
```

`date` must be Today or Tomorrow in Amman. Hours are whole local hours and `endHour`
is exclusive. Optional hard constraints are `terrain`, `surface`, `environment`,
and `weatherLimits` for maximum temperature, apparent temperature, or wind.

## Result and failure behavior

The result includes the normalized request, evaluation time, policy ID, match bands,
Top Matches, location exclusions, areas without practical windows, per-area weather
outcomes, warnings, and a safe action trace. Match ordering remains lexicographic:
activity fit first, environmental category second. Weather primarily selects each
area's best time; its coarse category only distinguishes locations with equal fit.
The location near-tie threshold groups adjacent categories and never ranks tiny raw
forecast differences.

Successful forecasts are cached for ten minutes by the complete URL, which includes
the exact coordinate and dates. Requests for nearby coordinates are not merged even
when Open-Meteo returns the same grid point. Requested coordinates, returned grid
coordinates, elevation, timezone, units, retrieval time, URL, and cache disposition
are retained for auditability.

Missing or implausible values become `null`; they are never converted to zero. A
missing required input excludes that hour, and missing hours break contiguous windows.
One failed location yields a `partial` result while other locations remain usable.
If every eligible forecast fails, the API returns the typed result with HTTP 503.
Timeout, network, rate-limit, provider HTTP, and invalid-response errors are classified
without exposing response bodies or internal errors. Failed results and stale results
are not served from cache.

## Current limitations

The comfort bands are provisional product policy, not medically validated thresholds
or a safety assessment. The worst of the six ordinal categories controls an hour;
there are no weights or decimal composite scores. Precipitation probability is not
precipitation amount, and UV is an hourly forecast input rather than shade exposure.
AQI, gusts, lightning, road/park conditions, opening hours, closures, route length,
accessibility, travel time, personal acclimatization, and park-scale microclimates are
not evaluated. Area descriptions and access caveats must remain visible to future
consumers. Open-Meteo's returned grid coordinate can differ from the requested point.

The in-memory cache is process-local and best-effort in serverless execution. There
is no retry or stale-on-error fallback, avoiding hidden extra load and stale-weather
recommendations. A future production review should validate thresholds, provider
terms/attribution, operational limits, and rate/cost assumptions before public launch.

## Verification

`tests/server/weather-pipeline.test.ts` uses mocked fetch responses only. It covers
exact-coordinate requests, two-day date handling, unit/timestamp/array validation,
missing data, provider failures, timeout, cache isolation, Running versus Walking,
pre-weather eligibility, best windows, near-ties, partial results, and HTTP validation.

`npm run smoke:weather` is an opt-in live check. It runs the three approved scenarios,
writes the full provider capture to `docs/validation/weather-pipeline/smoke.json`, and
writes a compact report to `summary.json`. The ordinary test command never calls the
network.
