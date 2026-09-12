"use client";

import dynamic from "next/dynamic";
import { Activity as ActivityIcon, ArrowRight, CalendarDays, Check, ChevronDown, Clock3, CloudSun, Footprints, Info, LoaderCircle, MapPin, Mountain, Navigation, RefreshCw, Route, Send, ShieldCheck, Sparkles, SunMedium, ThermometerSun, Trees, Wind, X } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import type { Activity, AgentView, HourlyConditionsView, MatchView, RecommendationView, UiPolicy } from "./types";
import { buildUiRecommendationRequest, type Preference, type TimePreset } from "./recommendation-request";

const AmmanMap = dynamic(() => import("./amman-map").then(module => module.AmmanMap), { ssr: false, loading: () => <div className="map-loading"><LoaderCircle className="spin" /> Preparing the map…</div> });

const timeOptions: Array<{ id: TimePreset; label: string; note: string }> = [
  { id: "now", label: "Now", note: "Next practical hours" }, { id: "tonight", label: "Tonight", note: "18:00–24:00" },
  { id: "tomorrow-morning", label: "Tomorrow morning", note: "06:00–12:00" }, { id: "tomorrow-evening", label: "Tomorrow evening", note: "17:00–22:00" },
];
const preferenceOptions: Array<{ id: Preference; label: string; icon: typeof Mountain }> = [
  { id: "flat", label: "Flat terrain", icon: Mountain }, { id: "paved", label: "Paved surface", icon: Route }, { id: "park", label: "Park setting", icon: Trees },
  { id: "lowWind", label: "Low wind", icon: Wind }, { id: "avoidHeat", label: "Avoid heat", icon: ThermometerSun },
];
const severityLabels = ["Preferred conditions", "Acceptable conditions", "Poor conditions"] as const;
const traceLabels: Record<string, string> = { "activity-detected": "Activity detected", "constraints-extracted": "Constraints applied", "eligible-locations-found": "Locations filtered", "weather-retrieved": "Weather checked", "suitability-calculated": "Suitability calculated", "best-time-evaluated": "Best time evaluated", "matches-returned": "Top Matches returned", "constraints-need-clarification": "Clarification needed" };

function formatWindow(start: string, end: string) { return `${start.slice(11, 16)}–${end.endsWith("T00:00") ? "24:00" : end.slice(11, 16)}`; }
function compactNumber(value?: number | null, suffix = "") { return typeof value === "number" ? `${Math.round(value)}${suffix}` : "—"; }
function selectedWeather(result: RecommendationView, areaId: string) { const weather = result.weather.find(item => item.areaId === areaId)?.result; return weather?.ok ? weather : null; }
function firstBestHour(result: RecommendationView, match: MatchView) { const weather = selectedWeather(result, match.area.id); return weather?.hourly.find(hour => hour.time === match.bestWindows[0]?.start); }
function isInBestWindow(hour: HourlyConditionsView, windows: MatchView["bestWindows"]) { return windows.some(window => hour.time >= window.start && hour.time < window.end); }

export function VaeloraApp({ policy }: { policy: UiPolicy }) {
  const [activity, setActivity] = useState<Activity>("running"); const [time, setTime] = useState<TimePreset>("tonight");
  const [preferences, setPreferences] = useState<Set<Preference>>(new Set()); const [result, setResult] = useState<RecommendationView | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const [agentPrompt, setAgentPrompt] = useState(""); const [agentResult, setAgentResult] = useState<AgentView | null>(null); const [agentLoading, setAgentLoading] = useState(false); const [agentError, setAgentError] = useState<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [ambientMotion, setAmbientMotion] = useState(true);
  const selectedMatch = useMemo(() => result?.topMatches.find(match => match.area.id === selectedAreaId) ?? result?.topMatches[0] ?? null, [result, selectedAreaId]);
  function togglePreference(id: Preference) { setPreferences(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  async function findSpots(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null); setResult(null); setSelectedAreaId(null);
    try {
      const response = await fetch("/api/recommendations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildUiRecommendationRequest(activity, time, preferences, policy)) });
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("topMatches" in body)) { const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "Recommendations are unavailable right now."; throw new Error(message); }
      const next = body as RecommendationView; setResult(next); setSelectedAreaId(next.topMatches[0]?.area.id ?? null);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Recommendations are unavailable right now."); } finally { setLoading(false); }
  }
  async function askVaelora(event: FormEvent) {
    event.preventDefault(); if (!agentPrompt.trim()) return; setAgentLoading(true); setAgentError(null); setAgentResult(null); setSubmittedQuery(agentPrompt.trim());
    try {
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: agentPrompt.trim() }) }); const body: unknown = await response.json();
      if (!response.ok && (!body || typeof body !== "object" || !("status" in body))) throw new Error(response.status === 503 ? "Ask VAELORA is not configured on this environment yet." : "Ask VAELORA could not process that request.");
      setAgentResult(body as AgentView);
    } catch (cause) { setAgentError(cause instanceof Error ? cause.message : "Ask VAELORA is unavailable."); } finally { setAgentLoading(false); }
  }

  return <main>
    <header className="site-header"><a className="brand" href="#top" aria-label="VAELORA home"><span className="brand-mark"><Navigation size={17} strokeWidth={2.4} /></span><span>VAELORA</span></a><nav aria-label="Primary navigation"><a href="#recommend">Find a spot</a><a href="#ask">Ask VAELORA</a></nav><span className="region-pill"><MapPin size={14} /> Greater Amman</span></header>
    <section className="hero" id="top" data-motion={ambientMotion ? "on" : "off"}><div className="hero-copy"><p className="eyebrow"><span /> Weather-aware outdoor guidance</p><h1>Find your best<br /><em>time outside.</em></h1><p className="hero-lede">Running and walking recommendations shaped by real Amman weather, verified places, and what matters to you.</p><a className="hero-action" href="#recommend">Plan my time outside <ArrowRight size={18} /></a><div className="trust-row"><span><ShieldCheck size={17} /> Evidence-reviewed areas</span><span><CloudSun size={17} /> Live local forecasts</span></div></div><div className="hero-orbit" aria-hidden="true"><div className="topo-ring ring-one" /><div className="topo-ring ring-two" /><div className="topo-ring ring-three" /><div className="hero-coordinate">31.9539° N<br />35.9106° E</div><div className="sun-disc"><SunMedium /></div><div className="terrain-line" /></div><button type="button" className="motion-toggle" aria-pressed={!ambientMotion} onClick={() => setAmbientMotion(value => !value)}>{ambientMotion ? "Pause ambient motion" : "Resume ambient motion"}</button></section>

    <section className="intent-section" id="recommend"><div className="section-intro"><p className="section-kicker">Plan your outing</p><h2>What feels right today?</h2><p>Choose the essentials. VAELORA handles the forecast and comparisons.</p></div>
      <form className="intent-card" onSubmit={findSpots}>
        <fieldset><legend><span>01</span> Activity</legend><div className="activity-grid">
          <button type="button" aria-pressed={activity === "running"} className={activity === "running" ? "choice-card active" : "choice-card"} onClick={() => setActivity("running")}><span className="choice-icon"><ActivityIcon /></span><span><strong>Running</strong><small>Find your stride</small></span>{activity === "running" && <Check className="choice-check" />}</button>
          <button type="button" aria-pressed={activity === "walking"} className={activity === "walking" ? "choice-card active" : "choice-card"} onClick={() => setActivity("walking")}><span className="choice-icon"><Footprints /></span><span><strong>Walking</strong><small>Move at your pace</small></span>{activity === "walking" && <Check className="choice-check" />}</button>
        </div></fieldset>
        <fieldset><legend><span>02</span> Time</legend><div className="time-grid">{timeOptions.map(option => <button type="button" key={option.id} aria-pressed={time === option.id} className={time === option.id ? "time-choice active" : "time-choice"} onClick={() => setTime(option.id)}><Clock3 size={17} /><strong>{option.label}</strong><small>{option.note}</small></button>)}</div></fieldset>
        <fieldset><legend><span>03</span> Preferences <small>Optional</small></legend><div className="preference-row">{preferenceOptions.map(option => { const Icon = option.icon; return <button type="button" key={option.id} aria-pressed={preferences.has(option.id)} className={preferences.has(option.id) ? "preference active" : "preference"} onClick={() => togglePreference(option.id)}><Icon size={16} />{option.label}</button>; })}</div>{(preferences.has("lowWind") || preferences.has("avoidHeat")) && <p className="policy-note"><Info size={14} /> Uses VAELORA’s provisional {activity} comfort limits; it is not a safety assessment.</p>}</fieldset>
        <button className="primary-action" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" /> Checking live conditions…</> : <>Find My Best Spots <ArrowRight /></>}</button><p className="form-footnote"><CloudSun size={14} /> Forecasts are checked when you search. Conditions and access can change.</p>
      </form>
    </section>

    <section className="results-section" ref={resultRef} aria-live="polite">
      {loading && <LoadingState />}{error && <ErrorState message={error} onRetry={() => document.querySelector<HTMLButtonElement>(".primary-action")?.focus()} />}{result && result.topMatches.length === 0 && <EmptyState status={result.status} />}
      {result && result.topMatches.length > 0 && selectedMatch && <><div className="results-heading"><div><p className="section-kicker">Live recommendation</p><h2>Top Matches</h2><p>{result.topMatches.length > 1 ? `${result.topMatches.length} places share the leading match band—shown without false ranking.` : "The strongest fit for your selected activity, time, and preferences."}</p></div><div className="result-time"><CalendarDays size={17} /><span><strong>{result.request.date}</strong><small>{String(result.request.startHour).padStart(2, "0")}:00–{String(result.request.endHour).padStart(2, "0")}:00 · Amman</small></span></div></div>
        <div className="results-layout"><div className="matches-column">{result.topMatches.map((match, index) => { const hour = firstBestHour(result, match); const selected = match.area.id === selectedMatch.area.id; return <article className={selected ? "match-card selected" : "match-card"} key={match.area.id}><button className="match-card-main" type="button" aria-pressed={selected} onClick={() => setSelectedAreaId(match.area.id)}><span className="match-index">{String(index + 1).padStart(2, "0")}</span><span className="match-body"><span className="match-topline"><span className={`condition-badge severity-${match.weatherSeverity}`}><span />{severityLabels[match.weatherSeverity]}</span><small>{match.area.district}</small></span><strong className="match-name">{match.area.name}</strong><span className="best-time"><Clock3 size={16} /> Best time <b>{formatWindow(match.bestWindows[0].start, match.bestWindows[0].end)}</b></span><span className="weather-strip"><span><ThermometerSun size={15} />{compactNumber(hour?.temperatureC, "°")}</span><span>Feels {compactNumber(hour?.apparentTemperatureC, "°")}</span><span><Wind size={15} />{compactNumber(hour?.windKmh, " km/h")}</span></span><span className="attribute-strip"><span>{match.area.terrain} terrain</span><span>{match.area.environment}</span><span>{match.fit} for {result.request.activity}</span></span></span><ChevronDown className={selected ? "card-chevron open" : "card-chevron"} /></button>{selected && <MatchDetail result={result} match={match} />}</article>; })}</div><div className="map-column"><AmmanMap matches={result.topMatches} selectedAreaId={selectedMatch.area.id} onSelect={setSelectedAreaId} /></div></div>
        <HourlyTimeline result={result} match={selectedMatch} /><TracePanel trace={result.trace} /></>}
    </section>

    <section className="ask-section" id="ask"><div className="ask-inner"><div className="ask-copy"><span className="ask-icon"><Sparkles /></span><p className="section-kicker">Natural-language planning</p><h2>Ask VAELORA</h2><p>Describe the outing you want. The same verified places, live weather, and deterministic recommendation engine stay in control.</p></div><div className="ask-console" aria-live="polite" aria-busy={agentLoading}><form onSubmit={askVaelora}><label htmlFor="agent-prompt">What are you looking for?</label><div className="prompt-box"><textarea id="agent-prompt" value={agentPrompt} onChange={event => setAgentPrompt(event.target.value)} maxLength={2000} placeholder="A flat, low-wind run tomorrow after 6 PM…" rows={3} /><button type="submit" disabled={agentLoading || !agentPrompt.trim()} aria-label="Ask VAELORA">{agentLoading ? <LoaderCircle className="spin" /> : <Send />}</button></div><p><ShieldCheck size={14} /> AI extracts your constraints. It never invents places, weather, or scores.</p></form>{agentError && <div className="agent-notice"><Info size={17} /><span><strong>AI not available</strong>{agentError}</span></div>}{agentLoading && <p className="agent-progress" role="status"><LoaderCircle className="spin" size={16} /> Checking your intent and local conditions…</p>}{agentResult && <AgentAnswer answer={agentResult} query={submittedQuery} />}</div></div></section>
    <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><Navigation size={15} /></span>VAELORA</a><p>Weather-aware outdoor recommendations for Greater Amman.</p><span>Weather by Open-Meteo · Map © OpenStreetMap contributors</span></footer>
  </main>;
}

function MatchDetail({ result, match }: { result: RecommendationView; match: MatchView }) { return <div className="match-detail"><p className="deterministic-explanation"><Sparkles size={16} /><span><strong>Why this match</strong>{match.fit === "suitable" ? `Its verified characteristics support ${result.request.activity}, and its best available hour falls in the leading weather band.` : `It supports ${result.request.activity} with documented limitations, and its best available hour falls in the leading weather band.`}</span></p><dl><div><dt>Terrain</dt><dd>{match.area.terrain}</dd></div><div><dt>Surface</dt><dd>{match.area.surfaces.join(", ")}</dd></div><div><dt>Setting</dt><dd>{match.area.environment}</dd></div><div><dt>Evidence</dt><dd>{match.area.verificationStatus}</dd></div></dl><p className="area-description">{match.area.description}</p><details><summary>Evidence and area notes <ChevronDown size={15} /></summary><ul>{match.area.evidence.map(item => <li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">Source</a><span>{item.note}</span></li>)}</ul></details></div>; }
function HourlyTimeline({ result, match }: { result: RecommendationView; match: MatchView }) {
  const weather = selectedWeather(result, match.area.id); if (!weather) return null;
  const hours = weather.hourly.filter(hour => hour.time.startsWith(result.request.date) && Number(hour.time.slice(11, 13)) >= result.request.startHour && Number(hour.time.slice(11, 13)) < result.request.endHour);
  return <section className="timeline-panel"><div className="panel-heading"><div><p className="section-kicker">Weather answers when</p><h3>Hourly conditions</h3></div><p><span className="best-key" /> Recommended window for {match.area.name}</p></div><div className="hourly-scroll" tabIndex={0} aria-label={`Hourly conditions for ${match.area.name}`}>{hours.map(hour => { const best = isInBestWindow(hour, match.bestWindows); return <div className={best ? "hour-cell best" : "hour-cell"} key={hour.time}><time>{hour.time.slice(11, 16)}</time>{best && <span className="best-label">Best</span>}<strong>{compactNumber(hour.temperatureC, "°")}</strong><small>Feels {compactNumber(hour.apparentTemperatureC, "°")}</small><span><Wind size={13} />{compactNumber(hour.windKmh, " km/h")}</span><span>Rain {compactNumber(hour.precipitationProbabilityPercent, "%")}</span></div>; })}</div><p className="timeline-note"><Info size={14} /> Whole-hour windows. The engine uses the worst required condition; it does not average away poor conditions.</p></section>;
}
function TracePanel({ trace, compact = false }: { trace: AgentView["trace"] | RecommendationView["trace"]; compact?: boolean }) { return <section className={compact ? "trace-panel compact" : "trace-panel"}><div className="trace-title"><ShieldCheck size={18} /><div><strong>How VAELORA reached this recommendation</strong><small>Factual action trace · no hidden reasoning</small></div></div><ol>{trace.map((item, index) => <li key={`${item.action}-${index}`}><span>{index + 1}</span><div><strong>{traceLabels[item.action] ?? item.action.replaceAll("-", " ")}</strong>{"count" in item && typeof item.count === "number" && <small>{item.count} {item.count === 1 ? "item" : "items"}</small>}</div></li>)}</ol></section>; }
function AgentAnswer({ answer, query }: { answer: AgentView; query: string }) {
  const title = answer.status === "answered" ? "Your outdoor plan" : answer.status === "clarification" ? "One detail before you go" : "VAELORA is temporarily unavailable";
  return <div className="agent-answer"><p className="agent-query"><span>Your request</span>{query}</p><strong>{title}</strong><p>{answer.text}</p>{answer.trace?.length > 0 && <TracePanel trace={answer.trace} compact />}</div>;
}
function LoadingState() { return <div className="state-card loading-state"><LoaderCircle className="spin" /><div><strong>Comparing Greater Amman</strong><p>Checking eligible places, live hourly weather, and best-time windows…</p></div><div className="loading-bars"><span /><span /><span /></div></div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="state-card error-state"><span className="state-icon"><X /></span><div><strong>We couldn’t check conditions</strong><p>{message}</p></div><button type="button" onClick={onRetry}><RefreshCw size={15} /> Adjust search</button></div>; }
function EmptyState({ status }: { status: RecommendationView["status"] }) { return <div className="state-card empty-state"><span className="state-icon"><MapPin /></span><div><strong>{status === "weather-unavailable" ? "Weather is temporarily unavailable" : "No supported match for these constraints"}</strong><p>{status === "weather-unavailable" ? "VAELORA will not guess without a valid forecast. Try again shortly." : "Try removing one optional preference or choosing a broader time window. No constraint was silently relaxed."}</p></div></div>; }
