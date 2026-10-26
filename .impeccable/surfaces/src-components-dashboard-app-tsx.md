---
version: 1
slug: "src-components-dashboard-app-tsx"
primary_target: "src/components/dashboard-app.tsx"
related_targets: []
---

# VAELORA app shell (Home, Map, Track, Recap, Progress, Ask, Profile)

Scope: the whole single-page app rendered by DashboardApp. Visitor mode: Operate.
Audience: Amman walkers and runners deciding when and where to go, then recording and reviewing.
Task: read the next good outing, start it, record it, review it, share it, return.
Constraints: deterministic scores and reviewed evidence only; local-first routes; en/ar parity;
foreground GPS; existing behaviour and data contracts preserved. The V app icon from the identity
sheet is the one fixed visual element (never redrawn); everything else was replaced in V2.5.

## Direction contract

THESIS: VAELORA reads like a wearable activity instrument on a clean field: one glanceable
decision dial (the ten-segment VAELORA Score ring) beside the outing window, an hour-by-hour
comfort strip, and a recorder that behaves like a sports watch. It refuses the category default
of stacked bordered cards, dashboard gauges and web-page sections.

OWN-WORLD: light is a bright warm-white field (#F6F6F3) with white modules and graphite ink;
dark is instrument black (#08090B) with graphite modules. Ember (#FF5A1F) is the single
action and live colour (Start, recording, the route, the selected place, running); Leaf is
comfortable conditions and walking; Gold is the best window and acceptable; steel is poor.
Archivo throughout with condensed heavy tabular numerals; Readex Pro for Arabic; Phosphor
icons, regular stroke, filled when selected. Radii 12 controls, 22 modules, pills only for
chips and tabs. Depth from tone steps and one soft shadow, never borders on everything.

STORY: the visitor sees what, when, where and why in one module, starts in one tap, watches a
dark full-screen instrument, gets an honest completion screen and share card, and sees real
weekly progress on Home and Profile.

FIRST VIEWPORT (390 wide): compact top bar (V mark, language, avatar); greeting title with
place and temperature; activity and duration segments; the hero module with the Score ring at
left and headline, best window and conditions at right, the comfort strip below, the full-width
ember Start; floating navigation: a glass tab capsule (Home, Map, Ask) beside an ember Track key.

FORM: wearable activity instrument, pinned by the owner's V2.5 brief (no concept roll); signature
move: the ten-segment Score ring (one segment per ten points) reused on places, map, recap, plus
the Track ring of elapsed time against the planned minutes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

- Owner pinned the direction in writing and asked for no question round; assumptions are stated in the final report.
