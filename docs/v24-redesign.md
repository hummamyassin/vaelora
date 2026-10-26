# V2.4 redesign, navigation, backup and CI

V2.4 rebuilds VAELORA's interface on one design system and closes four audit findings:
fragile local history, state-only navigation, no CI, and stacked UI code. Product logic,
scoring, weather, GPS filtering, metrics, privacy rules and AI grounding are unchanged.

## Design direction

VAELORA reads like a good forecast chart. The signature element is the **meteogram strip**
on Home: one column per remaining forecast hour, temperature written above, bar height and
fill colour taken from the existing scorer's comfort band (comfortable is tallest), and the recommended outing
bracketed in a single reserved "course" colour. Nothing is interpolated; every column is a
real forecast hour, and the bracket is the window `dailyPlan` already returns.

Rules the system follows:

- **One decision per band.** Home's ink band answers what, when, where and why, and holds
  the one primary action.
- **One reserved colour.** Course rose (`--course`, `--course-on-band`) marks only the active
  outing: the window time, its bracket, the Start button, the live route and the selected
  place. It is never decorative.
- **Condition colours mean conditions.** The green, amber and vermilion ramp appears only for
  comfort bands. Walking and running use their own blue and burgundy.
- **Track owns the viewport.** While a session is live, the whole page switches to the ink
  ground for outdoor legibility, with the timer as the largest element.

## Tokens

All colour, type, spacing, radius, motion and shell values live in
`src/app/styles/tokens.css`, with light and dark sets. Contrast of every text pair was checked
against WCAG AA (4.5:1 for text). Cascade layers (`reset, base, components, screens,
utilities`) replace the old `!important` stack; the only `!important` left is `[hidden]`.

| Role | Light | Dark |
| --- | --- | --- |
| Ground / surface | `#eceff1` / `#f7f9fa` | `#0a1018` / `#111a25` |
| Ink band | `#0d1724` | `#121d2a` |
| Action and course | `#9b1c3c` (band `#ff4d7a`) | `#ff5c7f` |
| Walking / running | `#1e5fa8` / `#8a1538` | `#6cb0f0` / `#ff7a96` |
| Good / fair / poor | `#0f7546` / `#8a5200` / `#a8340a` | `#4cc38a` / `#f2b544` / `#ff8a5c` |

## Typography

One variable grotesk, **Archivo**, whose width axis carries hierarchy: expanded for the
wordmark, normal for text, condensed heavy tabular figures for every metric (timer, distance,
pace, window, score). **Readex Pro** sets Arabic and Arabic-Indic numerals. Both are
self-hosted at build time by `next/font`, so the CSP keeps `font-src 'self'` and the PWA
caches them. Product type uses a fixed rem scale; only the window time, timer and recap
distance scale with the viewport.

## Screens

- **Home**: ink plan band (activity and duration segments, decision headline, window and
  score, meteogram, weather line, Start), then Near you as a ranked list, reviewed places
  as a rail, weekly progress, and a collapsed Forecast tools section that keeps the area
  forecast, hour factors, top matches, Compare, 3-day outlook, Saved areas and forecast map.
- **Map**: full-bleed map with square score markers, a course-coloured selected marker, a
  hollow blue reference point, dashed clusters, a legend, and a place card.
- **Track**: ready panel, recovery panel, live instrument (state, timer, distance and pace,
  secondary metrics, GPS quality, map, sticky controls), recap (route, distance hero, stats,
  conditions at start, save status, GPX, share card).
- **Share card**: same model and privacy masking; redrawn in the chart palette with the
  wordmark and condensed metrics. When the masked route is too small to draw, the card shows
  an explicit dashed "Route hidden for privacy" frame instead of any stand-in shape. The in-app
  preview follows the exported layout.
- **Profile**: identity, all-time stats, by-activity totals, recent activities, monthly
  bests, saved areas, settings, then data and privacy.
- **Ask VAELORA**: planning context first (reference area, activity, duration, day), a
  composer, suggestions, then a structured answer with the places involved and the factual
  trace.

## Arabic

Arabic uses Readex Pro and full RTL mirroring (the meteogram runs right to left from "Now").
All numbers, times and metrics use Western digits (`ar-JO-u-nu-latn`) so one screen never mixes
numeral systems. Every interface string lives in a typed dictionary with an Arabic entry.

## Motion

Short, interruptible CSS transitions on opacity, colour and transform (140 to 240 ms, strong
ease-out). Press feedback scales controls to 0.97. Sheets rise 24 px on open. The live dot
pulses only while recording. Under `prefers-reduced-motion`, movement is removed and colour
and opacity feedback stays.

## Navigation

`src/lib/app-route.ts` defines hash routes; `src/components/use-app-route.ts` binds them to
the History API.

| Route | Meaning |
| --- | --- |
| `#/home`, `#/map`, `#/track`, `#/compare`, `#/outlook`, `#/saved` | Screens |
| `#/home?place=<reviewed id>` | Place profile sheet |
| `#/track?activity=<local id>` | Saved activity recap |
| `?sheet=ask|profile|filters|area` | Sheets over any screen |

Screens and overlays push entries, so Back moves within the app; closing an overlay steps
back when this session opened it and otherwise replaces the entry. Refresh restores the
route. Each screen keeps its own scroll position. The recorder stays mounted across screens,
so navigation never stops GPS; a live session never opens a recap, and an unsaved recap is
not closed by Back. Next.js history fields are preserved so its router does not reload.

## Backup and restore

`src/domain/tracking/backup.ts` defines the format
`{ format: "vaelora-activity-backup", version: 1, exportedAt, activities }`. Export includes
finished activities only. Import parses strictly: every activity must pass the existing
`validateActivity` rules and be finished, IDs must be unique in the file, and any failure
rejects the whole file with a specific reason. Activities whose ID already exists locally are
skipped in a single IndexedDB transaction. The app requests persistent storage after the
first saved activity and from Profile, and shows whether storage is protected. Nothing is
uploaded.

## CI

`.github/workflows/ci.yml` runs `npm ci`, `npm test`, `npm run lint`, `npm run typecheck`,
`npm run validate`, `npm run eval` (offline replay) and `npm run build` on pull requests and
pushes to `main`, with read-only permissions and no secrets. Browser QA (`npm run
qa:browser`) stays local because it depends on Edge and a running server.

## Code cleanup

- Removed unused UI trees (`vaelora-app`, `planner-app`, `planner-results`) and their
  request helper after confirming nothing imports them; the `/api/recommendations` endpoint
  and its server tests remain.
- Replaced seven global stylesheets (about 4,500 lines, 58 `!important`) with four layered
  files.
- Split the 1,700-line shell into the shell, `forecast-tools`, `ask-panel`, `plan-sheets`,
  `use-area-forecast` and `use-app-route`.
- Moved interface copy into typed English and Arabic dictionaries under `src/lib/copy/`, with
  a test that every entry has Arabic, matching placeholders and no em dashes.
- The service worker registers once instead of once per screen.

## V2.4.1 identity alignment

The owner's identity sheet (VAELORA app icon, lockup and palette) is now the visual source of
truth; see [DESIGN.md](../DESIGN.md).

- **Palette:** #231F1C deep brown, #F4EFE6 warm cream, #C8913A gold, #B5532A terracotta,
  #5F6B34 olive, with contrast tints (#A84A23, #E07A4A, #8E6420, #93A45A). Gold marks the best
  moment (window time, meteogram bracket); terracotta marks motion (Start, recording, the live
  route, the selected marker); olive and gold carry conditions, and poor conditions read as faded
  thread. Light theme is cream with brown ink; dark theme is #231F1C with cream text.
- **Icon and PWA:** the app icon, maskable icon, Apple touch icon, favicon and in-app mark are
  cropped from the identity sheet's own artwork (masked to the icon's rounded square), not redrawn.
- **Type:** Cormorant Garamond for the tracked wordmark and display lines; Archivo for interface
  and metrics (less condensed than V2.4); Readex Pro for Arabic.
- **Stitch motif:** the icon's three-row cross-stitch band closes the Home plan band, the Track
  ready panel and the share card; a single row divides the recap and closes location art; the
  VAELORA Score gains a ten-stitch meter; this week becomes seven stitched days; Ask's thinking
  state sews five stitches; the dock marks the current screen with a terracotta stitch.

## V2.4.2 premium refinement

- **Typography:** the wordmark serif (Cormorant Garamond, now with 700) carries key labels (tracked caps), section titles, key metrics (lining tabular figures) and primary actions. Arabic keeps Readex Pro for labels, headings and buttons; figures share the serif. Body, controls and AI answers stay in Archivo / Readex Pro.
- **Material:** a separate `material` CSS layer adds polished metal (gradient, sheen, tinted shadow) to primary actions, selected states, the dock, key figures, meteogram bars, progress threads and map markers. Base surfaces stay flat. Contrast is checked on the mid-tone of every gradient.
- **Share card:** metal gradient fills for the wordmark, activity, figures and route; figures stay in the lining sans because canvas cannot request lining figures.

## V2.4.3 metallic material system

The whole brand palette is now a material system in five metals from the material reference:
black chrome (`#050506` `#1C1D20` `#5E6268` `#C9CDD2`), platinum (`#8E949A` `#C7CBCF` `#F4F6F8`
`#FFFFFF`), polished gold (`#6E4508` `#B47E22` `#E9C065` `#FFF1C2`), copper (`#5A200C` `#A44A22`
`#DC7B48` `#FFC7A2`) and green metal (`#26300F` `#56651F` `#93A645` `#E3EEA6`). Deep brown
surfaces become black chrome, important cream becomes platinum, terracotta becomes copper and
olive becomes green metal. See [DESIGN.md](../DESIGN.md) for the role of each metal.

- **Tokens:** `tokens.css` holds the raw stops and composed tokens per metal (surface, body,
  subtle/raised/band/well, text, text on cream, border, edge, shadow), shared brushed grain and
  glint layers, theme-aware metal text, stitch thread stops, and premium rims and rules.
  `material.css` only assigns them. Solid semantic tokens (`--action`, `--good`, `--fair`, map
  and route colours) were re-based onto the metal mid-tones.
- **Construction:** one light from the top left; grain, soft highlight, body gradient
  (specular, bright, mid, edge shade), top reflection, lower shade, inner line, tinted shadow.
  Pure CSS gradients and pseudo-elements; no images.
- **Stitch:** platinum thread by default (SVG gradient strokes with a drop shade and reflective
  edge; CSS crosses lit along each bar; the dock stitch masked from the thread metal). The score
  meter and this week keep semantic green metal, gold and copper.
- **Map:** copper route thread (outline, edge, body, core, glint layers), chrome marker bodies,
  gold verified rims, a copper selected marker with a platinum rim, platinum clusters. Tiles are
  never filtered.
- **Share card:** black chrome base with brushed grain, platinum wordmark and figures, copper
  route thread, gold context, the score in green metal when comfortable, platinum stitch; the
  minimal template sets the distance on a copper plate in both the preview and the export.
  Privacy masking is unchanged.
- **Accessibility:** text on metal surfaces sits on the 30 to 70% band and was checked against
  every point of that band (copper 4.86:1, green metal 4.90:1, platinum 5.50:1 with ink). Metal
  text uses a darkest stop that passes on its ground; forced-colours mode drops all gradient
  text. No idle shine; press compresses the reflection and reduced motion keeps only the edge.

## V2.5 fitness-product redesign

The interface was replaced around one fixed element, the V app icon from the identity sheet.
VAELORA now reads like a premium mobile fitness product rather than a styled website. Product
logic, scoring, weather, GPS, privacy, storage, routing, AI grounding and the share model are
unchanged. See [DESIGN.md](../DESIGN.md).

- **Colour:** a warm-white field (light) or instrument black (dark) with white or graphite
  modules; ember (#FF5A1F) is the single action and live colour; leaf, gold and steel carry
  conditions. The metal material layer, gradient text and stitch bands were removed.
- **Type:** Archivo for everything, with heavy condensed tabular metrics; Readex Pro for Arabic;
  Cormorant Garamond only for the wordmark.
- **Icons:** Phosphor (one family, regular stroke, filled when selected) replaces lucide.
- **Navigation:** a glass tab capsule (Home, Map, Ask) beside an ember Track key that becomes a
  live indicator while recording; on desktop it joins the header.
- **Home:** the Today module with the ten-segment Score ring, decision, gold best window,
  conditions with icons, the comfort strip and the Start key; Near you as a grouped list with mini
  rings; reviewed places as a rail.
- **Track:** an always-dark instrument: a round Start key when ready; while live a dial of elapsed
  time against the planned minutes, distance and pace tiles, secondary metrics, GPS status and
  thumb-sized controls. Recording, acquiring, weak GPS and paused are colour-coded.
- **Summary and share:** a completion screen with the route, hero distance, stat tiles and the
  conditions ring; the share card and its 1080x1440 export use the new palette.
- **Progress and Profile:** a weekly active-day ring, a seven-day distance chart split by walk and
  run, a walk/run split bar, stat tiles; Profile leads with identity and totals, then this week,
  recent activities and settings.
- **Map and Ask:** condition-ringed score pills, an ember selected place, an ink reference dot,
  themed MapLibre controls; Ask has a compact plan card with the Score ring and prompt chips.
- **Browser QA:** on desktop the navigation sits in the header, so the dock-clearance check now
  applies only when the dock floats at the bottom.
