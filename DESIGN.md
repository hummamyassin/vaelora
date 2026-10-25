---
name: VAELORA
description: Sport, movement and identity. Weather-aware walking and running for Greater Amman, in the VAELORA ribbon-and-stitch identity.
colors:
  deep-brown: "#231F1C"
  warm-cream: "#F4EFE6"
  gold: "#C8913A"
  terracotta: "#B5532A"
  olive: "#5F6B34"
  surface: "#FBF8F3"
  surface-2: "#EBE4D8"
  surface-raised: "#FFFDF9"
  band-2: "#2E2925"
  on-band-2: "#CFC4B4"
  on-band-3: "#A39684"
  text-2: "#4D4339"
  text-3: "#6E6256"
  line: "#D9CFBF"
  terracotta-text: "#A84A23"
  terracotta-on-dark: "#E07A4A"
  gold-text: "#8E6420"
  olive-on-dark: "#93A45A"
  faded-thread: "#6B5F55"
  danger: "#9E2B1F"
typography:
  wordmark:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "1.3rem"
    fontWeight: 600
    letterSpacing: "0.3em"
  display:
    fontFamily: "Cormorant Garamond, Readex Pro, Georgia, serif"
    fontSize: "2.6rem"
    fontWeight: 600
    lineHeight: 1
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
    fontWeight: 700
    lineHeight: 1
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 84"
rounded:
  control: "10px"
  panel: "18px"
  sheet: "24px"
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
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.control}"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.deep-brown}"
    rounded: "{rounded.control}"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.deep-brown}"
    textColor: "{colors.warm-cream}"
    rounded: "{rounded.pill}"
    height: "40px"
  feature-band:
    backgroundColor: "{colors.deep-brown}"
    textColor: "{colors.warm-cream}"
    rounded: "{rounded.panel}"
    padding: "24px"
  dock:
    backgroundColor: "{colors.deep-brown}"
    textColor: "{colors.on-band-2}"
    rounded: "{rounded.pill}"
    height: "66px"
---

# Design System: VAELORA

## Overview

**Creative North Star: "The Ribbon and the Stitch"**

VAELORA's identity sheet defines the product: a cream ribbon "V" on deep brown, its tip catching
gold, rising out of a band of cross-stitch in cream, olive, terracotta and gold. The interface is
the digital expression of that icon. Dark, confident feature surfaces carry the decision and the
recorder; warm cream carries reading; the stitch band appears where the icon's band would, at the
foot of a dark feature. The cultural reference is the embroidery itself, used structurally and
sparingly, never as wallpaper.

The product stays an athletic instrument. Numbers are large, tabular and calm; the classical serif
is reserved for the wordmark and a few display lines, so craft reads as refinement, not costume.

**Key Characteristics:**
- One dark feature band per screen, closed by the icon's stitch band.
- Gold marks the best moment; terracotta marks motion.
- The stitch colours (olive, gold) carry conditions; poor conditions read as faded thread.
- A tracked classical serif wordmark beside the real app icon.
- Warm cream ground with dark brown ink; no cool or neon accents.

## Colors

The five identity colours, extended only with tints needed for contrast.

### Primary
- **Deep Brown** (`deep-brown`): feature bands, the dock, the live recorder, text on cream, the dark theme ground.
- **Warm Cream** (`warm-cream`): page ground in light theme, all text on dark surfaces.

### Secondary
- **Terracotta** (`terracotta`, text `terracotta-text`, on dark `terracotta-on-dark`): primary action, Start, recording state, the live route, the selected map marker, running.
- **Gold** (`gold`, text `gold-text`): the recommended window and its meteogram bracket, verified-place marker rims, the reference point, acceptable conditions.

### Tertiary
- **Olive** (`olive`, on dark `olive-on-dark`): comfortable conditions, GPS recording well, walking.
- **Faded thread** (`faded-thread`): less suitable conditions.

### Neutral
- **Surfaces** (`surface`, `surface-2`, `surface-raised`, `band-2`): panels, tracks, raised controls.
- **Secondary text** (`text-2`, `text-3`, `on-band-2`, `on-band-3`): metadata on cream and on brown.
- **Line** (`line`): hairlines.

### Named Rules
**The Gold Moment Rule.** Gold marks the single best moment (the recommended window, the V's tip). It never decorates.

**The Motion Rule.** Terracotta means movement or action: Start, Resume, recording, the live route.

**The Thread Rule.** Conditions use the stitch colours: olive comfortable, gold acceptable, faded thread poor.

## Typography

**Wordmark and display:** Cormorant Garamond 600, self-hosted.
**Interface and metrics:** Archivo (variable width), self-hosted.
**Arabic:** Readex Pro, self-hosted; Arabic display lines use it at 700.

**Character:** a classical, widely tracked wordmark and calm serif display lines over a steady grotesk; metrics are tabular and slightly condensed, firm rather than aggressive.

### Hierarchy
- **Wordmark** (Cormorant 600, 1.3rem, 0.3em tracking): beside the app icon in the top bar, onboarding, share card.
- **Display** (Cormorant 600, 2–2.6rem): the plan decision, screen titles, the profile name, onboarding.
- **Title** (Archivo 700, 1.375rem): section titles.
- **Body** (Archivo 400, 1rem, 1.5).
- **Label** (Archivo 600–650, 0.75–0.8125rem).
- **Metric** (Archivo 700, width 84, tabular): timer, distance, pace, window, score.

### Brand moments (V2.4.2)
- **Brand label** (Cormorant 700, 0.86rem, 0.14em tracking, caps): key labels such as Outing window, VAELORA Score, Active time and panel titles. Arabic uses Readex 600 without tracking or caps.
- **Section titles** (Cormorant 600, 1.75rem); Arabic Readex 700.
- **Key metrics** (Cormorant 700, lining tabular figures): window time, score, timer, distance and pace, recap distance, stats, place fit. Units stay in Archivo.
- **Primary actions** (Cormorant 700, 1.15 to 1.3rem, 0.05em tracking); Arabic Readex 700.
- Body, controls, AI answers and dense UI stay in Archivo and Readex Pro.

### Named Rules
**The Brand Moment Rule.** The serif carries the wordmark, display lines, key labels, key metrics and primary actions; body copy, controls and long text stay in the sans.

## Layout

Single column on phones (16px gutter, 28px from 768px), 1180px maximum. From 1080px Home is two columns: the plan band, this week and reviewed places on the left, Near you on the right. Screens clear the floating dock and the safe area. Spacing is a 4px grid.

## Elevation & Depth

### Material: polished metal (V2.4.2)
Brand and action moments take the material of the V ribbon: a vertical gradient with light at the top edge and depth below, a thin sheen (top highlight, bottom shade) and a soft tinted shadow. Text always sits on the mid-tone so contrast holds.
- **Terracotta metal**: primary actions, Start, the selected map marker, running progress.
- **Gold metal**: the recommended window, the Ask plan window, the recap score, verified-marker rims, acceptable bars.
- **Olive metal**: comfortable bars and the score in good conditions, walking progress.
- **Cream metal**: the live timer and metrics on dark, selected segments on dark, the recommended-off Start.
- **Ink metal**: the dock, selected chips, avatars, the recap score plate; metal ink text for key figures on cream.
Base surfaces (grounds, panels, rows, inputs) stay flat. Hover shifts the gradient (light response); reduced motion keeps colour changes only.


Flat and warm. Depth comes from the brown feature bands against cream. Shadows are warm-tinted and only for floating things: the dock, sheets, the share preview.

## Shapes

The icon's soft square: controls 10px, panels 18px, sheets 24px, chips and the dock fully rounded. Map score markers are 8px squares with a gold rim.

## Components

### Stitch band (signature)
- The icon's three cross-stitch rows (cream or ink zig-zag, alternating olive and terracotta, gold) at the foot of the plan band, the Track ready panel and the share card. A single-row variant divides the recap and closes location art.

### Stitch meter (signature)
- The VAELORA Score as ten crosses, one per ten points, lit in the condition colour, always beside the number.

### Week stitches
- This week as seven days on brown; each finished activity is one cross, olive for walking, terracotta for running.

### Meteogram strip
- Remaining hours as bars whose height and colour are the comfort band; the recommended window bracketed in gold.

### Buttons
- **Primary:** terracotta with cream text. **Secondary:** raised cream with a hairline. **Band:** brown-2 on dark. Press scales to 0.97.

### Navigation
- A brown dock. The selected item turns cream with a short terracotta stitch beneath; the Track icon is always terracotta and carries a live dot while recording.

## Do's and Don'ts

### Do:
- **Do** use the real app icon (cropped from the identity sheet) wherever the brand mark appears.
- **Do** close dark feature surfaces with the stitch band, once per surface.
- **Do** keep numbers in Archivo tabular figures and Western digits in both languages.
- **Do** keep notices neutral with a status dot.

### Don't:
- **Don't** use embroidery as a background texture or on every card.
- **Don't** introduce cool blues, lime, purple or neon accents.
- **Don't** set controls, labels or metrics in the serif.
- **Don't** redraw the V; use the identity artwork.
- **Don't** add eyebrow labels or em dashes in interface copy.
