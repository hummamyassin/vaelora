# VAELORA weather granularity findings

## Decision

Use weather mainly to choose **when** to go, and secondarily to distinguish **where** to go. Keep location eligibility, activity fit, and user constraints first-class. Open-Meteo is provisionally useful for Amman-scale differentiation, but this experiment does not justify precise weather rankings between nearby parks or claims of measured microclimates. No scores or weights are defined here.

This conclusion uses a single live forecast snapshot retrieved at 2026-09-10 23:00 UTC (September 11, 02:00 in Amman), covering September 11–15. The first two hours precede retrieval because the API returns whole local days. The extra forecast days are for validation; V1 still supports today and tomorrow only.

Read [the generated numerical report](report.md) for all coordinates, source links, metadata, hourly-range tables, and all 28 location pairs. [snapshot.json](snapshot.json) preserves both complete API responses and request URLs; [analysis.json](analysis.json) preserves calculated results. All 120 timestamps align across eight points, with no missing values or dropped timestamps in either batch.

## 1. Are values meaningfully different?

There are persistent numerical differences large enough to warrant retaining geographic weather inputs. The eight-location temperature range averages **2.208°C**, with a minimum of 1°C and maximum of **3.8°C**. Apparent-temperature ranges average **2.869°C**, reaching **4.7°C**. These exceed rounding artifacts, but forecast disagreement is not proof of forecast accuracy or user-perceived benefit.

| Local date | Mean temperature range °C | Mean apparent-temperature range °C | Mean humidity range, percentage points | Mean wind range km/h |
|---|---:|---:|---:|---:|
| September 11 | 2.417 | 2.942 | 11.125 | 4.037 |
| September 12 | 2.313 | 3.075 | 14.333 | 4.333 |
| September 13 | 2.267 | 3.021 | 16.958 | 3.833 |
| September 14 | 2.054 | 2.838 | 13.292 | 3.558 |
| September 15 | 1.992 | 2.471 | 8.333 | 3.088 |

The mean temperature range is 1.47°C during 06:00–09:00, 2.01°C during 13:00–16:00, and 3.095°C during 18:00–21:00. All 20 sampled hours in each band exceed the exploratory 0.5°C tolerance. Differences persist across this forecast horizon, not merely one anomalous hour. These correlated forecast hours do not establish persistence across independent forecast runs, seasons, or real measurements.

## 2. Which variables vary geographically?

Temperature and apparent temperature provide useful thermal differentiation. Humidity ranges average **12.808 percentage points**, reaching **34**; wind ranges average **3.77 km/h**, reaching **6.4 km/h**. Units differ, so these magnitudes must not be ranked as a common numerical scale.

Precipitation probability is zero everywhere throughout this dry snapshot, so its geographic resolution is untested. UV differs by at most **0.05 index units**, including the afternoon band: effectively no useful spatial distinction here. UV nevertheless changes strongly over the day, with daily peaks around 7.2–7.35. Nighttime zeros alone do not explain the negligible afternoon spatial differences.

## 3. Which locations are most similar?

- **King Hussein Park–Dabouq**, 1.456 km apart: same returned coordinates (32, 35.8125); mean temperature difference 0.052°C, maximum 0.1°C. Humidity, wind, precipitation probability, and UV match exactly at all 120 hours.
- **Marj Al-Hamam–Amman National Park**, 4.831 km apart: same returned coordinates (31.875, 35.875); mean temperature difference 0.152°C, maximum 0.2°C. The other four variables likewise match exactly.

Both pairs satisfy all six diagnostic tolerances at every hour, even at half the chosen tolerances. Neither is exactly identical across all six default-response variables. With elevation downscaling disabled, Marj Al-Hamam–Amman National Park becomes exactly identical across all six variables. King Hussein Park–Dabouq remains near-identical. Eight requested points resolve to six distinct returned coordinate pairs in both batches.

These are strong indications of shared effective forecast signals. They do not establish identical real-world conditions. Conversely, Sports City–Weibdeh are only 2.64 km apart yet map to different returned coordinates, with mean temperature difference 0.636°C. Distance alone is not a reliable rule for merging forecasts.

## 4. Which locations contrast most?

By mean absolute temperature difference, **King Hussein Park–Naour** is strongest: **1.914°C** on average, up to **3.8°C**. Their apparent-temperature difference averages **2.613°C**, reaching **4.7°C**. Reported elevations are 1005 m and 796 m. This is a thermal contrast, not a recommendation of one location over another.

For mean wind and humidity differences, **Sports City–Naour** is strongest: **2.614 km/h** and **8.55 percentage points**, respectively. Different variables identify different contrasts; there is no single composite winner.

## 5. Is Open-Meteo granular enough?

**Provisionally yes for broad Amman-area and time-window inputs; not established for street-level discrimination.** Disabling downscaling reduces mean spatial temperature range from 2.208°C to 1.626°C; differences remain. Returned coordinates stay unchanged in this run. This suggests both broader forecast differences and elevation adjustments contribute, without proving their exact causal contributions across blended models.

[Open-Meteo documentation](https://open-meteo.com/en/docs) distinguishes model grid coordinates from the 90 m elevation dataset used for adjustment. Terrain resolution is not atmospheric resolution. The response does not expose per-variable model/cycle provenance. Avoid assuming that every field comes from the same resolved grid, or that shaded parks and exposed roads are separately modeled.

## 6. How should weather influence architecture?

Make weather **primarily a best-time factor and secondarily a location-ranking factor**, subject to explicit user constraints and eventually validated adverse-condition rules. Each point's mean daily temperature swing is **11.7–13.56°C**, much larger than the 2.208°C average simultaneous geographic range. This compares daily temporal ranges with simultaneous spatial ranges; it is descriptive evidence, not a causal or normalized importance score.

In later approved work, preserve requested coordinates, returned coordinates, elevation, units, time zone, retrieval time, and provider settings in a separate weather adapter. Keep deterministic decision logic independent of that adapter and of AI. Treat tiny differences as potential ties rather than manufacturing precision. Do not collapse all Amman points into one weather value; do not deduplicate solely by returned coordinates because elevation-adjusted temperatures differ. Any future cache must respect requested point/elevation and request settings.

Before committing scoring weights, repeat on independent forecast runs and wet/windy/seasonal conditions, and compare against observations if feasible. This snapshot establishes data variation, not provider accuracy. Representative neighborhood/road points are validation-only; production activity areas still require their own verification. No follow-up implementation is authorized by this report.

## Reproduce and validate

Completed validation on September 11, 2026: live fetch and offline replay succeeded; all five Node tests passed; ESLint passed with zero warnings; the production build passed, including TypeScript checks. npm checks ran through the installed user-level npm.cmd outside the sandbox because the sandbox did not resolve npm. No dependencies, application files, or AGENTS.md were changed.

From the repository root, using Node.js 24 with no additional dependencies:

```sh
node scripts/weather-granularity.mjs --replay
node --test scripts/weather-granularity.test.mjs
npm run lint
npm run build
```

Replay regenerates analysis.json and report.md from the saved snapshot without network access. Run `node scripts/weather-granularity.mjs` to fetch a new five-day snapshot; it overwrites snapshot.json, analysis.json, and report.md only after successful retrieval/validation. Archive the old snapshot first if retaining comparisons. **This findings.md is a manually reviewed interpretation tied to the September 11–15 snapshot and must be revisited after a new fetch.** Validation tests use clearly synthetic A/B fixtures plus independent recomputation of the saved live data; fixtures are not weather evidence.
