---
version: 1
slug: "src-components-dashboard-app-tsx"
primary_target: "src/components/dashboard-app.tsx"
related_targets: []
---

# VAELORA app shell (Home, Map, Track, Recap, Progress, Ask, Profile)

Scope: the whole single-page app rendered by DashboardApp. Visitor mode: Operate.
Audience: Amman walkers and runners deciding when and where to go, then recording and reviewing.
Task: read the next good outing window, start it, record it, review it, share it, return.
Constraints: deterministic scores and reviewed evidence only; local-first routes; en/ar parity;
foreground GPS; existing behaviour and data contracts preserved.

## Direction contract

THESIS: VAELORA reads like a good forecast chart. Conditions are drawn as an hourly meteogram
strip with the recommended outing bracketed in one reserved ink, instead of the category default
of a score card stacked over rounded tiles.

OWN-WORLD: cool chart-paper ground and synoptic navy ink; burgundy is the single action and
"course" ink (start, best window bracket, live route, selected place); condition bands in a met
ramp (green good, amber fair, vermilion poor) only where they mean conditions; walking isobar
blue, running burgundy. One variable grotesk (Archivo) with its width axis carrying hierarchy:
condensed heavy tabular numerals for metrics, normal width for text; Readex Pro for Arabic.
Hairline rules and flat bands, few cards, one radius scale (8 / 14 / pill for chips and nav).
Raise (orienteering map): one reserved course ink, never used decoratively.
Raise (airport wayfinding): one message per band; the next window at monumental scale.
Raise (variable-font specimen): one family, width axis as the metric hierarchy.
Raise (vertical feed): Track owns the full viewport as a single state.
Raise (Crouwel grid): metric tiles snap to one strict grid.

STORY: the visitor sees what to do, when, where and why in one band, starts in one tap, watches
a calm full-screen recorder, gets an honest recap and share card, and sees real progress later.

FIRST VIEWPORT: top bar (wordmark, language, profile). Plan band: activity + duration controls,
the headline decision ("Good now" / "Better at 17:00"), the window time at monumental condensed
scale, score beside it, then the meteogram strip with the bracketed window and a now marker,
then the Start button in course ink. Bottom nav (Home, Map, Track, Ask) floats in the safe area.

FORM: meteorological forecast chart (meteogram), my grounded list position 5; seed key 22789ce2.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

- Owner skipped the decision round by instruction; direction proceeds as assigned.
