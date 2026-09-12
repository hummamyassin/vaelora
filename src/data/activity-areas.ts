import type { ActivityArea } from "../domain/activity-area.ts";

/** Evidence-reviewed areas only. Research candidates live under docs/research. */
export const activityAreas: readonly ActivityArea[] = [
  {
    "id": "sports-city",
    "name": "Al-Hussein Youth City / Sports City",
    "slug": "sports-city",
    "latitude": 31.98305,
    "longitude": 35.90458,
    "district": "Sports City / Al-Abdali",
    "supportedActivities": [
      "running",
      "walking"
    ],
    "environment": "park",
    "terrain": "flat",
    "surfaces": [
      "dirt",
      "paved"
    ],
    "suitability": {
      "running": "suitable",
      "walking": "suitable"
    },
    "verificationStatus": "verified",
    "evidence": [
      {
        "url": "https://greatruns.com/amman-jordan-sport-city/",
        "note": "Activity/terrain/surface: running guide describes a flat wooded pedestrian path with dirt and asphalt. Walking fit is inferred from the pedestrian path, not from stadium access."
      },
      {
        "url": "https://mapcarta.com/W972338370",
        "note": "Coordinate/identity: OpenStreetMap way 972338370 park reference point, not a surveyed entrance."
      },
      {
        "url": "https://international.visitjordan.com/Brochures/Amman%20map-English%20for%20Web.pdf",
        "note": "Independent public activity corroboration: Jordan Tourism Board item 51 recommends walking, jogging and running on the Sports City forest track. Brochure text reviewed; no field inspection."
      }
    ],
    "description": "Wooded pedestrian exercise area within Sports City; excludes stadiums and other controlled sports facilities."
  },
  {
    "id": "king-hussein-park",
    "name": "King Hussein Park",
    "slug": "king-hussein-park",
    "latitude": 31.98635,
    "longitude": 35.82661,
    "district": "Al-Hussein Public Parks / west Amman",
    "supportedActivities": [
      "running",
      "walking"
    ],
    "environment": "park",
    "terrain": "unknown",
    "surfaces": [
      "paved"
    ],
    "suitability": {
      "running": "suitable",
      "walking": "suitable"
    },
    "verificationStatus": "verified",
    "evidence": [
      {
        "url": "https://greatruns.com/amman-jordan-al-hussein-park-and-dabouq/",
        "note": "Activity/surface: local-club-informed guide documents running on asphalt/concrete park paths. Its erroneous east-of-city wording and route distances are not adopted."
      },
      {
        "url": "https://international.visitjordan.com/Brochures/Amman%20map-English%20for%20Web.pdf",
        "note": "Public use: Jordan Tourism Board recommends leisure visits to Al-Hussein Park. Independent corroboration of public use, not a running or terrain audit."
      },
      {
        "url": "https://mapcarta.com/W153915077",
        "note": "Coordinate/identity: OpenStreetMap way 153915077; western Amman park, distinct from Sports City."
      }
    ],
    "description": "Public park paths for running and walking; excludes the guide's optional Dabouq street extension."
  },
  {
    "id": "rainbow-street",
    "name": "Rainbow Street",
    "slug": "rainbow-street",
    "latitude": 31.95062,
    "longitude": 35.92311,
    "district": "Jabal Amman",
    "supportedActivities": [
      "walking"
    ],
    "environment": "urban",
    "terrain": "unknown",
    "surfaces": [
      "unknown"
    ],
    "suitability": {
      "running": "unknown",
      "walking": "limited"
    },
    "verificationStatus": "verified",
    "evidence": [
      {
        "url": "https://international.visitjordan.com/Brochures/Amman%20map-English%20for%20Web.pdf",
        "note": "Activity: Jordan Tourism Board explicitly recommends strolling Rainbow Street."
      },
      {
        "url": "https://www.lonelyplanet.com/points-of-interest/rainbow-street/1497384",
        "note": "Independent activity evidence: residents promenade here; narrow street also carries traffic. No running suitability established."
      },
      {
        "url": "https://en.wikipedia.org/wiki/Rainbow_Street",
        "note": "Coordinate/identity: named street reference 31.950618, 35.923107 rounded to five decimals; First Circle to Mango Street, not all neighborhood streets."
      }
    ],
    "description": "Urban leisure walking along Rainbow Street; traffic and commercial activity limit uninterrupted exercise. Excludes wider Jabal Amman."
  },
  {
    "id": "wakalat-street",
    "name": "Wakalat Street",
    "slug": "wakalat-street",
    "latitude": 31.95667,
    "longitude": 35.86083,
    "district": "Sweifieh",
    "supportedActivities": [
      "walking"
    ],
    "environment": "urban",
    "terrain": "unknown",
    "surfaces": [
      "paved"
    ],
    "suitability": {
      "running": "unknown",
      "walking": "limited"
    },
    "verificationStatus": "verified",
    "evidence": [
      {
        "url": "https://international.visitjordan.com/Brochures/Amman%20map-English%20for%20Web.pdf",
        "note": "Activity: Jordan Tourism Board recommends walking along Wakalat's outdoor shopping area."
      },
      {
        "url": "https://trek.zone/en/jordan/places/137529/wakalat-street-amman",
        "note": "Coordinate/identity: Wakalat Street in Sweifieh; 31°57′24″N, 35°51′39″E converted and rounded to five decimals. Geographic listing is not a separate activity assessment."
      },
      {
        "url": "https://www.csbe.org/three-public-spaces-in-amman",
        "note": "Independent firsthand public-space study, 2011: pedestrian and commercial uses on Wakalat. Historical observations corroborate leisure walking; no running loop claimed."
      },
      {
        "url": "https://international.visitjordan.com/Brochures/Family%20brochure-English%20for%20Web.pdf",
        "note": "Surface: tourism brochure describes Wakalat as a paved pedestrian street. Indexed brochure text reviewed."
      }
    ],
    "description": "Shopping-street leisure walking in Sweifieh; no continuous running route or minimum exercise distance established."
  },
  {
    "id": "abdali-boulevard",
    "name": "Al-Abdali Boulevard",
    "slug": "abdali-boulevard",
    "latitude": 31.96457,
    "longitude": 35.90487,
    "district": "Al-Abdali",
    "supportedActivities": [
      "walking"
    ],
    "environment": "urban",
    "terrain": "unknown",
    "surfaces": [
      "unknown"
    ],
    "suitability": {
      "running": "unknown",
      "walking": "limited"
    },
    "verificationStatus": "verified",
    "evidence": [
      {
        "url": "https://www.theabdali.com/shop",
        "note": "Activity/identity: developer describes The Boulevard as a pedestrian walkway for shopping and leisure. This is operator evidence, not an independent inspection."
      },
      {
        "url": "https://www.lonelyplanet.com/articles/top-things-to-do-in-amman",
        "note": "Independent travel reporting, 11 March 2025: section 9 describes the Boulevard open-air pedestrian promenade. Leisure walking only; surrounding roads excluded."
      },
      {
        "url": "https://www.wikidata.org/wiki/Q22948741",
        "note": "Coordinate: named Boulevard item, 31°57′52.459″N, 35°54′17.532″E converted and rounded. Community-maintained reference point; no entrance accuracy claimed."
      }
    ],
    "description": "Managed pedestrian shopping promenade for leisure walking. Check operator access conditions and events; not a running track."
  },
  {
    "id": "japanese-park-abdoun",
    "name": "Japanese Park (Abdoun)",
    "slug": "japanese-park-abdoun",
    "latitude": 31.93639,
    "longitude": 35.8901,
    "district": "Abdoun",
    "supportedActivities": [
      "walking"
    ],
    "environment": "park",
    "terrain": "unknown",
    "surfaces": [
      "unknown"
    ],
    "suitability": {
      "running": "unknown",
      "walking": "limited"
    },
    "verificationStatus": "verified",
    "evidence": [
      {
        "url": "https://www.csbe.org/japanese-public-garden",
        "note": "Public use/environment: CSBE documents Abdoun's public Japanese garden. Limited leisure walking is an interpretation of visitable garden paths, not evidence of a training route."
      },
      {
        "url": "https://media.ammancity.gov.jo/En/NewsDetails/Maani_Inaugurates_the_%E2%80%9CJapanese_Park%E2%80%9D_in_Abdoun_",
        "note": "Independent municipal account confirms inauguration as a public garden in Abdoun; historical opening evidence does not establish present hours."
      },
      {
        "url": "https://mapcarta.com/W487905529",
        "note": "Coordinate/identity: OpenStreetMap way 487905529, Abdoun near Prince Hashim Street."
      }
    ],
    "description": "Small ornamental public garden for leisurely exploration; no evidence of an exercise loop. Distinct from the National Gallery's Japanese garden feature."
  },
  {
    "id": "national-gallery-park",
    "name": "Jordan National Gallery of Fine Arts Park",
    "slug": "national-gallery-park",
    "latitude": 31.95844,
    "longitude": 35.91517,
    "district": "Jabal Al-Weibdeh",
    "supportedActivities": [
      "walking"
    ],
    "environment": "park",
    "terrain": "unknown",
    "surfaces": [
      "paved"
    ],
    "suitability": {
      "running": "unknown",
      "walking": "limited"
    },
    "verificationStatus": "verified",
    "evidence": [
      {
        "url": "https://www.csbe.org/the-national-gallery-of-fine-arts-park",
        "note": "Firsthand design/public-use evidence: public garden paths retain stone paving; multiple levels and gates. Includes its internal Japanese garden, not a second location."
      },
      {
        "url": "https://nationalgallery.org/visit/",
        "note": "Operator corroboration: park visiting hours 09:00–14:30. Gallery closed Tuesdays, Fridays and official holidays; application of closure days/admission fees to park needs confirmation."
      },
      {
        "url": "https://www.mypacer.com/parks/196344/jordan-national-gallery-of-fine-arts-park-amman",
        "note": "Coordinate/identity: named OSM-derived park listing 31.95844, 35.91517. Coordinate source is not counted as an independent activity audit."
      }
    ],
    "description": "Public sculpture garden with stone paths and level changes. Operator lists park hours 09:00–14:30; confirm opening days and access before a visit."
  },
  {
    "id": "hashemite-plaza",
    "name": "Hashemite Plaza",
    "slug": "hashemite-plaza",
    "latitude": 31.95241,
    "longitude": 35.93917,
    "district": "Downtown / Al-Balad",
    "supportedActivities": [
      "walking"
    ],
    "environment": "urban",
    "terrain": "unknown",
    "surfaces": [
      "unknown"
    ],
    "suitability": {
      "running": "unknown",
      "walking": "limited"
    },
    "verificationStatus": "supported",
    "evidence": [
      {
        "url": "https://www.giz.de/sites/default/files/media/pkb-document/2025-07/giz2021-0031en-public-space-gender-amman-jordan.pdf",
        "note": "Public-use evidence: 2021 field-research inventory includes Hashemite Plaza. Indexed PDF excerpt reviewed; full PDF retrieval failed. No detailed surface claim taken from it."
      },
      {
        "url": "https://new.trfihi-parks.com/en/park-details/2822-Hashemite-Plaza-Park",
        "note": "Activity corroboration: directory lists open walking paths; generic directory alone would be insufficient."
      },
      {
        "url": "https://mapcarta.com/W651678324",
        "note": "Coordinate/identity: OpenStreetMap way 651678324 is a pedestrian square next to the Roman Theatre; no running evidence."
      }
    ],
    "description": "Public pedestrian plaza beside the Roman Theatre for leisure walking; excludes paid archaeological interiors and wider downtown streets."
  },
  {
    "id": "al-nashama-park",
    "name": "Al-Nashama Public Park",
    "latitude": 31.88989,
    "longitude": 35.84405,
    "district": "Marj Al-Hamam / Al-Salam Street",
    "environment": "park",
    "terrain": "unknown",
    "surfaces": [
      "track"
    ],
    "suitability": {
      "running": "limited",
      "walking": "suitable"
    },
    "verificationStatus": "verified",
    "evidence": [
      {
        "url": "https://www.7iber.com/حديقة-النشامى-في-مرج-الحمام/",
        "note": "Firsthand reporting, 7 July 2026: free public park; observed walking and light jogging. Sharp turns and family use limit speed. Former Royal Village site, not the whole residential district."
      },
      {
        "url": "https://media.ammancity.gov.jo/Ar/NewsDetails/الأمانة_استكمال_تركيب_الطبقة_المطاطية_في_مضمار_المشي_في_حديقة_النشامى",
        "note": "Municipal completion statement, August 2026: rubber layer installed on the walking track and park ready to receive visitors. Supersedes August maintenance closures. Indexed article reviewed; track length is not adopted."
      },
      {
        "url": "https://www.trip.com/travel-guide/attraction/amman/al-nashama-park-136890032/",
        "note": "Coordinate/identity: named listing address VRQV+XJ3, Amman. Recovered full Plus Code 8G3QVRQV+XJ3 gives cell center 31.8898875, 35.844046875; rounded to five decimals. Listing point, not a surveyed entrance. Hours and ticket boilerplate not adopted."
      }
    ],
    "description": "Public walking track in Marj Al-Hamam; light jogging only because of sharp turns and family traffic. Rubber track resurfacing completed August 2026. Excludes reservable courts and remaining Royal Village land.",
    "slug": "al-nashama-park",
    "supportedActivities": [
      "running",
      "walking"
    ]
  },
  {
    "id": "king-abdullah-ii-park",
    "name": "King Abdullah II Park (Al-Muqabalain)",
    "latitude": 31.90678,
    "longitude": 35.92581,
    "district": "Al-Muqabalain",
    "environment": "park",
    "terrain": "unknown",
    "surfaces": [
      "unknown"
    ],
    "suitability": {
      "running": "limited",
      "walking": "suitable"
    },
    "verificationStatus": "supported",
    "evidence": [
      {
        "url": "https://rhc.jo/en/news/king-inaugurates-king-abdullah-ii-park-mugabalein",
        "note": "Royal Hashemite Court, 27 November 2019: inauguration of this public family park in Mugabalein. Resolves earlier construction closure; distinct from Wadi Saqra gardens and Irbid namesake."
      },
      {
        "url": "https://media.ammancity.gov.jo/Ar/NewsDetails/الأمانة___70_الف_متر_مربع_مساحة_الغطاء_النباتي_للمرحلة_الثالثة_في_حدائق_الملك_عبدالله_الثاني",
        "note": "Municipal account explicitly describes opened phase-two facilities including a jogging/cycling track. Historical phase-three construction context; website 2026 footer is not publication date. Jogging provision supported, present track condition/surface not independently inspected."
      },
      {
        "url": "https://www.emro.who.int/images/stories/jordan/Jordan-Newsletter-Q4-2024.pdf",
        "note": "WHO Q4 2024 newsletter corroborates park activity investment, specifically a women-only walking/gym zone. Indexed PDF excerpt reviewed. That restricted zone is excluded from the general-public record."
      },
      {
        "url": "https://mapcarta.com/W483730363",
        "note": "Coordinate/identity: OpenStreetMap way 483730363 park reference point in southern Amman. Not Wadi Saqra, Irbid or Qweismeh stadium; not an entrance pin."
      }
    ],
    "description": "General-public park paths and documented jogging provision in Al-Muqabalain. Running limited pending a current track-condition assessment; surface and slope unknown. Excludes women-only zone, booked courts and museum interiors; check park opening conditions.",
    "slug": "king-abdullah-ii-park",
    "supportedActivities": [
      "running",
      "walking"
    ]
  },
  {
    "id": "ghamadan-perimeter",
    "name": "Ghamadan / King of Bahrain Forest Perimeter",
    "latitude": 31.85796,
    "longitude": 35.89325,
    "district": "Ghamadan / southern Amman",
    "environment": "open-space",
    "terrain": "unknown",
    "surfaces": [
      "paved",
      "dirt"
    ],
    "suitability": {
      "running": "limited",
      "walking": "limited"
    },
    "verificationStatus": "supported",
    "evidence": [
      {
        "url": "https://greatruns.com/amman-jordan-king-of-bahrain-forest/",
        "note": "Local-club-informed running guide describes the surrounding road/dirt circuit, not official forest trails. Pedestrian walking fit is inferred from that running route. Mixed road use limits suitability; clubs credited by one guide are not independent sources."
      },
      {
        "url": "https://www.mapmyrun.com/routes/view/3407364427",
        "note": "Coordinate/scope: route linked by the guide starts at 31.85796, 35.89325 near sports fields and follows the forest/attractions perimeter. Same evidence lineage as guide. Elevation gain alone does not establish a terrain class."
      },
      {
        "url": "https://media.ammancity.gov.jo/Ar/NewsDetails/الأمانة_تطلق_حملة_بيئية_في_متنزه__غابة_ملك_مملكة_البحرين_",
        "note": "Municipality identifies Ghamadan park as King of Bahrain Forest and documents community public-space use. Supports identity/municipal scope; does not certify road safety or forest trail access."
      }
    ],
    "description": "Published outdoor road/dirt circuit around Ghamadan attractions, starting near sports fields. Shared roads require traffic awareness; no continuous sidewalk or traffic-free route guaranteed. Excludes forest interior, zoo and paid attractions.",
    "slug": "ghamadan-perimeter",
    "supportedActivities": [
      "running",
      "walking"
    ]
  }
];
