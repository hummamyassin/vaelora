/** Presentation-only metadata. Never used by eligibility, weather, scoring or AI tools. */
export type LocationPhoto = {
  src: string;
  width: number;
  height: number;
  alt: { en: string; ar: string };
  author: string;
  source: string;
  license: "CC BY-SA 3.0" | "CC BY-SA 4.0";
  licenseUrl: string;
  position: string;
};
const commons = "https://commons.wikimedia.org/wiki/File:";
export const locationPhotos: Readonly<Record<string, LocationPhoto>> = {
  "sports-city": {
    src: "/images/locations/sports-city.webp", width: 1200, height: 1600,
    alt: { en: "A dirt path between trees at Al-Hussein Youth City, Amman", ar: "ممر ترابي بين الأشجار في مدينة الحسين للشباب في عمّان" },
    author: "Mohammad hajeer", source: commons + "Amman_Sport_City_20.jpg",
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", position: "50% 54%",
  },
  "king-hussein-park": {
    src: "/images/locations/king-hussein-park.webp", width: 1600, height: 900,
    alt: { en: "Tree-lined paths in King Hussein Park with Amman in the distance", ar: "ممرات تحيط بها الأشجار في حدائق الحسين وتظهر عمّان في الأفق" },
    author: "روخو", source: commons + "Al_Hussein_Public_Parks_01.JPG",
    license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", position: "50% 55%",
  },
  "wakalat-street": {
    src: "/images/locations/wakalat-street.webp", width: 1200, height: 900,
    alt: { en: "The pedestrian space and planters along Wakalat Street, Amman", ar: "المساحة المخصصة للمشاة وأحواض النباتات في شارع الوكالات في عمّان" },
    author: "Freedom's Falcon", source: commons + "Wakalat_Street_Amman_2.jpg",
    license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", position: "50% 60%",
  },
  "rainbow-street": {
    src: "/images/locations/rainbow-street.webp", width: 1200, height: 1600,
    alt: { en: "Eastward street-level view along Rainbow Street, with vehicles and pavements", ar: "منظر باتجاه الشرق لشارع الرينبو، تظهر فيه المركبات والأرصفة" },
    author: "miiika", source: commons + "Rainbow_Street,_Amman_--_Eastward.jpg",
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", position: "50% 55%",
  },
  "abdali-boulevard": {
    src: "/images/locations/abdali-boulevard.webp", width: 1200, height: 900,
    alt: { en: "Pedestrian space beside the shops on Abdali Boulevard, Amman", ar: "مساحة المشاة بجانب المحال في بوليفارد العبدلي في عمّان" },
    author: "Rania al-Bahara", source: commons + "The_Boulevard.jpg",
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", position: "50% 55%",
  },
};
export const photoFallbackReasons: Readonly<Record<string, string>> = {
  "japanese-park-abdoun": "No sufficiently identified, openly licensed photograph selected for this specific garden.",
  "national-gallery-park": "Reviewed Commons candidates primarily depict buildings or individual artworks, not a representative garden view with clear artwork reuse rights.",
  "hashemite-plaza": "Reviewed candidates emphasize the archaeological attraction; no suitable activity-space photograph selected for this release.",
  "al-nashama-park": "News and user-review photos found, but no reusable license established.",
  "king-abdullah-ii-park": "Photos found in news and third-party publications, but no reusable license established for the specific image.",
  "ghamadan-perimeter": "No openly licensed photograph verified as the exact outdoor perimeter circuit rather than the forest or private attractions.",
};
