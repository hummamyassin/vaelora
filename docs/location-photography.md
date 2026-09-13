# V1.1 location photography

Reviewed 2026-09-13. This is a presentation layer keyed to existing production IDs. Photographs do not establish route facts, access, current conditions, activity suitability, or safety. No dataset, scoring, weather or AI tools use this metadata.

## Selected photographs and attribution

All files are locally hosted in `public/images/locations/`. Authors retain their rights. **Each resized, compressed and display-cropped adaptation is available under the same Creative Commons Attribution-ShareAlike license linked below.** This image licensing does not change the application code license. Attribution is available beside every photograph, including the hero. Source pages and license links open separately from card selection.

| Production ID / local WebP | Original / author | License | Identity and selection |
| --- | --- | --- | --- |
| `sports-city.webp` | [Amman Sport City 20](https://commons.wikimedia.org/wiki/File:Amman_Sport_City_20.jpg), Mohammad hajeer | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Commons description and camera location 31.984402, 35.906993 identify Sports City. July 2026 photo shows an outdoor tree-lined dirt path, not a stadium interior. |
| `king-hussein-park.webp` | [Al Hussein Public Parks 01](https://commons.wikimedia.org/wiki/File:Al_Hussein_Public_Parks_01.JPG), روخو | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Source description/category identify Al Hussein Public Parks. Visually inspected paths and Amman backdrop; used for hero and this area only. Source capture date is unreliable (1970); no capture-date claim is shown. |
| `wakalat-street.webp` | [Wakalat Street Amman 2](https://commons.wikimedia.org/wiki/File:Wakalat_Street_Amman_2.jpg), Freedom's Falcon | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Identified street/category, pedestrian space and planters; historical 2007 scene, not evidence of current access. |
| `rainbow-street.webp` | [Rainbow Street, Amman — Eastward](https://commons.wikimedia.org/wiki/File:Rainbow_Street,_Amman_--_Eastward.jpg), miiika | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Explicit pedestrian-level eastward Rainbow Street description, January 2023. Vehicles remain visible; not presented as a traffic-free running route. |
| `abdali-boulevard.webp` | [The Boulevard](https://commons.wikimedia.org/wiki/File:The_Boulevard.jpg), Rania al-Bahara | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Source explicitly identifies shops on Abdali Boulevard, March 2016. Shows the pedestrian edge, not a sports track. |

Changes: auto-orientation where applicable, resized to at most 1600 pixels on the longest selected output edge, WebP compression, responsive CSS cropping, restrained hero overlay. No generated content, compositing of places, removal of vehicles, or changes to physical features. Original source files and full-resolution metadata remain at the linked Commons pages. Source API metadata and contact sheets used for review are temporary local QA artifacts, not dependencies.

## Explicit fallbacks

The six remaining areas use a solid Secondary Navy panel with an image-unavailable icon and localized text saying that it is **not a photograph of this place**. No generic landscape or another park is substituted. The recommendation remains fully usable.

- Japanese Park, Abdoun: [municipal identification](https://media.ammancity.gov.jo/En/NewsDetails/Maani_Inaugurates_the_%E2%80%9CJapanese_Park%E2%80%9D_in_Abdoun_) and third-party park listings found, but no sufficiently identified openly licensed image selected.
- National Gallery Park: [Commons candidates](https://commons.wikimedia.org/wiki/Category:Jordan_National_Gallery_of_Fine_Arts) depict museum buildings or individual artworks. No representative garden photograph with clear artwork reuse rights selected.
- Hashemite Plaza: [Commons candidate](https://commons.wikimedia.org/wiki/File:Hashemite_Plaza,_Amman.png) centers the Roman Theatre. Not selected for this activity-focused release; no archaeological imagery added for decoration.
- Al-Nashama Park: [news coverage](https://jordantimes.com/news/local/prime-minister-al-nashama-park-in-ammans-the-marj-al-hamam) and user-review photos found. No reuse permission established; a photo credit alone is not a reuse license.
- King Abdullah II Park, Muqabalain: [news coverage](https://jordantimes.com/news/local/his-majesty-inaugurates-king-abdullah-ii-park-ammans-mugabalein-area) and publications found, but no reusable license established for a selected park image.
- Ghamadan perimeter: reviewed search results show forest, zoo or private facilities, not the specifically supported external circuit with a reusable license.

Fallback does not mean no photograph exists; it records what could be responsibly selected in this review. Future additions need both exact-area identification and documented rights before entering `location-photos.ts`.

## Delivery and accessibility

`LocationPhoto` uses `next/image`, local files, responsive `sizes`, reserved image heights, localized meaningful alt text, lazy card images and an eager high-priority hero. Errors replace only the image, without hiding scores, weather, buttons or recommendations. No external image allowlist or runtime image hotlink is needed. Sources total about 1.3 MB for all five files; visitors receive only requested responsive variants. The hero image is reused on its card through the normal cache.

Primary card photos are 280 px high on desktop / 205 px mobile; alternatives are 200 / 155 px. Decision data stays on an ivory surface rather than on photography. Hero movement is transform-only, pauseable and disabled on mobile and under reduced motion. Source authors and license identifiers retain their original proper-name spelling in both languages.

## QA record

- Dataset: 35 researched, 11 production (3 supported / 8 verified), unchanged and valid.
- Repository suite: 78 tests passed, including four photography/Arabic regression tests.
- Offline agent evaluation: 28/28 passed. No fresh paid model calls were needed for this presentation-only change; Groq provider code and grounding contracts remain unchanged.
- Playwright Chromium: real Running and Walking responses; all five local photos rendered, including an urban walking request to the real endpoint. English/Arabic at 1440×1000 and 390×844, no horizontal overflow; screenshots visually reviewed for hero, primary/secondary cards, map, hourly conditions and photo error fallback.
- Card/photo → marker, pointer/keyboard marker → card, factual trace and Modern Standard Arabic near-me geolocation checked.
- Delayed/failed image requests, delayed recommendations and API/AI-provider errors were browser-only simulations. Empty recommendations came from the real engine using a test-only extreme temperature cap. All request interception was removed afterwards. No test results or fake weather entered product code.
- Photo failure initially overlapped hero copy; the final version moves that status to the caption. Cards without photos use compact 140–160 px desktop / 130 px mobile neutral panels.
- TypeScript, lint and production build passed. Production validation used the documented `next build --webpack` Windows fallback.
- Local tool/instruction changes (`.agents/`, `AGENTS.md`) are preserved outside this commit. `.env.local` remains ignored and untracked.

Limitations: older reference photos cannot establish present-day appearance; six places still need suitable licensed photography. Browser QA is Chromium viewport testing, not physical-device or Safari certification. Basemap labels and original photo-author/license names retain their source languages; surrounding UI is localized.
