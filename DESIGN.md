---
name: VAELORA
description: Weather-aware walking and running for Greater Amman, drawn like a forecast chart.
colors:
  chart-paper: "#eceff1"
  surface: "#f7f9fa"
  surface-2: "#e2e7ea"
  surface-raised: "#fdfefe"
  synoptic-ink: "#0d1724"
  ink-band-2: "#172334"
  on-band: "#eef2f5"
  on-band-2: "#a9b6c3"
  on-band-3: "#7f8d9c"
  text: "#0d1724"
  text-2: "#3f4b58"
  text-3: "#5b6775"
  line: "#cbd3d9"
  course-crimson: "#9b1c3c"
  course-rose: "#ff4d7a"
  isobar-blue: "#1e5fa8"
  running-burgundy: "#8a1538"
  live: "#d9234f"
  good: "#0f7546"
  fair: "#8a5200"
  poor: "#a8340a"
  good-band: "#3dd68c"
  fair-band: "#ffb547"
  poor-band: "#ff8a3d"
  danger: "#b4232f"
typography:
  brand:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 800
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 750
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
  metric:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 6.4vw, 2.5rem)"
    fontWeight: 780
    lineHeight: 1
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 72"
  timer:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontSize: "clamp(4.25rem, 22vw, 7.5rem)"
    fontWeight: 800
    lineHeight: 0.92
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 72"
rounded:
  control: "10px"
  panel: "16px"
  sheet: "22px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  s8: "32px"
  s10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.course-crimson}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  button-course:
    backgroundColor: "{colors.course-rose}"
    textColor: "{colors.synoptic-ink}"
    rounded: "{rounded.control}"
    height: "54px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "44px"
  segmented-selected:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.synoptic-ink}"
    textColor: "{colors.on-band}"
    rounded: "{rounded.pill}"
    height: "40px"
  dock:
    backgroundColor: "{colors.synoptic-ink}"
    textColor: "{colors.on-band-2}"
    rounded: "{rounded.pill}"
    height: "64px"
  plan-band:
    backgroundColor: "{colors.synoptic-ink}"
    textColor: "{colors.on-band}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Design System: VAELORA

## Overview

**Creative North Star: "The Forecast Chart"**

VAELORA is read the way a good meteogram is read: one glance tells you what the next hours
hold and when to go. Conditions are drawn, not described. Each remaining hour is a column
whose height and colour are the scorer's comfort band, with the temperature written above it,
and the recommended outing is bracketed in a single reserved ink. Everything else in the
product, from the share card to the live recorder, borrows that chart's discipline: a cool
paper ground, synoptic navy ink, hairline rules, condensed tabular figures.

The system is operational, not decorative. Cards are rare; bands, rows and rules carry
structure. Colour does jobs: one action colour, one condition ramp, two activity hues. The
product works in strong daylight and at night, so the decision band and the live recorder sit
on the ink ground at high contrast in both themes. Arabic is first-class: layouts mirror, the
meteogram runs right to left, and Readex Pro carries Arabic text and numerals.

**Key Characteristics:**
- An ink plan band that holds the single decision and its single action.
- A meteogram strip as the signature data graphic.
- One variable grotesk whose width axis is the hierarchy.
- Flat surfaces with hairlines; depth only for overlays and the floating dock.
- Restrained motion that explains state: press, sheet rise, live pulse.

## Colors

A cool, chart-paper neutral system with one crimson-rose action ink and a meteorological
condition ramp.

### Primary
- **Course Crimson** (`course-crimson`): primary buttons on paper surfaces, selected place
  marker, focus of the active outing on light grounds.
- **Course Rose** (`course-rose`): the same course ink on the ink band: the window time, the
  meteogram bracket, the Start button, the live route and the recording state.

### Secondary
- **Isobar Blue** (`isobar-blue`): walking series, the reference-point marker, focus rings.
- **Running Burgundy** (`running-burgundy`): running series.

### Tertiary
- **Condition ramp** (`good`, `fair`, `poor` on paper; `good-band`, `fair-band`, `poor-band`
  on ink): comfortable, acceptable and less suitable conditions, and GPS quality.

### Neutral
- **Chart Paper** (`chart-paper`): page ground.
- **Surface / Surface 2 / Raised** (`surface`, `surface-2`, `surface-raised`): panels,
  segmented tracks, inputs and raised controls.
- **Synoptic Ink** (`synoptic-ink`): text, the plan band, the dock, the live recorder.
- **Secondary and muted text** (`text-2`, `text-3`): metadata at 7.7:1 and 5:1 on paper.
- **Line** (`line`): hairline rules and borders.

### Named Rules
**The One Course Rule.** Course ink marks only the active outing (its window, bracket, start,
live route and selected place). It never decorates.

**The Conditions Mean Conditions Rule.** Green, amber and vermilion appear only for comfort
bands and GPS quality, never for brand, activity or emphasis.

## Typography

**Display and body font:** Archivo (variable, wdth 62 to 125), self-hosted.
**Arabic font:** Readex Pro, self-hosted, used for Arabic script and Arabic-Indic numerals.

**Character:** a sturdy, slightly athletic grotesk. Expanded for the wordmark, normal for
reading, condensed and heavy for numbers.

### Hierarchy
- **Brand** (800, 1.0625rem, 0.06em tracking, width 125): the wordmark only.
- **Headline** (750, 2.25rem, 1.05): the plan decision ("Good to go now") and onboarding.
- **Title** (700, 1.375 to 1.75rem): screen and section titles.
- **Body** (400, 1rem, 1.5): descriptions, kept under 60ch.
- **Label** (600 to 650, 0.75 to 0.8125rem): metadata, field labels, metric captions.
- **Metric** (780, condensed, tabular): distance, pace, score, window time; fluid sizes.
- **Timer** (800, condensed, tabular, up to 7.5rem): the live recorder's active time.

### Named Rules
**The Width Is Rank Rule.** Hierarchy for numbers comes from the width axis and weight, not
from new families: condensed for metrics, normal for text, expanded only for the brand.

**The No Eyebrow Rule.** No tracked uppercase labels above headings; the heading speaks.

## Layout

Single column on phones with a 16px gutter (28px from 768px), content capped at 1180px.
Screens reserve space for the floating dock and the safe area at the bottom. From 1080px Home
becomes two columns: the plan band is sticky on the left, Near you, reviewed places and
progress on the right. The live recorder splits instrument and map from 768px. Spacing is a
4px grid (4, 8, 12, 16, 20, 24, 32, 40); sections are separated by 40px, with more space above
a heading than below it.

## Elevation & Depth

Flat by default. Depth is tonal: chart paper, surface and the ink band. Shadows appear only on
things that float over content.

### Shadow Vocabulary
- **Raised control** (`0 1px 2px rgb(13 23 36 / 0.06), 0 2px 8px rgb(13 23 36 / 0.05)`): the
  selected segment and small floating map controls.
- **Overlay** (`0 8px 24px rgb(13 23 36 / 0.12), 0 2px 6px rgb(13 23 36 / 0.06)`): sheets
  and the share preview.
- **Dock** (`0 10px 30px rgb(13 23 36 / 0.24)`): the floating navigation.

### Named Rules
**The Float Only Rule.** A shadow means the element floats above content. Panels in the flow
use a hairline or a tonal step instead.

## Shapes

Gently rounded and consistent: controls and inputs 10px, panels and maps 16px, sheets 22px at
the top edge, chips, tags and the dock fully rounded. Score markers on maps are small rounded
squares (8px); the reference point is a hollow circle; clusters are dashed pills.

## Components

### Buttons
- **Shape:** 10px radius, 44px minimum height (54px for the plan Start, 60px for recorder
  controls).
- **Primary:** course crimson with white text. **Course:** course rose with ink text, used on
  the ink band. **Secondary:** raised surface with a hairline. **Ghost:** text only.
  **Band:** ink-2 surface for controls on the ink band.
- **Hover / Focus / Active:** colour shift on hover, 2px blue focus ring, scale 0.97 on press.

### Segmented controls
- **Style:** surface-2 track, raised selected segment with a soft shadow; on the ink band the
  selected segment is paper with ink text. Used for activity, duration, day and share layout.

### Chips and tags
- **Chips:** pill, hairline, raised surface; selected chips turn ink. Used for areas,
  preferences and next steps.
- **Tags:** small tonal pills for status (good now, best at), activity and context.

### Rows
- Lists are hairline-separated rows (56px minimum) with a title, metadata, optional score and a
  chevron that mirrors in Arabic.

### Inputs
- **Style:** raised surface, hairline, 10px radius, 46px tall, labels above.
- **Focus:** blue border with a soft 3px blue halo.

### Navigation
- A floating ink dock (64px) with Home, Map, Track and Ask. The current item is a paper pill;
  Track shows a rose dot while recording. Back moves between routed screens and overlays.

### Meteogram strip (signature)
- One column per remaining forecast hour: temperature above, a bar whose height and fill are
  the comfort band (comfortable tallest), the hour below ("Now" first).
  The recommended window is a course-ink bracket placed at its real start and end. Hours
  without data are hatched. A screen-reader list repeats every hour in text.

### Live recorder (signature)
- The page switches to the ink ground. Order: state pill, timer, distance and pace, three
  secondary metrics, GPS quality, map, sticky Pause or Resume and Finish.

## Do's and Don'ts

### Do:
- **Do** keep one primary action per band, in course ink.
- **Do** set every metric in condensed tabular Archivo and every label in the label style.
- **Do** isolate numbers and times with `bdi` so they read correctly in Arabic.
- **Do** use Western digits in both languages so times, distances and metrics read the same.
- **Do** keep notices neutral (surface tone plus a small status dot); errors use the danger text colour.
- **Do** keep missing values explicit ("–", "Conditions unavailable") instead of estimating.
- **Do** keep motion to opacity, colour and short transforms under 250ms, and drop movement
  under reduced motion.

### Don't:
- **Don't** use course ink or the condition ramp for decoration, brand accents or charts that
  are not conditions.
- **Don't** add eyebrow labels, section numbers or em dashes in interface copy.
- **Don't** stack cards inside cards; use rows, rules and tonal steps.
- **Don't** add shadows to elements that sit in the flow.
- **Don't** invent score differences, place facts or achievements to fill space.
