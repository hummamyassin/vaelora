# Greater Amman activity areas: finalized desk-research selection

Reviewed **12 September 2026**. The previous session left eight selected records,
30 research proposals, validation and tests uncommitted. This pass reviewed that
work, retained the eight, narrowed three existing proposals into usable records,
and investigated five additional running leads. No location count was a selection rule.

**35 proposals: 11 production, 17 uncertain, five rejected, two merged.** All 11
selected areas support walking; five also support running. Eight are `verified`
and three `supported`. These are desk-research evidence labels, not field inspection,
live opening confirmation or safety certification. Proposal counts include broad
areas subsequently narrowed or merged; they are not counts of distinct venues.

## Files and evidence standard

- [Production data](../../../src/data/activity-areas.ts): domain-compatible records,
  coordinates, characteristics, activity fit, evidence notes and operational caveats.
- [Research ledger](candidates.json): every original proposal and new lead, disposition,
  review date, rationale, sources and production crosswalk. Original evidence is
  retained when a broad proposal is narrowed.
- [Offline validator](../../../scripts/validate-activity-areas.ts) and
  [tests](../../../tests/data/activity-areas.test.ts): integrity and eligibility behavior.

The existing minimum remains: an identifiable outdoor area, defensible coordinate,
Greater Amman scope, evidence of public use and material support for its stated
activity. A park name or map pin alone is insufficient. Plans do not establish
completed facilities; school access anecdotes do not establish public permission.

- `supported`: substantive, attributable evidence supports the bounded activity
  and public-use claim, with a matched geographic reference. Single-source activity
  evidence or material inference remains explicit.
- `verified`: independent substantive accounts corroborate identity/public use and
  the stated activity scope. This does not mean every attribute is known, that two
  authors independently tested running, or that we inspected the site ourselves.
- `candidate`: unresolved location, scope, access or useful activity provision.
  Rejected/merged research rows retain this non-production status.

Independent sources mean separate reporting or firsthand/official accounts.
Syndicated municipal announcements count as one source; a guide and its linked route
count as one activity lineage. Map directories supply coordinates, not a second
activity assessment. Generic SEO claims, opening-hour boilerplate, reviews without
clear dates, and social posts alone do not justify promotion.

`suitable` means evidence supports the activity in the described scope. `limited`
retains short leisure spaces, light-jogging constraints, historical track-condition
uncertainty or mixed road use. Walking inferred from a running route is identified
as an inference. `unknown` running fit does not mean running is prohibited.

## Selected production locations

Every row has a separate coordinate reference, access review, attribute review,
qualification and limitations in the ledger. All source URLs and claim-level notes
are in the production records. R/W below means running/walking fit.

| Selected area | Status; R/W | Why it qualifies and scope limits |
|---|---|---|
| Al-Hussein Youth City / Sports City | verified; suitable/suitable | Great Runs documents flat wooded dirt/asphalt pedestrian exercise paths. Jordan Tourism Board independently recommends jogging/running on the forest track. Excludes stadiums and controlled facilities. Upgraded from supported after corroboration. |
| King Hussein Park | verified; suitable/suitable | Club-informed running guide documents paved park paths; tourism board corroborates public park use. No optional Dabouq road extension included. Slope remains unknown. |
| Rainbow Street | verified; unknown/limited | Tourism board and independent travel reporting support strolling. Public commercial street with traffic; no uninterrupted training or route-wide material/slope claim. |
| Wakalat Street | verified; unknown/limited | Tourism board walking recommendation plus CSBE's firsthand pedestrian-space study. Tourism brochure explicitly establishes paving. Short shopping street; no running loop. Upgraded after independent corroboration. |
| Al-Abdali Boulevard | verified; unknown/limited | Operator describes the pedestrian walkway; independent Lonely Planet reporting corroborates promenade use. Managed leisure space subject to events/access conditions. Upgraded after corroboration. |
| Japanese Park, Abdoun | verified; unknown/limited | CSBE and municipality establish a public ornamental garden. Limited walking is an interpretation of visitable paths, not a training-route assessment. Distinct from the National Gallery's internal Japanese garden. |
| National Gallery of Fine Arts Park | verified; unknown/limited | Firsthand CSBE design account establishes paved public garden paths; operator publishes park visiting hours. Multiple levels, small extent and restricted hours limit exercise. |
| Hashemite Plaza | supported; unknown/limited | GIZ public-space field-research inventory, a walking-path directory and named pedestrian-square geographic record support leisure use. Indexed GIZ excerpts only; no detailed material claim. Excludes paid archaeological interiors. |
| Al-Nashama Public Park | verified; limited/suitable | July 2026 firsthand reporting observes walking/light jogging in the free public park. August municipal completion statement confirms rubber-track resurfacing. Sharp turns and family use preclude fast training. Excludes courts and unconverted Royal Village property. |
| King Abdullah II Park, Al-Muqabalain | supported; limited/suitable | Royal Court inauguration establishes the public park; municipal account describes an opened jogging/cycling facility. WHO corroborates park activity investment, but in a women-only zone excluded here. Current general track condition/surface lacks independent assessment; running stays limited. |
| Ghamadan / King of Bahrain Forest Perimeter | supported; limited/limited | Running guide and linked route establish the surrounding paved/dirt circuit. Municipality corroborates Ghamadan identity/public-space context. Walking is inferred. Shared roads; no official forest trails, continuous sidewalk or exclusive pedestrian access claimed. |

Sports City and King Hussein Park remain the strongest evidence-backed choices for
regular running. Al-Nashama adds a residential-area public exercise park, King Abdullah
II adds southern urban park coverage, and Ghamadan adds a nature-adjacent outdoor road
option. This is **not** a comprehensive citywide running network: a standalone
residential street circuit and an in-scope woodland trail still need better evidence.

## Coordinates, attributes and access

Coordinates are representative points, not entrances, boundaries or navigation
instructions. Geographic sources are reviewed together with the named activity scope.
Mapcarta/OSM feature IDs distinguish Sports City, Hussein Park, Japanese Park,
Hashemite Plaza and the Al-Muqabalain park. Wakalat and Boulevard coordinates were
converted from degrees/minutes/seconds; Rainbow was rounded from its named street
reference. The National Gallery point comes from its named OSM-derived Pacer listing.

Al-Nashama's [named listing](https://www.trip.com/travel-guide/attraction/amman/al-nashama-park-136890032/)
gives short Plus Code `VRQV+XJ3, Amman`, also found in an Amman Now listing (not counted
as independent activity evidence). Recovery near Amman yields `8G3QVRQV+XJ3`.
Using the [Open Location Code specification](https://github.com/google/open-location-code/blob/main/Documentation/Specification/specification.md),
the cell bounds are latitude `[31.889875, 31.889900)` and longitude
`[35.84403125, 35.84406250)`; center `31.8898875, 35.844046875`, rounded in production
to `31.88989, 35.84405`. This agrees with the reported former Royal Village/Al-Salam
Street context. Precision of the code is not proof of entrance accuracy.

Ghamadan uses the **start of the actual linked running circuit** at
`31.85796, 35.89325`, not the broad forest centroid. The Al-Muqabalain park uses
OSM way `483730363` at `31.90678, 35.92581`; it is not Wadi Saqra's King Abdullah I
Gardens, an Irbid namesake or Qweismeh stadium.

The validator's `31.85–32.02 N, 35.80–35.96 E` envelope catches gross errors for this
reviewed cohort. It is **not a Greater Amman municipal polygon**. Manual scope review
remains necessary, especially for southern/peripheral sites. No arbitrary distance
deduplication or neighborhood centroids were used.

- Flat terrain is established only at Sports City. Aggregate route elevation gain,
  city hills and garden steps do not justify assigning other terrain classes.
- Known surfaces: Sports City dirt/paved; Hussein Park, Wakalat and Gallery Park
  paved; Nashama rubber exercise track (`track`); Ghamadan paved/dirt. The rest remain
  `unknown`. A listed surface does not promise an entire route of that surface.
- General public use does not mean 24/7, free access to every subfacility, step-free
  access or permission for racing. Gallery park hours are listed as 09:00–14:30;
  confirm park-specific days/fees instead of transferring gallery closure rules.
- King Abdullah II's historical construction closure was followed by the November
  2019 inauguration. A municipal site's 2026 footer is not the article date. WHO's
  2024 women-specific facility does not establish unrestricted use of that zone.
- Nashama's scheduled August 2026 maintenance closures are superseded by the
  August 27 completion report. Conflicting reported track lengths are not modeled.
- Ghamadan is a mixed-use road circuit around attractions. Public forest context
  does not establish access inside the zoo, paid attractions or forest trails.

These unresolved details are retained, not replaced with plausible guesses. Unknown
terrain/surface fails a corresponding hard preference. Opening hours, current
closures, uninterrupted distance and user pace are not enforced by the existing
engine; short walking spaces cannot be assumed to support any requested duration.
The dataset is finalized for this phase, while live recommendation use still needs
operational access handling. No live application feature was enabled here.

## Remaining uncertain candidates (17)

All were reviewed; retention here is a deliberate exclusion from production. The
ledger preserves links, original evidence and the precise missing condition.

| Candidate | Unresolved requirement |
|---|---|
| Dabouq sidewalk circuit | Guide identifies Al-Hijaz, Al-Shab and Saeed Kheir streets, but its linked route map is the park loop. Need a defensible standalone circuit point/scope. |
| Abdoun Corridor / Amman walkway | Municipal walking event and current jogging reporting are promising. Original road point is not a verified walkway pin; resolve the actual pedestrian segment. |
| Deir Ghbar | District walkability study cannot establish one named path or all sidewalks. |
| Amman National Park | April 2026 tracks were proposed; completion/access to a precise usable activity subarea not established. |
| Princess Iman Park | Named pin and older playground reviews do not establish useful current exercise paths. |
| Zahran Park | Resolve Methqal Al-Fayez listing versus namesakes and assess paths. |
| Scandinavian Forest | Running evidence exists; Greater Amman boundary, public access and canonical activity pin unresolved. |
| Citadel surroundings | Define public approach/steps separately from paid archaeological interior. |
| Prince Hashem Bird Garden | Old visitor account establishes family recreation, not current useful exercise paths/restrictions. |
| King Abdullah I Gardens, Wadi Saqra | Confirm rehabilitation/opening status and usable paths; distinct from Al-Muqabalain. |
| Jubeiha former amusement city | Confirm completed public-park conversion and current activity access. |
| Al-Shoura Park | Renovation and walking-path directory promising; corroborated coordinate needed. |
| Al-Huda Park | Municipal project and named Waze listing need reconciliation with actual public exercise provision. |
| ICS rural-road routes (new lead) | Published running routes, but school-start access and municipal boundary membership unresolved. |
| 60th Street walkway, Zahran (new lead) | Completed walking/cycling facility reported; exact segment pin unresolved. |
| Al-Rahab Street walkway, Al-Nasr (new lead) | Opening reported February 2026; exact segment and running assessment unresolved. |
| Shafa Badran walkway (new lead) | Under implementation in May 2026 reporting; completed public opening and pin not established. |

## Rejected and merged proposals

| Proposal | Decision and reason |
|---|---|
| Khalda | Rejected broad neighborhood formulation; no named activity area. |
| Jubilee / Sweileh | Rejected conflation of Al-Jubilee and Mousa Saket parks; research separately if revisited. |
| Naour countryside | Rejected vague region, no bounded route/access/scope. The later specific ICS route lead remains uncertain separately. |
| Wasfi Al-Tal Forest | Rejected from Amman-first scope: documented in Balqa, municipal membership unsupported. |
| Amman Baccalaureate School track (new lead) | Rejected: anecdotal guard/alumni-dependent entry does not establish public access. |
| Jabal Al-Weibdeh | Merged/narrowed into National Gallery Park. Whole district is not an alias of the park. |
| Downtown Amman | Merged/narrowed into Hashemite Plaza. Surrounding streets/interiors not implicitly approved. |

Additionally, three original proposal IDs are preserved as **production crosswalks**:
`marj-al-hamam` → `al-nashama-park`, `king-abdullah-ii-parks` →
`king-abdullah-ii-park`, and `king-of-bahrain-forest` → `ghamadan-perimeter`.
These are scope corrections, not three extra locations or additional merged rows.

## Retrieval limitations and maintenance

Some official/tourism sources were available as indexed text while direct retrieval
failed: JTB brochure excerpts, the GIZ 2021 PDF, WHO Q4 2024 newsletter and Nashama
resurfacing report. Only visible claims were used. The full GIZ PDF was too large
for the research tool. Failed municipal URLs, Amman Now's security checkpoint and
rejected public geocoder requests were not treated as negative location evidence.
No paywalls or access controls were bypassed. Source notes distinguish indexed
evidence from direct text; no inspection of unavailable photos is claimed.

Historical research is useful but does not guarantee present conditions. Future
maintenance should recheck closures/access, path condition and source links before
strengthening fit labels, resolving unknowns or promoting candidates. No live HTTP
check is part of the offline validator: passing tests validates consistency, not truth.

Geographic references include **© OpenStreetMap contributors**, available under the
[Open Database License](https://www.openstreetmap.org/copyright). Keep source
attribution when reusing/exporting these records. Source articles are linked with
short paraphrases; their text and images are not redistributed.

## Validation commands

Run `npm run validate:data`, `npm test`, `npm run typecheck`, `npm run lint`, and
`npm run build`. Tests cover research/production consistency, malformed records,
duplicate identity, coordinate mismatches, evidence/access-review omissions,
candidate exclusion and real-data running/walking and surface eligibility.
See the repository README for the temporary npm CLI fallback on the setup machine.

Validation on 12 September 2026: dataset validation passed (35/11), all 38 tests
passed (11 dataset, 22 domain, five weather proof-of-concept), TypeScript passed,
and lint passed with zero warnings. The default Turbopack build encountered a
Windows CSS-worker spawn denial, also on the unsandboxed retry. Production build
validation **passed** using `npm run build -- --webpack`, the
[documented Next.js fallback](https://nextjs.org/docs/app/getting-started/installation).
No dependency, bundler default or application feature was changed to mask the issue.
