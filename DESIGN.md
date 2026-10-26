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
  chrome-band: "#17181B"
  band-2: "#24262A"
  on-band: "#F4F1EC"
  on-band-2: "#C9C6C0"
  on-band-3: "#A19E99"
  text-2: "#4D4339"
  text-3: "#6E6256"
  line: "#D9CFBF"
  chrome-0: "#050506"
  chrome-1: "#1C1D20"
  chrome-2: "#5E6268"
  chrome-3: "#C9CDD2"
  platinum-0: "#8E949A"
  platinum-1: "#C7CBCF"
  platinum-2: "#F4F6F8"
  platinum-3: "#FFFFFF"
  gold-0: "#6E4508"
  gold-1: "#B47E22"
  gold-2: "#E9C065"
  gold-3: "#FFF1C2"
  copper-0: "#5A200C"
  copper-1: "#A44A22"
  copper-2: "#DC7B48"
  copper-3: "#FFC7A2"
  olive-0: "#26300F"
  olive-1: "#56651F"
  olive-2: "#93A645"
  olive-3: "#E3EEA6"
  copper-text: "#A44A22"
  gold-text: "#7A500C"
  olive-text: "#56651F"
  steel-poor: "#5E6268"
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
    backgroundColor: "{colors.copper-1}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.control}"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.platinum-2}"
    textColor: "{colors.deep-brown}"
    rounded: "{rounded.control}"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.chrome-1}"
    textColor: "{colors.platinum-2}"
    rounded: "{rounded.pill}"
    height: "40px"
  feature-band:
    backgroundColor: "{colors.chrome-band}"
    textColor: "{colors.on-band}"
    rounded: "{rounded.panel}"
    padding: "24px"
  dock:
    backgroundColor: "{colors.chrome-1}"
    textColor: "{colors.platinum-1}"
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
- One black chrome feature band per screen, closed by the icon's stitch band in platinum thread.
- Polished gold marks the best moment; copper marks motion.
- Green metal and gold carry conditions; poor conditions read as steel.
- A tracked classical serif wordmark beside the real app icon.
- Warm cream ground with dark brown ink; the only cool tones are the chrome and platinum metals. No blue, lime, purple or neon.

## Colors

The five identity colours, rendered as metals (see Elevation & Depth). Solid tints exist only for small text and fallbacks.

### Primary
- **Deep Brown** (`deep-brown`): text on cream and the dark theme ground. Premium dark surfaces render as **black chrome** (`chrome-*`).
- **Warm Cream** (`warm-cream`): page ground in light theme and text on dark. Important light states render as **platinum** (`platinum-*`).

### Secondary
- **Terracotta as copper** (`copper-*`, text `copper-text`): primary action, Start, recording, the live route, the selected map marker, running.
- **Gold as polished gold** (`gold-*`, text `gold-text`): the recommended window and its bracket, verified rims, the reference point, acceptable conditions.

### Tertiary
- **Olive as green metal** (`olive-*`, text `olive-text`): comfortable conditions, GPS recording well, walking.
- **Steel** (`steel-poor`): less suitable conditions.

### Neutral
- **Surfaces** (`surface`, `surface-2`, `surface-raised`, `band-2`): panels, tracks, raised controls.
- **Secondary text** (`text-2`, `text-3`, `on-band-2`, `on-band-3`): metadata on cream and on chrome.
- **Line** (`line`): hairlines.

### Named Rules
**The Gold Moment Rule.** Gold marks the single best moment (the recommended window, the V's tip). It never decorates.

**The Motion Rule.** Copper means movement or action: Start, Resume, recording, the live route.

**The Thread Rule.** Conditions use the metals: green metal comfortable, gold acceptable, steel poor. Decorative stitches are platinum.

**The Metal Rule.** Brand colour that acts, marks, measures or selects is metal; grounds and reading surfaces stay calm. Gold is never a large area.

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

### Material system: five metals (V2.4.3)
The brand palette is rendered in five metals from the material reference. Each has four stops (base, mid, bright, specular):

| Metal | Stops | Brand role |
| --- | --- | --- |
| Black chrome | `#050506` `#1C1D20` `#5E6268` `#C9CDD2` | deep brown premium surfaces and controls |
| Platinum | `#8E949A` `#C7CBCF` `#F4F6F8` `#FFFFFF` | important cream and white, the stitch |
| Polished gold | `#6E4508` `#B47E22` `#E9C065` `#FFF1C2` | gold |
| Copper | `#5A200C` `#A44A22` `#DC7B48` `#FFC7A2` | terracotta |
| Green metal | `#26300F` `#56651F` `#93A645` `#E3EEA6` | olive |

**Construction.** One light, from the top left. A metal surface stacks fine horizontal brushed grain, a soft secondary highlight, and a body gradient (specular edge, bright, the mid-tone under the text, edge shade). Edges add a top reflection, a lower shade and an inner line; shadows are tinted by the metal. Tokens in `tokens.css`: `--metal-{copper,gold,platinum,olive,chrome}` surfaces with `-body`, `-subtle`/`-raised`/`-band`/`-well` variants, `-text` (and `-text-light` for cream grounds), `-border`, `-edge` and `-shadow`; theme-aware `--metal-key-text`, `--metal-best-text`, `--metal-good-text`; and `--thread-*` stitch stops.

- **Black chrome**: the plan band, Track ready, the whole live recorder, Ask plan, this week, the dock, raised keys on dark, recessed segment wells, the recap score plate, selected chips (light theme), avatars, map marker bodies, the share card.
- **Platinum**: selected segments, the recommended-off Start, secondary buttons, live figures and the decision on chrome, rank beads, card rims and section rules, map light detail, the stitch.
- **Polished gold**: the best window, the meteogram bracket, verified rims, the avatar rim, acceptable scores and bars, the best hour.
- **Copper**: primary actions (Start, Resume, Save), the recording pill and bead, the live route, the selected marker, running progress and the Run selection.
- **Green metal**: comfortable bars and scores, positive beads, GPS recording well, walking progress and the Walk selection.

**Metal text** is reserved for the wordmark, the decision, key figures, scores and the best window. Body text stays solid. Every gradient's darkest stop is checked against its ground (AA; 3:1 for large figures), and text on metal surfaces sits on the 30 to 70% band (copper 4.86:1 worst case).

**Motion.** No idle shine. Hover slides the reflection; press compresses it toward the top and sinks the edge; reduced motion keeps only the edge change.

Calm grounds, rows, inputs and reading panels stay flat.

## Shapes

The icon's soft square: controls 10px, panels 18px, sheets 24px, chips and the dock fully rounded. Map score markers are 8px squares with a gold rim.

## Components

### Stitch band (signature)
- The icon's three cross-stitch rows embroidered in platinum metal thread (darker silver base, steel mid, platinum highlight, a pale reflective edge and a restrained drop shade; lower rows sit slightly further from the light) at the foot of the plan band, the Track ready panel and the share card. A single-row variant divides the recap and closes location art. On cream the thread runs one step darker.

### Stitch meter (signature)
- The VAELORA Score as ten crosses, one per ten points, lit in green metal, gold or steel by condition, always beside the number.

### Week stitches
- This week as seven days on black chrome; each finished activity is one cross, green metal for walking, copper for running.

### Meteogram strip
- Remaining hours as lit metal rods whose height and metal are the comfort band; the recommended window bracketed in polished gold.

### Buttons
- **Primary:** copper metal with pale text. **Secondary:** brushed platinum (chrome in the dark theme). **Band:** raised chrome on dark. Press scales to 0.97 and compresses the reflection.

### Navigation
- A black chrome dock with platinum icons. The selected item brightens with a fine platinum stitch beneath; the Track icon is always copper and carries a copper bead while recording.

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
