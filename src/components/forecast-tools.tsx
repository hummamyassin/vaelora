"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Columns2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Star,
} from "lucide-react";
import { scoreBand } from "../domain/recommendation/score";
import type { DashboardResponse } from "../server/recommendations/dashboard";
import type { WeatherArea } from "../data/weather-areas";
import { distanceKm, orderNearby, type Coordinates } from "../lib/geography";
import {
  areaDescription,
  areaName,
  label,
  numberText,
  translator,
  type Locale,
} from "../lib/i18n";
import { forecastCopy, toolsCopy } from "../lib/copy/tools";
import { LocationArt } from "./location-art";
const ActivityMap = dynamic(
  () => import("./amman-map").then((m) => m.ActivityMap),
  { ssr: false, loading: () => <div className="map-shell skeleton" /> },
);
type Tool = "compare" | "outlook" | "saved" | "map";
const tone = (s: number | null | undefined) =>
  s == null ? "unknown" : s >= 80 ? "good" : s >= 60 ? "fair" : "poor";
const sevTone = (s: number | null | undefined) =>
  s === 0 ? "good" : s === 1 ? "fair" : s === 2 ? "poor" : "unknown";

/**
 * Secondary planning: forecast-area outlook, hour detail with the scorer's
 * factors, top matches with map, and the compare / outlook / saved tools.
 */
export function ForecastTools({
  locale,
  area,
  result,
  loading,
  error,
  retry,
  activity,
  setActivity,
  day,
  setDay,
  minutes,
  origin,
  geo,
  radius,
  locate,
  clearOrigin,
  openArea,
  openTool,
}: {
  locale: Locale;
  area: WeatherArea;
  result: DashboardResponse | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
  activity: "walking" | "running";
  setActivity: (a: "walking" | "running") => void;
  day: "today" | "tomorrow";
  setDay: (d: "today" | "tomorrow") => void;
  minutes: number;
  origin: Coordinates | null;
  geo: string;
  radius: number;
  locate: () => void;
  clearOrigin: () => void;
  openArea: () => void;
  openTool: (tool: Tool) => void;
}) {
  const c = translator(forecastCopy, locale),
    ar = locale === "ar";
  const [hour, setHour] = useState<string | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [showMap, setShowMap] = useState(false);
  const outlook = result?.[activity],
    best = outlook?.bestWindow;
  const bestHour = best ? new Date(Date.parse(best.start) + 10800000).toISOString().slice(0, 13) : null;
  const displayed =
    outlook?.hours.find((h) => h.time === hour) ??
    (day === "tomorrow" && bestHour ? outlook?.hours.find((h) => h.time.slice(0, 13) === bestHour) : undefined) ??
    outlook?.hours[0];
  const score = day === "today" ? outlook?.current?.score : best?.score;
  const matches = orderNearby(result?.topMatches ?? [], origin).filter(
    (m) => !origin || distanceKm(origin, m.area) <= radius,
  );
  const match = matches.find((m) => m.area.id === selected) ?? matches[0];
  const clock = (date: string) =>
    new Intl.DateTimeFormat(ar ? "ar-JO-u-nu-latn" : "en-GB", {
      timeZone: "Asia/Amman",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(date));
  const metricLabel: Record<string, string> = {
    temperatureC: c("temperature"),
    apparentTemperatureC: c("feels"),
    relativeHumidityPercent: c("humidity"),
    windKmh: c("wind"),
    precipitationProbabilityPercent: c("rain"),
    uvIndex: c("uv"),
  };
  const weatherDown = error || result?.status === "weather-unavailable";
  const t = translator(toolsCopy, locale);
  const tools: [Tool, string, typeof Columns2][] = [
    ["compare", t("compare"), Columns2],
    ["outlook", t("outlook"), CalendarDays],
    ["saved", t("saved"), Star],
    ["map", t("map"), MapIcon],
  ];
  return (
    <details className="forecast-tools section">
      <summary className="forecast-summary">
        <span>
          <span className="section-title">{c("tools")}</span>
          <span className="section-note">{c("toolsNote")}</span>
        </span>
        <ChevronDown aria-hidden className="forecast-chevron" />
      </summary>
      <div className="forecast-body">
        <nav className="tool-links" aria-label={c("tools")}>
          {tools.map(([id, name, Icon]) => (
            <button key={id} className="tool-link" onClick={() => openTool(id)}>
              <Icon aria-hidden />
              {name}
              <ArrowUpRight aria-hidden className="flip-rtl tool-link-arrow" />
            </button>
          ))}
        </nav>
        <div className="forecast-controls">
          <button className="area-control" onClick={openArea}>
            <MapPin aria-hidden />
            <span>
              <small>{geo === "located" ? c("areaNearest") : c("areaYours")}</small>
              <strong>{area.name[locale]}</strong>
            </span>
            <ChevronDown aria-hidden />
          </button>
          <div className="seg" role="group" aria-label={c("today")}>
            {(["today", "tomorrow"] as const).map((d) => (
              <button key={d} aria-pressed={day === d} onClick={() => setDay(d)}>
                {d === "today" ? c("today") : c("tomorrow")}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="activity">
            {(["walking", "running"] as const).map((a) => (
              <button key={a} aria-pressed={activity === a} data-activity={a} onClick={() => setActivity(a)}>
                {label(locale, a)}
                <span className="num seg-score">
                  {loading ? "–" : ((day === "today" ? result?.[a].current?.score : result?.[a].bestWindow?.score) ?? "–")}
                </span>
              </button>
            ))}
          </div>
          {origin && (
            <button className="btn btn-ghost btn-sm" onClick={clearOrigin}>
              {c("clearLocation")}
            </button>
          )}
        </div>
        {(geo === "denied" || geo === "outside") && (
          <p role="status" className="notice" data-tone="caution">
            {geo === "denied" ? c("denied") : c("outside")}
          </p>
        )}
        <div className="forecast-overview" aria-busy={loading}>
          <div className="overview-score" data-tone={tone(loading ? null : score)}>
            <span className="row-meta">{day === "today" ? c("thisHour") : c("bestWindow")}</span>
            <strong className="num">
              {loading ? "–" : (score ?? "–")}
              <small>/100</small>
            </strong>
            <span className="overview-band">
              {loading ? c("checking") : score == null ? c("unavailable") : scoreBand(score)[locale]}
            </span>
            <span className="row-meta">
              {c("forActivity", { activity: label(locale, activity), area: area.name[locale] })}
            </span>
          </div>
          <div className="overview-window">
            <span className="row-meta">{c("bestWindow")}</span>
            <strong className="num">
              {loading ? "–" : best ? (
                <bdi>
                  {clock(best.start)} - {clock(best.end)}
                </bdi>
              ) : (
                c("noWindow")
              )}
            </strong>
            <span className="row-meta">
              {best
                ? c("minutesToMove", { n: minutes, band: scoreBand(best.score)[locale] })
                : c("needWindow")}
            </span>
            <button className="btn btn-secondary btn-sm" disabled={geo === "locating"} onClick={locate}>
              <LocateFixed aria-hidden />
              {geo === "locating" ? c("locating") : c("nearMe")}
            </button>
          </div>
        </div>
        {weatherDown && (
          <div className="notice" data-tone="danger" role="alert">
            <p>{c("weatherDown")}</p>
            <button className="btn btn-secondary btn-sm" onClick={retry}>
              {c("tryAgain")}
            </button>
          </div>
        )}
        <section className="hour-detail" aria-labelledby="hours-title">
          <h3 className="mini-title" id="hours-title">{c("hourly")}</h3>
          {loading ? (
            <p role="status" className="row-meta">{c("reading")}</p>
          ) : (
            <div className="hour-strip" role="group" aria-label={c("hourlyLabel")}>
              {outlook?.hours.map((h) => {
                const isBest = !!bestHour && h.time.slice(0, 13) === bestHour;
                return (
                  <button
                    key={h.time}
                    className="hour-chip"
                    data-tone={sevTone(h.severity)}
                    data-best={isBest || undefined}
                    aria-pressed={displayed?.time === h.time}
                    aria-label={`${clock(`${h.time}:00+03:00`)} · ${h.score ?? c("na")} / 100${isBest ? ` · ${c("bestHour")}` : ""}`}
                    onClick={() => setHour(h.time)}
                  >
                    <span className="hour-chip-score num">{h.score ?? "–"}</span>
                    <span className="hour-chip-bar" style={{ height: `${Math.max(12, h.score ?? 12)}%` }} />
                    <time className="num">{clock(`${h.time}:00+03:00`)}</time>
                  </button>
                );
              })}
            </div>
          )}
          {displayed && (
            <dl className="hour-metrics">
              {(["temperatureC", "windKmh", "relativeHumidityPercent", "precipitationProbabilityPercent"] as const).map((k) => (
                <div key={k}>
                  <dt>{metricLabel[k]}</dt>
                  <dd className="num">
                    {displayed.conditions[k] ?? "–"}
                    {k === "temperatureC" ? "°" : k === "windKmh" ? (ar ? " كم/س" : " km/h") : "%"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <details className="disclosure">
            <summary>{c("why")}</summary>
            <div className="disclosure-body">
              <p>{c("whyBody")}</p>
              <dl className="factor-list">
                {displayed?.factors.map((f) => (
                  <div key={f.metric} data-tone={sevTone(f.severity)}>
                    <dt>{metricLabel[f.metric]}</dt>
                    <dd>
                      {f.severity === null
                        ? c("na")
                        : f.severity === 0
                          ? c("preferred")
                          : f.severity === 1
                            ? c("acceptable")
                            : c("unfavorable")}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="fine">{c("resolution")}</p>
            </div>
          </details>
        </section>
        <section className="matches" aria-labelledby="matches-title">
          <div className="section-head">
            <h3 className="mini-title" id="matches-title">{c("matches")}</h3>
            <span className="section-note">
              {origin ? c("withinYou", { n: radius }) : c("withinArea")}
            </span>
          </div>
          {loading ? (
            <span className="skeleton skeleton-card" role="status" aria-label={c("finding")} />
          ) : !match ? (
            <div className="empty">
              <MapPin aria-hidden />
              <h3>
                {weatherDown
                  ? c("waiting")
                  : result?.placeWeatherFailures
                    ? c("partial")
                    : result?.coverageCount === 0
                      ? c("noCoverage")
                      : c("noMatch")}
              </h3>
              <p>
                {weatherDown
                  ? c("waitingBody")
                  : result?.placeWeatherFailures
                    ? c("partialBody")
                    : result?.coverageCount === 0
                      ? c("noCoverageBody")
                      : c("noMatchBody")}
              </p>
            </div>
          ) : (
            <div className="match-layout">
              <article className="top-match">
                <LocationArt
                  key={match.area.id}
                  areaId={match.area.id}
                  locale={locale}
                  name={areaName(locale, match.area)}
                  environment={match.area.environment}
                />
                <div className="top-match-body">
                  <div className="top-match-head">
                    <div>
                      <span className="row-meta">
                        {label(locale, match.area.verificationStatus)} · {label(locale, activity)}
                      </span>
                      <h4 className="top-match-name">{areaName(locale, match.area)}</h4>
                    </div>
                    <span className="score-chip num" data-tone={tone(match.score)} aria-label={`${c("placeFit")} ${match.score}`}>
                      {match.score}
                    </span>
                  </div>
                  <p className="row-meta num">
                    <bdi>
                      {match.bestWindows[0].start.slice(11)} - {match.bestWindows[0].end.slice(11)}
                    </bdi>
                    {origin && <> · {c("kmAway", { n: numberText(locale, distanceKm(origin, match.area), 1) })}</>}
                  </p>
                  <details className="disclosure">
                    <summary>{c("whyFits")}</summary>
                    <div className="disclosure-body">
                      <p>{areaDescription(locale, match.area)}</p>
                      <p>
                        {label(locale, match.fit)} · {label(locale, match.area.terrain)} ·{" "}
                        {match.area.surfaces.map((s) => label(locale, s)).join(" · ")}
                      </p>
                      <p className="fine">{c("placeScoreNote")}</p>
                      <p>
                        {match.area.evidence.map((e, i) => (
                          <a key={e.url} href={e.url} target="_blank" rel="noreferrer" className="evidence-link">
                            {c("evidence", { n: i + 1 })}
                          </a>
                        ))}
                      </p>
                    </div>
                  </details>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowMap((x) => !x)}>
                    <MapIcon aria-hidden />
                    {showMap ? c("hideMap") : c("showMap")}
                  </button>
                </div>
              </article>
              {matches.length > 1 && (
                <div className="rows other-matches">
                  {matches.map((m) => (
                    <button
                      key={m.area.id}
                      className="row-btn"
                      aria-pressed={m.area.id === match.area.id}
                      onClick={() => setSelected(m.area.id)}
                    >
                      <span className="row-main">
                        <span className="row-title">{areaName(locale, m.area)}</span>
                        <span className="row-meta">
                          {label(locale, m.fit)}
                          {origin ? ` · ${c("kmAway", { n: numberText(locale, distanceKm(origin, m.area), 1) })}` : ""}
                        </span>
                      </span>
                      <span className="score-chip num" data-tone={tone(m.score)}>
                        {m.score}
                      </span>
                    </button>
                  ))}
                  <p className="fine">{c("tiesNote")}</p>
                </div>
              )}
              {showMap && (
                <div className="match-map">
                  <ActivityMap matches={matches} selectedAreaId={match.area.id} locale={locale} onSelect={setSelected} />
                </div>
              )}
            </div>
          )}
        </section>
        <footer className="forecast-footer">
          <p className="fine">{c("access")}</p>
          <details className="disclosure">
            <summary>{c("sources")}</summary>
            <div className="disclosure-body">
              <p>{c("reference", { area: area.name[locale] })}</p>
              <p>
                {area.sources.map((source) => (
                  <a key={source} href={source} target="_blank" rel="noreferrer" className="evidence-link">
                    {new URL(source).hostname}
                  </a>
                ))}
              </p>
              <p className="fine">{c("sourcesBody")}</p>
            </div>
          </details>
        </footer>
      </div>
    </details>
  );
}
