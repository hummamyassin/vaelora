import { distanceKm, type Coordinates } from "../lib/geography.ts";
import { isInsideJordan } from "../lib/jordan.ts";

/**
 * Forecast reference points across Jordan, never activity places or surveyed
 * neighborhood boundaries. `city` is the governorate (src/lib/jordan.ts).
 */
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
  // Town reference points across Jordan; `city` is the governorate id.
  {
    id: "irbid",
    city: "irbid",
    name: { en: "Irbid", ar: "إربد" },
    aliases: ["Irbed","اربد"],
    latitude: 32.55556,
    longitude: 35.85,
    sources: ["https://www.wikidata.org/wiki/Q194165"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "ramtha",
    city: "irbid",
    name: { en: "Ar-Ramtha", ar: "الرمثا" },
    aliases: ["Ramtha","Al Ramtha","رمثا"],
    latitude: 32.55917,
    longitude: 36.00694,
    sources: ["https://www.wikidata.org/wiki/Q31594"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "zarqa",
    city: "zarqa",
    name: { en: "Zarqa", ar: "الزرقاء" },
    aliases: ["Az Zarqa","Zarka","زرقاء"],
    latitude: 32.08333,
    longitude: 36.1,
    sources: ["https://www.wikidata.org/wiki/Q148062"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "salt",
    city: "balqa",
    name: { en: "As-Salt", ar: "السلط" },
    aliases: ["Salt","Al Salt","سلط"],
    latitude: 32.03917,
    longitude: 35.72722,
    sources: ["https://www.wikidata.org/wiki/Q867586"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "fuheis",
    city: "balqa",
    name: { en: "Fuheis", ar: "الفحيص" },
    aliases: ["Fuhais","Al Fuhays"],
    latitude: 32.01667,
    longitude: 35.76667,
    sources: ["https://www.wikidata.org/wiki/Q986769"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "sweimeh",
    city: "balqa",
    name: { en: "Sweimeh (Dead Sea)", ar: "السويمة (البحر الميت)" },
    aliases: ["Dead Sea","Suwayma","البحر الميت","سويمة"],
    latitude: 31.76589,
    longitude: 35.59844,
    sources: ["https://www.wikidata.org/wiki/Q110921589"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "madaba",
    city: "madaba",
    name: { en: "Madaba", ar: "مادبا" },
    aliases: ["Madaba City"],
    latitude: 31.71667,
    longitude: 35.8,
    sources: ["https://www.wikidata.org/wiki/Q1683958"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "jerash",
    city: "jerash",
    name: { en: "Jerash", ar: "جرش" },
    aliases: ["Jarash","Gerasa"],
    latitude: 32.27228,
    longitude: 35.8914,
    sources: ["https://www.wikidata.org/wiki/Q31565"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "ajloun",
    city: "ajloun",
    name: { en: "Ajloun", ar: "عجلون" },
    aliases: ["Ajlun","Ajlune"],
    latitude: 32.3325,
    longitude: 35.75167,
    sources: ["https://www.wikidata.org/wiki/Q1141858"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "mafraq",
    city: "mafraq",
    name: { en: "Mafraq", ar: "المفرق" },
    aliases: ["Al Mafraq","مفرق"],
    latitude: 32.34278,
    longitude: 36.205,
    sources: ["https://www.wikidata.org/wiki/Q276747"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "azraq",
    city: "zarqa",
    name: { en: "Azraq", ar: "الأزرق" },
    aliases: ["Al Azraq","ازرق"],
    latitude: 31.83333,
    longitude: 36.81667,
    sources: ["https://www.wikidata.org/wiki/Q2426928"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "karak",
    city: "karak",
    name: { en: "Al-Karak", ar: "الكرك" },
    aliases: ["Karak","Kerak","كرك"],
    latitude: 31.18444,
    longitude: 35.705,
    sources: ["https://www.wikidata.org/wiki/Q31572"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "tafilah",
    city: "tafilah",
    name: { en: "Tafilah", ar: "الطفيلة" },
    aliases: ["Tafila","At Tafilah","طفيلة"],
    latitude: 30.8375,
    longitude: 35.60444,
    sources: ["https://www.wikidata.org/wiki/Q2550996"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "wadi-musa",
    city: "maan",
    name: { en: "Wadi Musa", ar: "وادي موسى" },
    aliases: ["Petra","البتراء","Wadi Mousa"],
    latitude: 30.32,
    longitude: 35.4784,
    sources: ["https://www.wikidata.org/wiki/Q2739446"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "maan",
    city: "maan",
    name: { en: "Ma'an", ar: "معان" },
    aliases: ["Maan","Ma’an"],
    latitude: 30.19333,
    longitude: 35.73333,
    sources: ["https://www.wikidata.org/wiki/Q31616"],
    reviewedAt: "2026-11-01",
  },
  {
    id: "aqaba",
    city: "aqaba",
    name: { en: "Aqaba", ar: "العقبة" },
    aliases: ["Akaba","Al Aqaba","عقبة"],
    latitude: 29.53222,
    longitude: 35.00611,
    sources: ["https://www.wikidata.org/wiki/Q180522"],
    reviewedAt: "2026-11-01",
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
/** One forecast reference per governorate, for the country-wide regional map. */
export const regionalReferenceIds = ["amman-central", "irbid", "ajloun", "jerash", "mafraq", "zarqa", "salt", "madaba", "karak", "tafilah", "maan", "aqaba"] as const;
/** The closest reference point for a location in Jordan; null outside Jordan or far from any. */
export function nearestWeatherArea(point: Coordinates) {
  if (!isInsideJordan(point)) return null;
  const area = [...weatherAreas].sort(
    (a, b) => distanceKm(point, a) - distanceKm(point, b),
  )[0];
  return distanceKm(point, area) <= 60 ? area : null;
}
