import { distanceKm, type Coordinates } from "../lib/geography.ts";

/** Forecast reference points, never activity places or surveyed neighborhood boundaries. */
export interface WeatherArea {
  id: string;
  city: string;
  name: { en: string; ar: string };
  aliases: readonly string[];
  latitude: number;
  longitude: number;
  sources: readonly string[];
  reviewedAt: string;
}
const geo = "https://www.geonames.org/search.html?country=JO&q=Amman";
export const weatherAreas: readonly WeatherArea[] = [
  {
    id: "dabouq",
    city: "amman",
    name: { en: "Dabouq", ar: "دابوق" },
    aliases: ["Dabuq", "Dabooq"],
    latitude: 31.98806,
    longitude: 35.8113,
    sources: [
      "https://mapcarta.com/N2859219638",
      "https://www.openstreetmap.org/node/2859219638",
    ],
    reviewedAt: "2026-09-14",
  },
  {
    id: "abdoun",
    city: "amman",
    name: { en: "Abdoun", ar: "عبدون" },
    aliases: ["Abdun"],
    latitude: 31.94883,
    longitude: 35.89266,
    sources: [
      "https://mapcarta.com/N8867005838",
      "https://www.openstreetmap.org/node/8867005838",
    ],
    reviewedAt: "2026-09-14",
  },
  {
    id: "tla-al-ali",
    city: "amman",
    name: { en: "Tla’ Al-Ali", ar: "تلاع العلي" },
    aliases: ["Tla Al Ali", "Tlaa Al Ali", "Tila Al Ali", "منطقة تلاع العلي"],
    latitude: 31.99465,
    longitude: 35.8662,
    sources: [
      "https://mapcarta.com/N7529858090",
      "https://www.openstreetmap.org/node/7529858090",
    ],
    reviewedAt: "2026-09-14",
  },
  {
    id: "amman-central",
    city: "amman",
    name: { en: "Central Amman", ar: "وسط عمّان" },
    aliases: ["Amman", "عمان", "عمّان", "وسط عمان"],
    latitude: 31.955220900178322,
    longitude: 35.94503402709961,
    sources: [geo],
    reviewedAt: "2026-09-13",
  },
  {
    id: "shafa-badran",
    city: "amman",
    name: { en: "Shafa Badran", ar: "شفا بدران" },
    aliases: ["Shafa Badran District", "Shafa Badraan"],
    latitude: 32 + 3 / 60 + 6.9 / 3600,
    longitude: 35 + 54 / 60 + 3.3 / 3600,
    sources: [
      "https://www.wikidata.org/wiki/Q651843",
      "https://amman.clustermappinginitiative.org/node/267",
    ],
    reviewedAt: "2026-09-13",
  },
  {
    id: "jubaiha",
    city: "amman",
    name: { en: "Jubaiha", ar: "الجبيهة" },
    aliases: ["Al Jubayhah", "Jubeiha", "Al Jubeiha", "جبيهة"],
    latitude: 32.010707,
    longitude: 35.898015,
    sources: [geo],
    reviewedAt: "2026-09-13",
  },
  {
    id: "sweileh",
    city: "amman",
    name: { en: "Sweileh", ar: "صويلح" },
    aliases: ["Suwaylih", "Suweileh"],
    latitude: 32.020733,
    longitude: 35.823953,
    sources: [geo],
    reviewedAt: "2026-09-13",
  },
  {
    id: "khalda",
    city: "amman",
    name: { en: "Khalda", ar: "خلدا" },
    aliases: ["Khilda", "Hayy Khilda", "حي خلدا"],
    latitude: 31.992023,
    longitude: 35.840022,
    sources: [geo],
    reviewedAt: "2026-09-13",
  },
  {
    id: "marj-al-hamam",
    city: "amman",
    name: { en: "Marj Al-Hamam", ar: "مرج الحمام" },
    aliases: ["Marj Al Hamam", "Marj el Hamam"],
    latitude: 31.90274,
    longitude: 35.84645,
    sources: [geo],
    reviewedAt: "2026-09-13",
  },
];
export function normalizeAreaText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}
export function searchWeatherAreas(query: string) {
  const needle = normalizeAreaText(query);
  return weatherAreas.filter((a) =>
    [a.name.en, a.name.ar, ...a.aliases].some((n) =>
      normalizeAreaText(n).includes(needle),
    ),
  );
}
export function nearestWeatherArea(point: Coordinates) {
  const area = [...weatherAreas].sort(
    (a, b) => distanceKm(point, a) - distanceKm(point, b),
  )[0];
  return distanceKm(point, area) <= 25 ? area : null;
}
