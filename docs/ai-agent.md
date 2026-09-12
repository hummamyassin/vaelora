# VAELORA Outdoor Recommendation Agent

This phase adds one single-turn server agent. The domain engine, dataset and weather
pipeline remain unchanged. There is no conversational memory, second agent or UI.

## Architecture and grounding

`POST /api/agent` accepts only `{ "prompt": "Run tomorrow after 6 PM on flat terrain" }`.
The body is bounded to 8 KiB and the prompt to 2,000 characters. Missing provider
configuration returns 503 without attempting a model call. Responses use `no-store`.

1. `RecommendationModel.extract` receives the request and explicit evaluation clock.
2. The model calls `get_vaelora_recommendations` with the strict intent schema.
3. Runtime validation rejects malformed arguments, unknown keys and unsupported enums.
   Reported unsupported/ambiguous constraints return static clarification text without
   weather calls. No constraint is silently relaxed by the orchestration code.
4. Code resolves today/tomorrow in Asia/Amman, discloses defaults, and translates
   qualitative wind/heat preferences using the existing activity policy.
5. The existing pipeline filters areas, retrieves Open-Meteo forecasts, evaluates the
   six-input policy, finds windows and groups Top Matches. No logic is duplicated.
6. The model receives the tool result and calls `present_vaelora_matches`, containing
   only the complete set of Top Match area IDs. This is an output contract, not another
   recommendation engine. A request uses at most two model calls and one pipeline call.
7. Code validates exact membership and uniqueness and renders all facts directly from
   the trusted result. Model prose is never published. Unknown IDs, extra score/text
   fields, omissions or duplicate IDs trigger deterministic rendering of the complete
   trusted result. `presentationValidated: false` makes this fallback observable.

The response includes `intent`, resolved `request`, `assumptions`, `matches`, `text`,
the authoritative `result`, and `trace`. Match IDs, names, fit, ordinal categories,
terrain, surfaces, environment, windows, evidence and access caveats are copied from
the pipeline. Empty matches and weather failures produce explicit nonrecommendations.
Category numbers are the existing ordinal 0/1/2 labels, never percentage scores.

## Intent contract and interpretation

All schema fields are required; omitted preferences use null, flags false, issues [].
The TypeScript contract and JSON tool schema live in `src/server/ai/intent.ts`.

| Fields | Meaning |
|---|---|
| activity | running, walking, or null when unresolved |
| day | today, tomorrow, or null when unresolved |
| startHour, endHour, durationHours | Whole Amman-local hours; end exclusive |
| terrain | flat, rolling, hilly, or null |
| surface | paved, track, gravel, dirt, or null |
| environment | park, urban, woodland, open-space, or null |
| lowWind, avoidHeat | Qualitative flags translated by deterministic policy |
| maxWindKmh, maxTemperatureC, maxApparentTemperatureC | Explicit numeric hard limits or null |
| issues | Enumerated missing/ambiguous/conflicting/unsupported requirement codes |

Missing activity/day needs clarification. Missing hours search 06:00–22:00; missing
duration uses one-hour forecast windows. Every default is returned in assumptions.
These are search conventions, not opening times or route-duration claims. Morning
means 06–12, afternoon 12–18, evening/tonight 18–22; tonight implies today. “After
6 PM” starts at 18:00. Ambiguous bare hours, fractional hours and cross-midnight
requests require a new complete request. No previous conversation is retained.

Low wind caps wind at the preferred upper bound in the existing activity policy
(running 15 km/h; walking 20). Heat avoidance caps both temperature and apparent
temperature at their preferred upper bounds (running 22 °C; walking 26). Stricter
explicit limits win. These choices are disclosed and remain provisional.

Distances such as 5K cannot establish a route or duration from this dataset. The
example 5K request therefore returns a route-distance limitation while retaining its
extracted running/day/time/flat/wind intent. Named-area targeting, travel radius,
guaranteed accessibility/opening, unsupported activities and dates also need a revised
request. The model is instructed to report every unsupported material requirement.

## Factual action trace

The trace contains only completed actions and structured values:

- `activity-detected`: resolved activity.
- `constraints-extracted`: validated request and disclosed assumptions.
- `eligible-locations-found`: count from the pipeline.
- `weather-retrieved`: count of successful area forecasts.
- `suitability-calculated`: deterministic policy identifier.
- `best-time-evaluated`: count of viable areas evaluated by the pipeline.
- `matches-returned`: Top Match count.

Clarifications instead emit `constraints-need-clarification` and enum issue codes.
Model failures never pretend that weather or ranking ran. The API never exposes model
continuation, reasoning, raw response bodies, API keys or private exception messages.

## Provider and configuration

`src/server/ai/contracts.ts` defines the vendor-neutral `RecommendationModel` interface.
`openai.ts` uses OpenAI's Responses API. `groq.ts` uses Groq's Chat Completions local
tool-calling format. Both adapters use fetch, disable storage and parallel tool calls,
carry only this request's ephemeral context, and have a 30-second timeout and a bounded
output limit. `provider.ts` selects the adapter from server-only environment variables;
there are no retries, SDK additions, or client-side credentials.

The OpenAI adapter uses strict function tools and actual `function_call_output`. The
Groq adapter forces one named local function per request, sends the authoritative result
back as a `tool` message, and relies on VAELORA's existing runtime validators because
strict constrained tool schemas are not available for every Groq model. Model prose is
still never published. See the official [Groq local tool-calling documentation](https://console.groq.com/docs/tool-use/local-tool-calling)
and [OpenAI function-calling documentation](https://developers.openai.com/api/docs/guides/function-calling).

Copy `.env.example` to ignored `.env.local`. Set `VAELORA_AI_PROVIDER` to `openai` or
`groq`, set `VAELORA_AI_MODEL` explicitly, and provide only the matching server-side key.
There is no implicit model choice. Never prefix keys with `NEXT_PUBLIC_`. Next.js loads
`.env.local`; the smoke command explicitly loads it. Empty or non-ASCII credentials and
unknown providers fail closed as unconfigured without attempting a request.

## Reproducible evaluation

`docs/evaluation/agent/cases.json` contains 28 fixed prompts, manually authored intent
replays and expected outcomes. `scripts/agent-evaluation.ts` fixes the evaluation clock
at 2026-09-12 03:00 Amman. It uses the real production areas and engine with explicitly
synthetic six-input forecasts passed through the real weather adapter.

- `npm run eval:agent`: all 28 offline replays, no network or paid calls.
- `npm run eval:agent -- --save`: refresh the committed offline summary.
- `npm run smoke:agent`: three live-model cases (at most six model requests), synthetic
  weather; prints pending and skips cleanly when configuration is missing.
- `npm run smoke:agent -- --all`: opt-in full 28-case live extraction evaluation.
- `npm test`: all tests, including replay evaluation and adversarial mocked responses.

Metrics check activity, expected time/constraint interpretation, tool execution count,
constraint satisfaction, location IDs, ordinal values and rendered grounding. Null
metrics mean not applicable (e.g. time for a rejected ambiguous request). The numeric
limit case intentionally returns no matches rather than silently relaxing the limit.
The live mode uses the fixed historical clock for repeatability; it is not a current
weather smoke test. Saved replay results are in `docs/evaluation/agent/summary.json`.

Replay success demonstrates orchestration and contract behavior, **not model language
understanding accuracy**. The suite can run
the same assertions against a configured model later, without changing the engine.

## Validation on 12 September 2026

Dataset validation passed (35 researched, 11 selected). All 66 tests passed, including
the OpenAI and Groq adapter boundaries, and 28/28 offline evaluation replays passed.
TypeScript and lint passed. The production build passed using the repository's documented
Windows fallback, `npm run build -- --webpack`, and includes `/api/agent` and
`/api/recommendations`. Groq live verification still requires a valid local credential;
malformed credentials fail closed before network I/O. No dependencies were added and the
deterministic domain/data/weather files were unchanged.

## Limits before public release

The model can still misinterpret or omit a natural-language constraint while returning
valid intent. Schema validation cannot prove semantic extraction; live evaluations and
broader prompt coverage are needed. Grounding prevents invented output facts even in
that case, but cannot guarantee that extracted intent matches every user phrase.
V1 prompts target English. Clarification requires a new complete request.

Existing provisional comfort, AQI, access/opening/closure, route-length and microclimate
limitations remain. The endpoint has bounded per-request work but no public abuse/rate
control; review this before enabling paid credentials on a public deployment. No UI,
map, authentication, database or deployment is introduced in this phase.
