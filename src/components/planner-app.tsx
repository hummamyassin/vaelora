"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Activity as RunIcon, Footprints, LocateFixed, Navigation, Send, Sparkles, ArrowUpRight, Bookmark, LoaderCircle } from "lucide-react";
import { buildUiRecommendationRequest, type Preference, type TimePreset } from "./recommendation-request";
import { PlannerResults } from "./planner-results";
import { areaName, t, type Locale } from "../lib/i18n";
import { coverage } from "../lib/coverage";
import { distanceKm, orderNearby, validCoordinates, type Coordinates } from "../lib/geography";
import type { Activity, ActivityAreaView, AgentView, RecommendationView, UiPolicy } from "./types";

const times: TimePreset[] = ["now", "tonight", "tomorrow-morning", "tomorrow-evening"];
const preferenceOptions: Preference[] = ["flat", "paved", "park", "lowWind", "avoidHeat"];
function persist(key: string, value: unknown) { try { localStorage.setItem(`vaelora:${key}`, JSON.stringify(value)); } catch { /* Storage is optional. */ } }
function stored(key: string): unknown { try { return JSON.parse(localStorage.getItem(`vaelora:${key}`) ?? "null"); } catch { return null; } }
export function PlannerApp({ policy, areas }: { policy: UiPolicy; areas: readonly ActivityAreaView[] }) {
  const [locale, setLocale] = useState<Locale>("en"), [ready, setReady] = useState(false);
  const [activity, setActivity] = useState<Activity>("running"), [time, setTime] = useState<TimePreset>("now"), [minutes, setMinutes] = useState(60);
  const [preferences, setPreferences] = useState<Set<Preference>>(new Set()), [favorites, setFavorites] = useState<string[]>([]);
  const [origin, setOrigin] = useState<Coordinates | null>(null), [reference, setReference] = useState("");
  const [geoState, setGeoState] = useState<"idle" | "locating" | "located" | "geoDenied">("idle");
  const [result, setResult] = useState<RecommendationView | null>(null), [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(false);
  const [prompt, setPrompt] = useState(""), [agentLoading, setAgentLoading] = useState(false), [agentStatus, setAgentStatus] = useState<AgentView["status"] | null>(null);
  const [ambient, setAmbient] = useState(true);
  const resultsRef = useRef<HTMLElement>(null), plannerRef = useRef<HTMLElement>(null);
  const busy = loading || agentLoading;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const language = stored("locale"), activity = stored("activity"), favorites = stored("favorites");
      setLocale(language === "ar" || language === "en" ? language : navigator.language.startsWith("ar") ? "ar" : "en");
      if (activity === "running" || activity === "walking") setActivity(activity);
      if (Array.isArray(favorites)) setFavorites(favorites.filter((id): id is string => typeof id === "string" && areas.some(a => a.id === id)));
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [areas]);
  useEffect(() => { if (ready) { document.documentElement.lang = locale; document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"; document.title = `${t(locale, "brand")} — ${t(locale, "built")}`; persist("locale", locale); } }, [locale, ready]);
  useEffect(() => { if (ready) persist("activity", activity); }, [activity, ready]);
  const matches = useMemo(() => orderNearby(result?.topMatches ?? [], origin), [result, origin]);
  const far = origin && Math.min(...areas.map(a => distanceKm(origin, a))) > 50;
  const scrollTo = (element: HTMLElement | null) => element?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  function toggleFavorite(id: string) { const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id]; setFavorites(next); persist("favorites", next); }
  function togglePreference(value: Preference) { setPreferences(current => { const next = new Set(current); if (next.has(value)) next.delete(value); else next.add(value); return next; }); }
  function receive(next: RecommendationView) { setResult(next); setSelected(null); requestAnimationFrame(() => scrollTo(resultsRef.current)); }
  async function search(nextActivity = activity, nextTime = time) {
    setLoading(true); setError(false); setAgentStatus(null); setResult(null);
    try {
      const response = await fetch("/api/recommendations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildUiRecommendationRequest(nextActivity, nextTime, preferences, policy, new Date(), minutes)) });
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("topMatches" in body) || !Array.isArray(body.topMatches)) throw new Error("Unavailable");
      receive(body as RecommendationView);
    } catch { setError(true); } finally { setLoading(false); }
  }
  function locate(): Promise<Coordinates | null> {
    setGeoState("locating");
    return new Promise(resolve => {
      const fail = () => { setOrigin(null); setReference(""); setGeoState("geoDenied"); resolve(null); };
      if (!navigator.geolocation) return fail();
      navigator.geolocation.getCurrentPosition(position => {
        const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        if (!validCoordinates(point)) return fail();
        setOrigin(point); setReference(""); setGeoState("located"); resolve(point);
      }, fail, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false });
    });
  }
  async function nearNow() { setTime("now"); await locate(); await search(activity, "now"); }
  function chooseJourney(value: Activity) { setActivity(value); scrollTo(plannerRef.current); }
  async function ask(event: FormEvent) {
    event.preventDefault(); if (!prompt.trim() || busy) return;
    setAgentLoading(true); setAgentStatus(null); setError(false); setResult(null);
    try {
      if (!origin && /near me|قريب مني|قريبة مني/i.test(prompt)) await locate();
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt.trim(), locale }) });
      const answer = await response.json() as AgentView;
      if (!answer.status) throw new Error("Unavailable");
      setAgentStatus(answer.status);
      if (answer.result) { receive({ ...answer.result, trace: answer.trace }); setActivity(answer.result.request.activity); }
    } catch { setAgentStatus("service-error"); } finally { setAgentLoading(false); }
  }
  function manualArea(id: string) { setReference(id); const area = areas.find(a => a.id === id); setOrigin(area ? { latitude: area.latitude, longitude: area.longitude } : null); setGeoState("idle"); }

  return <main className="v11" data-ready={ready} dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
    <header className="site-header"><a className="brand" href="#top" aria-label={t(locale, "home")}><span className="brand-mark"><Navigation size={21} /></span>{t(locale, "brand")}</a><nav aria-label={t(locale, "planner")}><a href="#recommend">{t(locale, "planner")}</a><a href="#results">{t(locale, "results")}</a></nav><button className="language-switch" lang={locale === "ar" ? "en" : "ar"} onClick={() => { setLocale(locale === "ar" ? "en" : "ar"); setPrompt(""); }}>{locale === "en" ? "العربية" : "EN"}</button></header>
    <section className="hero" id="top" data-motion={ambient ? "on" : "off"}><div className="hero-copy"><p className="eyebrow">{t(locale, "tagline")}</p><h1>{t(locale, "headline")}</h1><p className="hero-lede">{t(locale, "intro")}</p><p className="coverage-line"><span />{t(locale, "expansion")}</p></div><div className="jordan-terrain" aria-hidden="true"><svg viewBox="0 0 600 360"><circle cx="435" cy="90" r="48" fill="#D8B77C"/><path d="M0 255 88 175 150 204 252 85 303 176 365 147 474 238 600 145V360H0Z" fill="#C98F6B"/><path d="M0 299 111 241 197 259 316 177 389 241 448 214 600 283V360H0Z" fill="#102A3A"/><path d="M0 332Q155 218 283 285T600 305M0 350Q180 247 318 310T600 327M36 360Q198 273 323 333T600 350" fill="none" stroke="#D8B77C" strokeOpacity=".4"/></svg></div><button className="motion-toggle" aria-pressed={!ambient} onClick={() => setAmbient(!ambient)}>{t(locale, ambient ? "pause" : "resume")}</button></section>
    <div className="product-shell">
      <section className="ask-section" id="ask"><div className="ask-heading"><span className="section-symbol"><Sparkles size={22} /></span><div><h2>{t(locale, "ask")}</h2><p>{t(locale, "askHelp")}</p></div></div><form onSubmit={ask} className="ask-form"><label className="sr-only" htmlFor="agent-prompt">{t(locale, "prompt")}</label><div className="prompt-box"><input id="agent-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t(locale, "placeholder")} maxLength={2000} autoComplete="off" /><button type="submit" disabled={busy || !prompt.trim()} aria-label={t(locale, "send")}>{agentLoading ? <LoaderCircle className="spin" /> : <Send />}<span>{t(locale, "send")}</span></button></div><div className="suggestions">{(["suggestion1", "suggestion2", "suggestion3"] as const).map(key => <button type="button" key={key} onClick={() => { setPrompt(t(locale, key)); document.getElementById("agent-prompt")?.focus(); }}>{t(locale, key)}<ArrowUpRight size={14} /></button>)}</div></form><p className="fine-print">{t(locale, "aiRule")}</p><div role="status">{agentLoading && <p>{t(locale, "checking")}</p>}{agentStatus && agentStatus !== "answered" && <p className="agent-notice">{t(locale, agentStatus === "clarification" ? "clarification" : "aiError")}</p>}{agentStatus === "answered" && <a className="answer-link" href="#results">{t(locale, "results")} ↓</a>}</div></section>
      <div className="quick-journeys"><button disabled={busy || geoState === "locating"} onClick={nearNow} className="near-journey"><LocateFixed /><strong>{t(locale, "near")}</strong><small>{t(locale, "nearHelp")}</small><ArrowUpRight /></button><button onClick={() => chooseJourney("running")}><RunIcon /><strong>{t(locale, "run")}</strong><small>{t(locale, "runHelp")}</small><ArrowUpRight /></button><button onClick={() => chooseJourney("walking")}><Footprints /><strong>{t(locale, "walk")}</strong><small>{t(locale, "walkHelp")}</small><ArrowUpRight /></button></div>
      <section className="intent-section" id="recommend" ref={plannerRef}><div className="section-heading"><div><p className="eyebrow">{t(locale, "planner")}</p><h2>{t(locale, "choose")}</h2></div><span className="city-pill">{coverage.country[locale]} / {coverage.cities[0][locale]}</span></div><form className="intent-card" onSubmit={e => { e.preventDefault(); void search(); }}>
        <div className="planner-basics"><fieldset><legend>{t(locale, "activity")}</legend><div className="segmented">{(["running", "walking"] as const).map(a => <button type="button" key={a} aria-pressed={activity === a} onClick={() => setActivity(a)}>{a === "running" ? <RunIcon size={18} /> : <Footprints size={18} />}{t(locale, a)}</button>)}</div></fieldset><fieldset><legend>{t(locale, "duration")}</legend><div className="segmented duration-choices">{[30,60,90].map(n => <button type="button" aria-pressed={minutes === n} onClick={() => setMinutes(n)} key={n}>{n} {t(locale, "minutes")}</button>)}</div></fieldset></div>
        <fieldset><legend>{t(locale, "time")}</legend><div className="time-grid">{times.map(value => <button key={value} type="button" aria-pressed={time === value} onClick={() => setTime(value)}>{t(locale, value)}<small dir="ltr">{value === "now" ? "→" : value === "tonight" ? "18:00–24:00" : value === "tomorrow-morning" ? "06:00–12:00" : "17:00–22:00"}</small></button>)}</div></fieldset>
        <fieldset><legend>{t(locale, "preferences")} <small>{t(locale, "optional")}</small></legend><div className="preference-row">{preferenceOptions.map(p => <button type="button" key={p} aria-pressed={preferences.has(p)} onClick={() => togglePreference(p)}>{preferences.has(p) ? "✓" : "+"} {t(locale, p)}</button>)}</div></fieldset>
        <div className="location-row"><label htmlFor="reference">{t(locale, "location")}<select id="reference" value={reference} onChange={e => manualArea(e.target.value)}><option value="">{t(locale, "manual")}</option>{areas.map(a => <option value={a.id} key={a.id}>{areaName(locale, a)}</option>)}</select></label><button type="button" disabled={geoState === "locating"} onClick={() => void locate()}><LocateFixed size={17} />{t(locale, "useLocation")}</button>{origin && <button type="button" onClick={() => { setOrigin(null); setReference(""); setGeoState("idle"); }}>{t(locale, "clearLocation")}</button>}</div>
        <p className="geo-status" role="status">{geoState !== "idle" ? t(locale, geoState) : reference ? t(locale, "manualNote") : t(locale, "noLocation")}{far && <> · {t(locale, "far")}</>}</p><div className="planner-submit"><p className="fine-print">{t(locale, "durationNote")}</p><button className="primary-action" disabled={busy} type="submit">{busy ? <LoaderCircle className="spin" size={18} /> : <ArrowUpRight size={18} />}{t(locale, busy ? "checking" : "find")}</button></div>
      </form></section>
      <section className="results-section" ref={resultsRef} id="results" aria-live="polite" aria-busy={busy}>{loading && <div className="state-card loading-state"><LoaderCircle className="spin" /><h2>{t(locale, "checking")}</h2><div className="skeleton" /></div>}{error && <div className="state-card error-state" role="alert"><p>{t(locale, "error")}</p><button onClick={() => scrollTo(plannerRef.current)}>{t(locale, "retry")}</button></div>}{result && <PlannerResults result={result} matches={matches} selectedId={selected} onSelect={setSelected} locale={locale} origin={origin} favorites={favorites} toggleFavorite={toggleFavorite} />}</section>
      <details className="favorites-panel"><summary><Bookmark size={17} />{t(locale, "favorites")} ({favorites.length})</summary>{favorites.length ? <div>{favorites.map(id => { const area = areas.find(a => a.id === id)!; return <button key={id} onClick={() => { manualArea(id); scrollTo(plannerRef.current); }}>{areaName(locale, area)}</button>; })}</div> : <p>{t(locale, "noneSaved")}</p>}</details><footer><a href="#top" className="brand">{t(locale, "brand")}</a><p>{t(locale, "built")}</p><p>{t(locale, "coverage")}</p><small>{t(locale, "dataCredit")}</small></footer>
    </div>
  </main>;
}
