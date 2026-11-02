# Jordan places and trails: sources, method and limits

VAELORA’s curated library has **30 places** in **10 of Jordan’s 12 governorates**:

| Tier | Count | What it means |
| --- | --- | --- |
| **VAELORA reviewed** | 11 (Amman) | Researched and approved through the research crosswalk in [`docs/research/activity-areas`](research/activity-areas/README.md): dated decisions, coordinate references, access and attribute reviews. Unchanged by the Jordan expansion. |
| **Open data** | 19 (9 trails, 10 places) | Built from open and public sources listed below. Identity, extent and geometry are sourced; **nothing here is field-checked by VAELORA**. |
| **Dynamic location** | not stored | A search result or GPS position is only a ~2 km forecast cell. It never gains place attributes and is never presented as a trail or a reviewed place. |

Data lives in `src/data/activity-areas.ts` (reviewed), `src/data/jordan-places.ts` (open data), `src/data/route-summaries.ts` and `public/routes/*.json` (generated route figures and geometry). `src/data/outdoor-places.ts` combines them.

## Regional distribution

| Governorate | Places |
| --- | --- |
| Amman | 11 reviewed places; Jordan Trail 302 (Iraq al-Amir to Husban) |
| Irbid | King Abdullah II Park, Irbid; Yarmouk Forest Reserve |
| Ajloun | Ajloun Forest Reserve; Jordan Trail 104 (Rasoun to Ajloun Castle) |
| Jerash | Dibeen Forest Reserve |
| Balqa | Jordan Trail 301 (As-Salt to Iraq al-Amir) |
| Zarqa | Azraq Wetland Reserve |
| Karak | Ibex Trail, Mujib; Wadi al-Hasa Upper Trail |
| Tafilah | Dana: Rummana Mountain, White Dome and Shaq al-Reesh trails |
| Ma'an | King Abdullah I Gardens; Ma'an Model Park |
| Aqaba | Aqaba City Park; Al-Darb Park; Aqaba Bird Observatory; Jordan Trail 806 |
| Madaba | none filed here yet (JT 302 ends in Husban; Mujib's trail is filed under Karak) |
| Mafraq | **none yet**: no candidate had enough open evidence. Weather planning, search and free tracking still work there. |

## Sources

| Source | Used for | Licence and attribution |
| --- | --- | --- |
| OpenStreetMap (api.openstreetmap.org) | Identity, extent and reference points of parks and reserves; trail route relations and their geometry; mapped footpath length inside parks | © OpenStreetMap contributors, ODbL 1.0. Attribution is shown in the app (map, place sources, profile) and in each `public/routes/*.json`. |
| Copernicus GLO-90 DEM via the Open-Meteo Elevation API | Elevation profiles, climb, descent, high and low points along each trail | Copernicus DEM © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA. Open-Meteo API data CC BY 4.0. |
| Wikidata | Identity cross-checks for reserves; coordinates of town weather reference points | CC0 |
| geoBoundaries (gbOpen JOR) | Jordan's country boundary (ADM0, CC BY 4.0) and governorates (ADM1, CC BY 2.5), simplified | geoBoundaries, Runfola et al., www.geoboundaries.org |
| RSCN (rscn.org.jo) | Operator of the reserves; cited for access rules, not for figures | Linked, not copied |
| Jordan Trail Association (jordantrail.org) | The national trail the four sections belong to | Linked, not copied |

**Not used as data sources:** AllTrails, Komoot and similar products. They were not scraped or copied (no descriptions, photos, reviews, ratings, difficulty labels or route files). VAELORA's descriptions are its own words.

## How each figure is produced

- **Reference point.** For parks and reserves it is the centre of the mapped extent, not an entrance. For trails it is the start of the mapped line.
- **Distance.** Measured on the chained OSM geometry (`scripts/build-route-data.mjs`). It is shown as the mapped distance. Where OSM has its own `distance` tag that differs (White Dome: mapped 6.1 km, tag 8 km), the record notes it.
- **Route shape.** A line that closes within 150 m is a loop. Jordan Trail sections with `from`/`to` tags are point to point. Lines mapped one way, where the return is not recorded, are shown as "one way as mapped" and are never doubled. Rummana, for example, is described by OSM as campsite–summit–campsite but mapped one way.
- **Elevation.** The DEM is sampled about every 100 m (200 m on lines over 12 km). Climb and descent come after a 3-point moving average with a 2 m threshold. The 90 m DEM smooths small features, so climb is approximate.
- **Difficulty.** VAELORA's own estimate, not an operator's grading. "Equivalent km" is distance plus 1 km per 100 m of climb. It is easy under 5, moderate from 5, hard from 14. A steep average (40 m per km or more) is never easy.
- **Time.** A rough Naismith-style moving time: 4.5 km/h walking, plus 1 minute per 10 m of climb. Always shown with "≈".
- **Walking and running fit.** Parks under open data are "limited" for walking, because their path layout is not mapped. Reserves and trails with mapped paths are "suitable" for walking. **Running fit is "unknown" for every open-data entry**, so running searches do not list them.

## What VAELORA does not verify

Safety, lighting, crime, water, toilets, opening hours, fees, guiding requirements, current trail conditions, surfaces, closures and seasonal access. Reserve entries carry an RSCN access caveat. Canyon routes carry a flash-flood caveat. Long Jordan Trail sections carry a transport, water and daylight caveat. Ask VAELORA is instructed never to assert any of these.

## Validation

`npm run validate` (and CI) runs `scripts/validate-jordan-places.ts`, which fails the build on:
- duplicate IDs or slugs;
- coordinates outside Jordan, or a governorate that disagrees with the coordinate (internal-boundary tolerance 1.5 km; a trail may be filed under either end);
- invalid activities or fits;
- missing Arabic or bilingual caveats;
- open-data entries marked "verified", or without an OpenStreetMap source;
- trails without routes, or routes on non-trails;
- implausible distances or elevation ranges;
- a loop claimed for a line that does not close;
- a reference point that is not the route start;
- geometry leaving Jordan;
- a malformed profile, or a profile whose range or length disagrees with the summary;
- a geometry file without attribution.

## Rebuilding

```sh
node scripts/build-jordan-geography.mjs <adm0.geojson> <adm1.geojson>
node scripts/build-route-data.mjs [osm-cache-dir]
node scripts/research/osm-place-facts.mjs way/<id> relation/<id>
npm run validate
```

Adding a place means: an OSM object, an entry in `jordan-places.ts` with VAELORA's own bilingual description, a route manifest entry when it has a line, and a passing validation.
