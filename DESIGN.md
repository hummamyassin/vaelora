---
name: VAELORA
description: A wearable activity instrument on a clean field. Weather-aware walking and running for Greater Amman, anchored by the VAELORA V icon.
colors:
  field-light: "#F6F6F3"
  surface-light: "#FFFFFF"
  surface-2-light: "#EEEEEA"
  surface-3-light: "#E4E4DF"
  ink: "#0E1013"
  text-2-light: "#464A51"
  text-3-light: "#62666E"
  line-light: "#E3E3DE"
  field-dark: "#08090B"
  surface-dark: "#131519"
  surface-2-dark: "#1B1E23"
  surface-3-dark: "#252930"
  text-dark: "#F4F5F2"
  text-2-dark: "#B4B8BF"
  text-3-dark: "#8F949C"
  ember: "#FF5A1F"
  ember-dark: "#FF6A2E"
  ember-ink: "#B83C0A"
  on-ember: "#120802"
  leaf: "#1A9B4B"
  leaf-dark: "#4AD37A"
  leaf-ink: "#136F37"
  gold: "#B97F00"
  gold-dark: "#F2B23C"
  gold-ink: "#7A5000"
  steel: "#808590"
  steel-dark: "#6B717A"
  danger: "#B4231A"
typography:
  wordmark:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "1.12rem"
    fontWeight: 600
    letterSpacing: "0.26em"
  title:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 6.6vw, 2.1rem)"
    fontWeight: 800
    letterSpacing: "-0.03em"
  section:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 750
  body:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 650
  metric:
    fontFamily: "Archivo, Readex Pro, system-ui, sans-serif"
    fontWeight: 800
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 78-85"
rounded:
  small: "8px"
  control: "12px"
  key: "14px"
  tile: "16px"
  card: "18px"
  bar: "20px"
  float: "22px"
  module: "24px"
  sheet: "28px"
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
    backgroundColor: "{colors.ember}"
    textColor: "{colors.on-ember}"
    rounded: "14px"
    height: "46px"
  button-secondary:
    backgroundColor: "{colors.surface-2-light}"
    textColor: "{colors.ink}"
    rounded: "14px"
    height: "46px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.field-light}"
    rounded: "{rounded.pill}"
    height: "40px"
  hero-module:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.module}"
    padding: "20px"
  instrument:
    backgroundColor: "{colors.field-dark}"
    textColor: "{colors.text-dark}"
  tab-capsule:
    backgroundColor: "glass over the field"
    rounded: "22px"
    height: "60px"
  track-key:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.on-ember}"
    rounded: "22px"
    height: "60px"
---

# Design System: VAELORA (V2.5)

## Overview

**North star: "the wearable instrument"**

VAELORA is a fitness product first. Every screen answers a question at a glance, the way a sports
watch does: one decision dial on Home, one full-screen recorder on Track, one honest completion
screen after. The V app icon from the identity sheet is the only crafted object and is never
redrawn; the interface around it is clean, athletic and modern.

**Key characteristics**
- The VAELORA Score is a ten-segment ring (one segment per ten points), the product's signature.
- Ember is the single action and live colour; Leaf, Gold and steel carry conditions.
- Light mode is a bright warm-white field with white modules; dark mode is instrument black.
- The recorder is always a dark instrument, in either theme.
- Modules separate by tone and one soft shadow, not borders; not everything is a card.
- One icon family (Phosphor), regular stroke, filled when selected.

## Colors

### Neutrals
- **Field** (`field-light` / `field-dark`): the page ground.
- **Surfaces** (`surface`, `surface-2`, `surface-3`): modules, tracks and controls, a tone step apart.
- **Ink and text** (`ink`, `text-2`, `text-3`, dark equivalents): AA on every surface.

### Roles
- **Ember** (`ember`, text `ember-ink`, on dark `ember-dark`): Start, Resume, Save, the Track key,
  recording, the live route, the selected map place, running.
- **Leaf** (`leaf`, text `leaf-ink`): comfortable conditions, positive states, GPS recording well, walking.
- **Gold** (`gold`, text `gold-ink`): the best window and acceptable conditions.
- **Steel** (`steel`): less suitable conditions.

### Rules
**The Ember Rule.** Ember means act or live. It never decorates.

**The Condition Rule.** Leaf comfortable, gold acceptable, steel less suitable, everywhere a
condition is drawn: score rings, the comfort strip, tags, map markers.

**The Contrast Rule.** Text is AA on its surface; meaningful fills hold 3:1 against the module
they sit on (light fills are deeper than dark ones for this reason).

## Typography

- **Interface and metrics:** Archivo (variable width), self-hosted. Metrics are weight 800,
  condensed (wdth 78 to 85), tabular; units drop to the text weight.
- **Arabic:** Readex Pro, self-hosted; Western digits in both languages.
- **Wordmark only:** Cormorant Garamond 600, tracked, beside the V.
- **Scale:** large title (1.6 to 2.1rem, 800), section (1.375rem, 750), body (1rem), labels
  (0.75rem, 650). Instrument metric labels are small uppercase in English only.

## Layout

Phones first: 16px gutter (28px from 768px), 1180px maximum. Floating navigation at the
bottom on phones and tablets; from 1080px it joins the header. Home is two columns from 1080px
(Today, this week and reviewed places on the left, Near you on the right); the live recorder
splits instrument and route from 768px; the completion screen puts the route beside the metrics
from 1080px.

## Elevation & Depth

Depth comes from tone steps between field and modules and one soft offset shadow for things that
float (modules, the tab capsule, sheets). No borders on cards, no glows, no gradient text. Glass
(backdrop blur) is used only where content scrolls beneath: the header, the tab capsule and map
overlays.

## Shapes

Small marks 8px, controls 12px, keys 14px, tiles 16px, cards 18px, large controls 20px, floating cards and the tab capsule 22px, modules 24px, sheets 28px; pills only for chips, tags, tabs and rings.

## Components

- **Score ring:** ten segments with gaps, lit by a mask so a partial segment shows the remainder;
  the number sits in the centre. Sizes 44, 64, 128 (148 on desktop).
- **Progress ring:** a continuous ring for real wholes: elapsed time against the planned minutes
  (the Track dial) and active days in the week.
- **Comfort strip:** one capsule per remaining forecast hour, height and colour from the scorer's
  comfort band; the recommended window boxed in gold.
- **Navigation:** a glass tab capsule (Home, Map, Ask) beside the ember Track key, which turns into
  a live indicator while recording.
- **Buttons:** primary ember with ink text; secondary on a surface step; ghost; danger tint.
  Press scales to 0.97.
- **Grouped lists:** white modules with inset hairlines, like native grouped tables.
- **Stat tiles:** label above a heavy tabular figure.
- **Activity glyph:** a tinted square with the walk or run icon.
- **Map markers:** score pills ringed by condition, an ember selected pill, an ink reference dot.

## Motion

Short and physical (Emil Kowalski curves): press 140ms, state 180ms, sheets 300ms on the drawer
curve, rings reveal in 520ms on first paint only. The only loops are the recording dot and the
Ask thinking bars. Reduced motion keeps colour and opacity feedback and drops movement.

## Do's and Don'ts

### Do
- **Do** use the V icon from the identity sheet unchanged wherever the brand appears.
- **Do** show the number beside every ring.
- **Do** keep progress, totals and scores to real recorded or forecast data.

### Don't
- **Don't** redraw, simplify or recolour the V.
- **Don't** put borders on every card or nest cards.
- **Don't** use ember for decoration or gradient text anywhere.
- **Don't** invent streaks, achievements or health metrics.
- **Don't** use em dashes in interface copy.
