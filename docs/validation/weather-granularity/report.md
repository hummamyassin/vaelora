# Weather granularity: empirical output

Fetched 2026-09-10T23:00:33.248Z. Period 2026-09-11T00:00 through 2026-09-15T23:00, Asia/Amman (UTC+03:00). 120 aligned hours across 8 points. One forecast snapshot covering five consecutive days, not five independent observed days.

## Verified geographic probes

These are validation points, not a production activity dataset. Source checks confirm geographic identity, not route access, safety, or microclimate. See locations.json for corroboration and uncertainty.

| Location | Requested latitude, longitude | Returned latitude, longitude | Elevation m | Coordinate source |
|---|---|---|---|---|
| Al-Hussein Youth City / Sports City | 31.98305, 35.90458 | 32, 35.875 | 926 | [source](https://mapcarta.com/W972338370) |
| King Hussein Park | 31.98635, 35.82661 | 32, 35.8125 | 1005 | [source](https://mapcarta.com/W153915077) |
| Dabouq | 31.98806, 35.8113 | 32, 35.8125 | 997 | [source](https://mapcarta.com/de/N2859219638) |
| Abdoun Corridor | 31.9288004, 35.8819216 | 31.9375, 35.875 | 834 | [source](https://elevation.maplogs.com/poi/abdoun_corridor_amman_jordan.365963.html) |
| Jabal Al-Weibdeh | 31.96187, 35.91722 | 31.9375, 35.9375 | 866 | [source](https://mapcarta.com/34497592) |
| Marj Al-Hamam | 31.9017, 35.8517 | 31.875, 35.875 | 921 | [source](https://mapcarta.com/38962252/Map) |
| Naour | 31.87436, 35.82467 | 31.875, 35.8125 | 796 | [source](https://mapcarta.com/12841126) |
| Amman National Park | 31.8662, 35.8812 | 31.875, 35.875 | 901 | [source](https://latitude.to/map/jo/jordan/natural-parks/1/amman-national-park) |

## Method

Open-Meteo /v1/forecast, best_match, land cell selection, default elevation downscaling; five forecast days, Celsius and km/h. Exact URLs and full responses are in snapshot.json. Timestamps are joined by value, never assumed to match array positions. Nulls are excluded, never converted to zero; any incomplete hour has a null cross-location range. analysis.json records completeness, all hourly ranges, all 28 pairs, day/band summaries, and per-location daily temporal ranges.

Diagnostic near-identical tolerances: {"temperature_2m":0.5,"apparent_temperature":0.5,"relative_humidity_2m":3,"wind_speed_10m":2,"precipitation_probability":5,"uv_index":0.3} (humidity/precipitation in percentage points). A pair is near-identical when all six differences stay within tolerance for at least 90% of complete aligned hours; exact identity requires all six values equal at every hour. These are exploratory tolerances, not scores or validated perceptual/safety thresholds. Sensitivity at half/double tolerance is recorded. Nearby is described by haversine distance; pair tables retain distance without assuming a universal neighborhood radius.

## Hourly geographic ranges

| Variable | Unit | Mean | Median | P90 | Maximum | Hours above diagnostic tolerance |
|---|---|---|---|---|---|---|
| temperature_2m | °C | 2.208 | 2.1 | 3.2 | 3.8 | 120/120 |
| apparent_temperature | °C | 2.869 | 3.05 | 3.8 | 4.7 | 120/120 |
| relative_humidity_2m | % | 12.808 | 12 | 22 | 34 | 119/120 |
| wind_speed_10m | km/h | 3.77 | 3.8 | 4.9 | 6.4 | 116/120 |
| precipitation_probability | % | 0 | 0 | 0 | 0 | 0/120 |
| uv_index |  | 0.004 | 0 | 0 | 0.05 | 0/120 |

### morning (6–9, inclusive local hours)

| Variable | Unit | Mean | Median | P90 | Maximum | Hours above tolerance |
|---|---|---|---|---|---|---|
| temperature_2m | °C | 1.47 | 1.45 | 1.7 | 2.1 | 20/20 |
| apparent_temperature | °C | 2.185 | 2.35 | 3 | 3.1 | 20/20 |
| relative_humidity_2m | % | 13.3 | 12.5 | 20 | 30 | 20/20 |
| wind_speed_10m | km/h | 3.8 | 3.7 | 5.1 | 5.8 | 20/20 |
| precipitation_probability | % | 0 | 0 | 0 | 0 | 0/20 |
| uv_index |  | 0.003 | 0 | 0 | 0.05 | 0/20 |

### afternoon (13–16, inclusive local hours)

| Variable | Unit | Mean | Median | P90 | Maximum | Hours above tolerance |
|---|---|---|---|---|---|---|
| temperature_2m | °C | 2.01 | 2 | 2.2 | 2.5 | 20/20 |
| apparent_temperature | °C | 2.93 | 3.05 | 3.7 | 3.9 | 20/20 |
| relative_humidity_2m | % | 12.3 | 10.5 | 23 | 24 | 20/20 |
| wind_speed_10m | km/h | 3.825 | 3.8 | 4.4 | 4.6 | 20/20 |
| precipitation_probability | % | 0 | 0 | 0 | 0 | 0/20 |
| uv_index |  | 0.013 | 0 | 0.05 | 0.05 | 0/20 |

### evening (18–21, inclusive local hours)

| Variable | Unit | Mean | Median | P90 | Maximum | Hours above tolerance |
|---|---|---|---|---|---|---|
| temperature_2m | °C | 3.095 | 3.05 | 3.4 | 3.7 | 20/20 |
| apparent_temperature | °C | 3.47 | 3.5 | 3.9 | 4.1 | 20/20 |
| relative_humidity_2m | % | 9.85 | 9 | 16 | 18 | 19/20 |
| wind_speed_10m | km/h | 4.05 | 4.1 | 5.1 | 6.4 | 19/20 |
| precipitation_probability | % | 0 | 0 | 0 | 0 | 0/20 |
| uv_index |  | 0 | 0 | 0 | 0 | 0/20 |

## Pairwise comparison

Similarity is reported per variable; there is no composite VAELORA score. Temperature-order endpoints:

- Smallest: King Hussein Park / Dabouq: 1.456 km apart, mean absolute temperature difference 0.052 °C; all-variable near-hours 100%; same returned grid: true.
- Largest: King Hussein Park / Naour: 12.454 km apart, mean absolute temperature difference 1.914 °C; all-variable near-hours 0%; same returned grid: false.
- Exact six-variable pairs: 0/28.
- Near-identical pairs: 2/28.

| Pair | Distance km | Same returned grid | Mean temperature delta °C | Mean wind delta km/h | Near hours % |
|---|---|---|---|---|---|
| King Hussein Park / Dabouq | 1.456 | true | 0.052 | 0 | 100 |
| Marj Al-Hamam / Amman National Park | 4.831 | true | 0.152 | 0 | 100 |
| Al-Hussein Youth City / Sports City / Abdoun Corridor | 6.4 | false | 0.311 | 1.346 | 31.667 |
| Abdoun Corridor / Amman National Park | 6.961 | false | 0.316 | 1.206 | 35 |
| Abdoun Corridor / Marj Al-Hamam | 4.149 | false | 0.398 | 1.206 | 25 |
| Al-Hussein Youth City / Sports City / Amman National Park | 13.179 | false | 0.532 | 1.415 | 21.667 |
| Al-Hussein Youth City / Sports City / Marj Al-Hamam | 10.331 | false | 0.566 | 1.415 | 21.667 |
| Al-Hussein Youth City / Sports City / Jabal Al-Weibdeh | 2.64 | false | 0.636 | 1.378 | 10.833 |
| Jabal Al-Weibdeh / Amman National Park | 11.168 | false | 0.653 | 2.052 | 14.167 |
| Abdoun Corridor / Jabal Al-Weibdeh | 4.961 | false | 0.67 | 1.304 | 13.333 |
| Jabal Al-Weibdeh / Marj Al-Hamam | 9.11 | false | 0.708 | 2.052 | 14.167 |
| Dabouq / Marj Al-Hamam | 10.332 | false | 0.849 | 1.677 | 3.333 |
| Abdoun Corridor / Naour | 8.115 | false | 0.857 | 1.45 | 9.167 |
| Naour / Amman National Park | 5.415 | false | 0.889 | 2.167 | 5 |
| King Hussein Park / Marj Al-Hamam | 9.706 | false | 0.897 | 1.677 | 1.667 |
| Dabouq / Amman National Park | 15.071 | false | 0.993 | 1.677 | 0.833 |
| Marj Al-Hamam / Naour | 3.969 | false | 1.03 | 2.167 | 3.333 |
| King Hussein Park / Amman National Park | 14.319 | false | 1.043 | 1.677 | 0.833 |
| Al-Hussein Youth City / Sports City / Dabouq | 8.815 | false | 1.047 | 1.283 | 0.833 |
| Al-Hussein Youth City / Sports City / Naour | 14.246 | false | 1.091 | 2.614 | 2.5 |
| Al-Hussein Youth City / Sports City / King Hussein Park | 7.363 | false | 1.098 | 1.283 | 0 |
| Jabal Al-Weibdeh / Naour | 13.076 | false | 1.162 | 2.454 | 0 |
| Dabouq / Abdoun Corridor | 9.371 | false | 1.171 | 1.021 | 0 |
| King Hussein Park / Abdoun Corridor | 8.257 | false | 1.223 | 1.021 | 0 |
| Dabouq / Jabal Al-Weibdeh | 10.407 | false | 1.271 | 1.467 | 10.833 |
| King Hussein Park / Jabal Al-Weibdeh | 8.97 | false | 1.314 | 1.467 | 10 |
| Dabouq / Naour | 12.706 | false | 1.862 | 1.656 | 0 |
| King Hussein Park / Naour | 12.454 | false | 1.914 | 1.656 | 0 |

## Downscaling control

A second batch sets elevation=nan (all eight points), keeping other settings fixed. It is a diagnostic of combined downscaling/cell-selection effects, not a controlled observation of true microclimates. Requests may straddle model updates.

| Variable | Unit | Mean geographic range | Median | P90 | Maximum | Hours above tolerance |
|---|---|---|---|---|---|---|
| temperature_2m | °C | 1.626 | 1.5 | 2.4 | 3.4 | 116/120 |
| apparent_temperature | °C | 2.253 | 2.3 | 3.3 | 4.1 | 120/120 |
| relative_humidity_2m | % | 12.925 | 12 | 22 | 34 | 119/120 |
| wind_speed_10m | km/h | 3.9 | 3.8 | 5.1 | 6.4 | 119/120 |
| precipitation_probability | % | 0 | 0 | 0 | 0 | 0/120 |
| uv_index |  | 0.004 | 0 | 0 | 0.05 | 0/120 |

Control exact pairs: 1/28; near-identical pairs: 2/28.

## Interpretation limits and provenance

[Open-Meteo documentation](https://open-meteo.com/en/docs) describes returned coordinates as grid-cell centers and default elevation adjustment using a 90 m DEM. A 90 m terrain dataset does not imply 90 m atmospheric resolution. best_match can blend models/variables, and this response does not expose per-variable model/cycle identity; returned-coordinate equality is suggestive, not proof of common provenance for every variable. Numerical differences are forecast differences, not measured accuracy or statistical significance. Repeated hours are correlated. Nighttime UV zeros and dry-period precipitation equality can inflate similarity. Street shade, trees, buildings and road exposure are not established by this experiment.

Weather data: [Open-Meteo, CC BY 4.0](https://open-meteo.com/en/terms). Map references retain source attribution; OSM-derived points are © OpenStreetMap contributors ([ODbL](https://www.openstreetmap.org/copyright)); GeoNames references retain their identifiers. See findings.md for the evidence-based architecture recommendation.
