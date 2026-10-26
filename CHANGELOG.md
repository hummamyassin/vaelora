# Changelog

All notable changes to VAELORA are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

Earlier milestones (V1 to V2.4) are documented in [`docs/`](docs/); this file starts with the first tagged release.

## [2.5.0] - 2026-10-26

The modern fitness experience release. VAELORA moves from a planning website to a fitness product built around the VAELORA V icon, and becomes more dependable while you are actually outdoors.

### Added

- **VAELORA Score ring**: ten segments, one per ten points, with the number always in the centre. Partial segments show the remainder honestly. Good, fair and poor bands use leaf, gold and muted tones.
- **Progress ring** for real quantities with a known whole: elapsed time against planned minutes, and active days in the week.
- **Tomorrow fallback**: when today has no complete outing window left, Home shows the next good window tomorrow. It uses the same two-day forecast, with no extra request.
- **Remembered planning area**: Home reopens on the last area it planned. A GPS fix is stored only as the centre of its coarse forecast cell (about 2 km), never as the precise position.
- **Keep Awake**: on by default while recording and remembered per device. It uses the Screen Wake Lock API where available.
- **Background interruption banner**: if the recorder is backgrounded or the screen locks, the session pauses. On return, an alert offers **Resume now** or **Stay paused**.
- **Ask on-device mode**: when live AI is not enabled, Ask still shows the current plan and answers questions about your own activities on the device. Free-text planning points back to Home.
- **Edge rate limiting** through the Vercel Firewall (`@vercel/firewall`, Rate limit ID `vaelora-api`) on every server route.

### Changed

- **Navigation and icons**: one Phosphor icon set replaces lucide, in light and dark themes. At 1080 px and wider, the desktop navigation joins the header.
- **Home**: a Today module with the Score ring, a plain decision, the best window, and an hour-by-hour comfort strip with the best window boxed in gold. A primary Start key and nearby places follow.
- **Track**: a dark full-screen recorder with a plan dial, distance and pace tiles, GPS status, and ember controls.
- **Summary and Share**: a recap with route and metrics. The three local 1080×1440 share cards use the V2.5 palette (instrument black or warm white, ember, leaf, gold) and the V icon.
- **Progress and Profile**: real weekly progress, with an active-day ring and a daily distance chart. All-time stats, an activity breakdown and recent activities follow.
- **Map and Ask** restyled to the same system. The map grid no longer overflows on narrow screens.
- **PWA manifest** theme and background colour is now `#08090b`, to match the instrument surface.
- The separate metallic material layer was removed in favour of the token-based V2.5 system.

### Improved

- **Arabic and RTL**: every new surface ships with typed bilingual copy, checked at 320, 390, 430 and 1440 px in both directions.
- **Routing and Back navigation**: hash routes for screens, place profiles, recaps and sheets. Back, Forward and refresh behave like an installed app without interrupting a recording.
- **Backup and restore**: JSON backup (format v1) of all finished activities. Imports use strict validation and duplicate protection, and VAELORA requests persistent browser storage.
- **CI**: a GitHub Actions workflow runs validation, tests, AI replay evaluation, typecheck, lint and build on pull requests and pushes to `main`. It reads no secrets.

### Fixed

- The desktop navigation no longer covers the profile avatar.
- The map no longer overflows its grid column at narrow widths.
- The plan Start key keeps its ember fill in every state.
- Score ring specificity issues and Home background-refresh overlap are resolved.

### Security / Privacy

- Every API route checks the shared `vaelora-api` firewall rule. Ask **fails closed** (503) when the rule is missing or the check cannot complete. Weather, search, planning and recommendations **fail open**, so planning keeps working. In-memory per-client and per-instance budgets remain as a secondary guard.
- Public live AI requires both the published firewall rule and `VAELORA_AI_PUBLIC_ENABLED=true`. Without them, Ask runs in its on-device mode and makes no request to `/api/agent`.
- The remembered planning area refuses a precise GPS fix, even one written into storage by hand. Clearing preferences removes it, together with the Keep Awake choice.
- Hash routes carry only screen names, sheet names, reviewed place IDs and local activity IDs, never coordinates. Routes, history and precise GPS never reach the AI provider.

### Known limitations

- **Background GPS is not guaranteed.** Browsers and installed PWAs record in the foreground. When the app is backgrounded or the screen locks, the session pauses and asks to resume, particularly on iOS. Keep Awake reduces this, but it cannot replace native background tracking.
- Coverage is limited to the defined Greater Amman service area and its reviewed places.
- Weather is regional forecast data, not street-level microclimate. AQI is not assessed.
- Activities live only on the device. Clearing browser storage without a backup loses them.
- Physical-device GPS accuracy, battery use and install prompts still need device-specific field testing. Browser QA uses simulated GPS.

[2.5.0]: https://github.com/hummamyassin/vaelora/releases/tag/v2.5.0
