import { supportedCity, serviceCities } from "../lib/dynamic-location.ts";
import {
  BodyError,
  checkJsonRequest,
  createRequestBudget,
  privateHeaders,
  publicError,
  readJson,
} from "./http-security.ts";
export interface SearchPlace {
  name: string;
  latitude: number;
  longitude: number;
}
export function parseSearch(input: unknown) {
  const x = input as Record<string, unknown>;
  if (
    !x ||
    typeof x !== "object" ||
    Array.isArray(x) ||
    Object.keys(x).some((k) => !["query", "locale"].includes(k)) ||
    typeof x.query !== "string" ||
    x.query.trim().length < 2 ||
    x.query.length > 100 ||
    /[\u0000-\u001f<>]/.test(x.query) ||
    !["en", "ar"].includes(x.locale as string)
  )
    throw new BodyError("Invalid search", 400);
  return { query: x.query.trim(), locale: x.locale as "en" | "ar" };
}
export function parseSearchResults(raw: unknown): SearchPlace[] {
  if (
    !raw ||
    typeof raw !== "object" ||
    !Array.isArray((raw as { features?: unknown }).features)
  )
    throw new Error("Invalid search response");
  const rows: SearchPlace[] = [];
  for (const f of (raw as { features: unknown[] }).features.slice(0, 10)) {
    const item = f as {
      geometry?: { type?: string; coordinates?: unknown[] };
      properties?: Record<string, unknown>;
    };
    const [longitude, latitude] = item?.geometry?.coordinates ?? [];
    const name = item?.properties?.name;
    if (
      item?.geometry?.type !== "Point" ||
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 200 ||
      /[\u0000-\u001f<>]/.test(name)
    )
      continue;
    if (
      supportedCity({ latitude, longitude }) &&
      !rows.some(
        (p) =>
          p.name === name &&
          p.latitude === latitude &&
          p.longitude === longitude,
      )
    )
      rows.push({ name, latitude, longitude });
  }
  return rows.slice(0, 6);
}
/** Submit-only, one outbound request at a time, 24h/200-entry cache. No reverse GPS. */
export function createGeocoder(
  fetcher: typeof fetch = fetch,
  clock = Date.now,
) {
  const cache = new Map<string, { expires: number; places: SearchPlace[] }>();
  let busy = false,
    last = 0;
  return async (input: unknown) => {
    const { query, locale } = parseSearch(input),
      key = `${locale}:${query.toLocaleLowerCase()}`,
      saved = cache.get(key);
    if (saved && saved.expires > clock()) return saved.places;
    if (busy || clock() - last < 1100)
      throw new BodyError("Please wait before searching again", 429);
    busy = true;
    last = clock();
    try {
      // Deployment can switch to an operator-managed Photon instance without changing the client.
      const url = new URL(
        process.env.VAELORA_GEOCODER_URL ?? "https://photon.komoot.io/api/",
      );
      if (url.protocol !== "https:") throw new Error("HTTPS geocoder required");
      const polygon = serviceCities[0].polygon;
      url.search = new URLSearchParams({
        q: query,
        // Public Photon supports default/de/en/fr. Default preserves local Arabic names.
        lang: locale === "ar" ? "default" : "en",
        limit: "10",
        bbox: [
          Math.min(...polygon.map((p) => p[0])),
          Math.min(...polygon.map((p) => p[1])),
          Math.max(...polygon.map((p) => p[0])),
          Math.max(...polygon.map((p) => p[1])),
        ].join(","),
      }).toString();
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
        redirect: "error",
        headers: {
          "User-Agent": "VAELORA/2.3 (Greater Amman outdoor planner)",
          Accept: "application/json",
        },
      });
      if (!response.ok) throw new Error("Search unavailable");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Empty response");
      let bytes = 0,
        body = "";
      const decoder = new TextDecoder();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 100000) throw new Error("Oversized response");
          body += decoder.decode(value, { stream: true });
        }
      } finally {
        void reader.cancel().catch(() => {});
      }
      const places = parseSearchResults(JSON.parse(body + decoder.decode()));
      if (cache.size >= 200) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: clock() + 86400000, places });
      return places;
    } finally {
      busy = false;
    }
  };
}
export function createSearchHandler(search = createGeocoder()) {
  const budget = createRequestBudget({
    perMinute: 20,
    perClient: 8,
    concurrent: 2,
  });
  return async (request: Request) => {
    const rejected = checkJsonRequest(request);
    if (rejected) return rejected;
    const release = budget(request);
    if (release instanceof Response) return release;
    try {
      return Response.json(
        {
          places: await search(await readJson(request)),
          attribution: "© OpenStreetMap contributors · Photon",
        },
        { headers: privateHeaders },
      );
    } catch (e) {
      return publicError(
        e instanceof BodyError
          ? e.message
          : "Search unavailable. Try a reference area.",
        e instanceof BodyError ? e.status : 503,
      );
    } finally {
      release();
    }
  };
}
