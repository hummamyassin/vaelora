import type { RecommendationResponse } from "../recommendations/pipeline.ts";
import type { RecommendationRequest } from "../../domain/recommendation/types.ts";
import { isObject, parseIntent, resolveIntent, type Intent } from "./intent.ts";
import { presentationTool, recommendationTool, type RecommendationModel } from "./contracts.ts";
import { t, label, areaName, areaDescription, windowText, type Locale } from "../../lib/i18n.ts";

const clarificationText = {
  "missing-activity": "Specify running or walking.", ambiguous: "Specify an unambiguous day (today or tomorrow) and time.",
  contradictory: "The constraints conflict; submit a consistent time window and preferences.",
  "unsupported-activity": "Only running and walking are supported.", "unsupported-date": "Only today and tomorrow in Amman are supported.",
  "unsupported-constraint": "A requested constraint cannot be verified by VAELORA; submit a request using supported area and weather preferences.",
  "route-distance": "VAELORA recommends activity areas, not verified routes or distances such as 5K. Submit an area request without a route-distance requirement.",
  "fractional-time": "Only whole-hour forecast windows and durations are supported; submit explicit whole-hour bounds.",
};
export function validatePresentation(value: unknown, result: RecommendationResponse) {
  if (!isObject(value) || Object.keys(value).length !== 1 || !Array.isArray(value.areaIds)) throw new Error("Invalid presentation");
  const expected = result.topMatches.map(m => m.area.id);
  if (value.areaIds.length !== expected.length || new Set(value.areaIds).size !== expected.length || value.areaIds.some(id => typeof id !== "string" || !expected.includes(id))) throw new Error("Ungrounded area references");
}
export function renderRecommendation(result: RecommendationResponse, assumptions: string[], locale: Locale = "en") {
  const matches = result.topMatches.map(m => ({ areaId: m.area.id, name: m.area.name, fit: m.fit, weatherSeverity: m.weatherSeverity,
    terrain: m.area.terrain, surfaces: m.area.surfaces, environment: m.area.environment, windows: m.bestWindows,
    caveat: m.area.description, evidence: m.area.evidence }));
  const text = matches.length
    ? matches.map(m => `${m.name}: ${m.fit} for ${result.request.activity}; weather category ${m.weatherSeverity} under ${result.policy.id}. Best windows (Amman): ${m.windows.map(w => `${w.start}–${w.end}`).join(", ")}. Terrain: ${m.terrain}; surfaces: ${m.surfaces.join(", ")}; environment: ${m.environment}. ${m.caveat}`).join("\n\n")
    : result.status === "weather-unavailable" ? "Weather is unavailable; VAELORA cannot provide a recommendation." : "No matches satisfy this request with the available area evidence and forecasts.";
  if (locale === "ar") {
    const localized = result.topMatches.map(m => ({ ...matches.find(x => x.areaId === m.area.id)!, name: areaName(locale, m.area), caveat: areaDescription(locale, m.area) }));
    return { matches: localized, text: [localized.length ? localized.map(m => `${m.name}: ${label(locale, m.fit)} — ${label(locale, result.request.activity)}. ${t(locale, "bestTime")}: ${result.request.date} ${m.windows.map(w => windowText(w.start, w.end)).join("، ")}. ${t(locale, "terrain")}: ${label(locale, m.terrain)}؛ ${t(locale, "surface")}: ${m.surfaces.map(s => label(locale, s)).join("، ")}. ${m.caveat}`).join("\n\n") : t(locale, result.status === "weather-unavailable" ? "weatherError" : "empty"), t(locale, "durationNote"), t(locale, "disclaimer")].join("\n\n") };
  }
  return { matches, text: [text, ...assumptions, ...result.warnings].join("\n\n") };
}
export function createOutdoorAgent(options: { model: RecommendationModel; run: (request: RecommendationRequest) => Promise<RecommendationResponse>; clock?: () => Date }) {
  return async (prompt: unknown, locale: Locale = "en") => {
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 2000) return { status: "invalid-request" as const, text: locale === "ar" ? "اكتب طلبًا واضحًا لا يتجاوز 2000 حرف." : "Submit a nonempty request of at most 2000 characters.", trace: [] };
    const now = (options.clock ?? (() => new Date()))();
    let intent: Intent;
    let call;
    try {
      call = await options.model.extract(prompt, now);
      if (call.name !== recommendationTool.name) throw new Error("Unknown tool");
      intent = parseIntent(call.arguments);
    } catch { return { status: "model-error" as const, text: t(locale, "aiError"), trace: [] }; }
    const resolved = resolveIntent(intent, now);
    if (resolved.kind === "clarification") return { status: "clarification" as const, intent, issues: resolved.issues, text: locale === "ar" ? t(locale,"clarification") : resolved.issues.map(i => clarificationText[i]).join(" "), trace: [{ action: "constraints-need-clarification", issues: resolved.issues }] };
    let result: RecommendationResponse;
    try { result = await options.run(resolved.request); }
    catch { return { status: "service-error" as const, text: t(locale, "error"), trace: [] }; }
    let presentationValidated = false;
    try {
      const presentation = await options.model.present(call, result);
      if (presentation.name !== presentationTool.name) throw new Error("Unknown tool");
      validatePresentation(presentation.arguments, result);
      presentationValidated = true;
    } catch { /* The complete trusted result remains usable without model prose. */ }
    return { status: "answered" as const, intent, request: resolved.request, assumptions: resolved.assumptions,
      presentationValidated, ...renderRecommendation(result, resolved.assumptions, locale), result,
      trace: [{ action: "activity-detected", activity: resolved.request.activity }, { action: "constraints-extracted", request: resolved.request, assumptions: resolved.assumptions }, ...result.trace.slice(2)] };
  };
}
