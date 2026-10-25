# Product

<!-- impeccable:product-schema 1 -->

> Recorded from the owner's written brief (2026-10-25) and repository evidence. The owner asked
> for no interview round, so each fact below is inferred from that brief, README, AGENTS.md and
> docs/; none was confirmed in a question round.

## Platform

web

## Users

People in Greater Amman who walk or run outdoors and decide, often on a phone and often already
outside, whether conditions suit an outing now or later and where to go. They return to record
the activity, review it, and occasionally share a recap. Bilingual audience: Arabic (RTL) and
English are equally first-class.

## Product Purpose

VAELORA plans, tracks, analyses and shares outdoor walks and runs: Plan, Track, Analyze, Share,
Return. It answers what to do, when, where, why, and how to start, using live Open-Meteo
conditions, a deterministic score, and reviewed activity places. Success is a returning user who
trusts the recommendation, records the outing, and comes back.

## Positioning

Recommendations come from a deterministic, testable engine over a small set of reviewed Amman
places with explicit evidence and uncertainty. Unknown terrain, surface, access or conditions
stay unknown. The AI assistant only extracts intent and never invents scores, weather or places.
Activity history is local-first: GPS routes stay on the device, and share images strip endpoint
zones.

## Operating Context

Installable PWA used mostly on phones outdoors, in strong daylight and at night, sometimes with a
weak signal. Foreground GPS recording only; leaving the foreground pauses recording. Desktop is
used for planning and review.

## Capabilities and Constraints

- Walking and running only; today, tomorrow and a 3-day outlook; Greater Amman service polygon only.
- 11 reviewed production places; dynamic locations never gain place attributes.
- VAELORA Score bands come from the existing scorer; no invented score differences.
- Tracking: foreground GPS, pause/resume/finish, interrupted-session recovery, IndexedDB history,
  GPX export with explicit precise-location confirmation, three local 1080x1440 share cards.
- AI: one grounded agent, offline-safe evaluations; private routes and GPS cells never reach the model.
- Out of scope: accounts, social feeds, challenges, payments, cloud GPS, tourism, other cities.

## Brand Commitments

- Name: VAELORA (wordmark in capitals).
- Incumbent identity used burgundy, warm off-white and charcoal with lime reserved for start/live.
  The owner authorised evolving or replacing this; it is evidence, not a binding palette.
- Must not copy Strava, Nike Run Club, Apple Fitness, Garmin or Huawei Health.

## Evidence on Hand

- Reviewed place records and sources: src/data/activity-areas.ts, docs/research/activity-areas/.
- No photography of places is used; generated SVG location art only.
- No testimonials, user counts, achievements or streaks exist and none may be fabricated.

## Product Principles

1. Recommendation first: the next good outing and how to start it dominate.
2. Evidence over confidence: show what is known, say what is not.
3. Local-first privacy: routes stay on the device unless the user exports them.
4. Real data only: progress, bests and totals come from recorded activities.
5. Arabic and English parity in layout, type and copy.

## Accessibility & Inclusion

Outdoor legibility (strong contrast, large metrics), WCAG AA contrast, visible focus, keyboard
operation, 44px touch targets, reduced-motion support, full RTL.
