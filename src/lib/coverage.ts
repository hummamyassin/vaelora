/** Coverage is explicit: adding a city requires a reviewed production-area mapping. */
export const coverage = {
  country: { id: "JO", en: "Jordan", ar: "الأردن" },
  cities: [{ id: "amman", en: "Greater Amman", ar: "عمّان الكبرى", center: { latitude: 31.945, longitude: 35.895 }, areaIds: ["sports-city", "king-hussein-park", "rainbow-street", "wakalat-street", "abdali-boulevard", "japanese-park-abdoun", "national-gallery-park", "hashemite-plaza", "al-nashama-park", "king-abdullah-ii-park", "ghamadan-perimeter"] }],
} as const;
