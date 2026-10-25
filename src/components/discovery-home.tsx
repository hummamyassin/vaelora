"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Footprints,
  LocateFixed,
  Map as MapIcon,
  RefreshCw,
  Search,
} from "lucide-react";
import { activityAreas } from "../data/activity-areas";
import { weatherAreas } from "../data/weather-areas";
import { locationContext } from "../lib/dynamic-location";
import { rankNearby } from "../domain/recommendation/nearby";
import { distanceKm, type Coordinates } from "../lib/geography";
import {
  areaDescription,
  areaName,
  label,
  numberText,
  translator,
  type Locale,
} from "../lib/i18n";
import { homeCopy } from "../lib/copy/home";
import type { DiscoveryResponse } from "../server/recommendations/discovery";
import type { SearchPlace } from "../server/geocoding";
import type {
  ActivityKind,
  ConditionsSnapshot,
  RecordedActivity,
} from "../domain/tracking/activity";
import { LocationArt } from "./location-art";
import { PersonalProgress } from "./personal-progress";
import { Sheet } from "./app-dialog";
import { Meteogram } from "./meteogram";
import { planningState } from "../domain/recommendation/plan-state";
import {
  isRefreshDue,
  isWithinMaxAge,
  refreshMode,
} from "../lib/refresh-policy";
const ScoreMap = dynamic(() => import("./score-map").then((m) => m.ScoreMap), {
  ssr: false,
});
/** Current Home plan, shared read-only with Ask VAELORA. */
export interface PlanSummary {
  place: string;
  headline: string;
  window: { start: string; end: string } | null;
  score: number | null;
  hours: DiscoveryResponse["outlook"]["hours"];
}
export interface DiscoveryMapData {
  point: Coordinates;
  name: string;
  places: DiscoveryResponse["places"];
  activity: ActivityKind;
  selectedAreaId?: string;
}
const ammanClock = (locale: Locale) => (value: string) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", {
    timeZone: "Asia/Amman",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
const featuredIds = ["sports-city", "king-hussein-park", "national-gallery-park"];

export function DiscoveryMap({
  data,
  locale,
}: {
  data: DiscoveryMapData;
  locale: Locale;
}) {
  const c = translator(homeCopy, locale);
  const activity = data.activity;
  const [selected, setSelected] = useState(
    data.selectedAreaId ?? data.places[0]?.area.id ?? "",
  );
  const rows = data.places.map((p) => ({
    area: {
      ...p.area,
      name: { en: areaName("en", p.area), ar: areaName("ar", p.area) },
    },
    days: [
      {
        walking: { score: activity === "walking" ? p.score : null },
        running: { score: activity === "running" ? p.score : null },
      },
    ],
  }));
  const place = data.places.find((p) => p.area.id === selected);
  const clock = ammanClock(locale);
  return (
    <section className="map-screen" aria-labelledby="map-title">
      <h1 className="screen-title" id="map-title">
        {data.name === c("currentArea") ? c("mapTitleGps") : c("mapTitle", { name: data.name })}
      </h1>
      <div className="map-stage">
        <ScoreMap
          rows={rows}
          activity={activity}
          locale={locale}
          origin={data.point}
          selectedAreaId={selected}
          onSelect={setSelected}
        />
        <div className="map-legend" aria-label={c("viewMap")}>
          <span><i data-kind="selected" />{c("mapLegendSelected")}</span>
          <span><i data-kind="origin" />{c("mapLegendOrigin")}</span>
          <span><i data-kind="score" />{c("mapLegendScore")}</span>
          <span><i data-kind="cluster" />{c("mapLegendCluster")}</span>
        </div>
      </div>
      {!data.places.length && <p className="section-note">{c("mapEmpty")}</p>}
      {place && (
        <article className="map-card" aria-live="polite">
          <div className="map-card-head">
            <h2>{areaName(locale, place.area)}</h2>
            <span className="score-chip num" data-tone={place.score == null ? "unknown" : place.score >= 70 ? "good" : place.score >= 50 ? "fair" : "poor"}>
              {place.score ?? "–"}
            </span>
          </div>
          <p className="row-meta">
            {numberText(locale, distanceKm(data.point, place.area), 1)} {locale === "ar" ? "كم" : "km"} ·{" "}
            {place.plan.status === "now"
              ? c("goodNowShort")
              : place.plan.window
                ? c("bestAt", { time: clock(place.plan.window.start) })
                : c("noUsable")}
          </p>
          <p>{areaDescription(locale, place.area)}</p>
          <p className="row-meta">
            {label(locale, place.area.terrain)} · {place.area.surfaces.map((s) => label(locale, s)).join(" · ")}
          </p>
        </article>
      )}
      {data.places.length > 1 && (
        <div className="map-list" role="group" aria-label={c("featured")}>
          {data.places.map((p) => (
            <button
              key={p.area.id}
              className="chip"
              aria-pressed={selected === p.area.id}
              onClick={() => setSelected(p.area.id)}
            >
              {areaName(locale, p.area)} <bdi className="num">{p.score ?? "–"}</bdi>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function DiscoveryHome({
  locale,
  activity,
  setActivity,
  minutes,
  setMinutes,
  preferences,
  activities,
  onStart,
  onOpen,
  onMap,
  onSnapshot,
  active,
  onClear,
  onMapData,
  selectedPlace,
  onSelectPlace,
  onPlan,
}: {
  locale: Locale;
  activity: ActivityKind;
  setActivity: (v: ActivityKind) => void;
  minutes: number;
  setMinutes: (value: number) => void;
  preferences: string[];
  activities: RecordedActivity[];
  onStart: () => void;
  onOpen: (id: string) => void;
  onMap: (data: DiscoveryMapData) => void;
  onSnapshot: (snapshot: ConditionsSnapshot | null) => void;
  active: boolean;
  onClear: () => void;
  onMapData: (data: DiscoveryMapData | null) => void;
  selectedPlace: string | null;
  onSelectPlace: (id: string | null) => void;
  onPlan?: (plan: PlanSummary | null) => void;
}) {
  const ar = locale === "ar",
    c = translator(homeCopy, locale);
  const [point, setPoint] = useState<Coordinates | null>(null),
    [name, setName] = useState(""),
    [source, setSource] = useState<"gps" | "manual">("manual"),
    [geo, setGeo] = useState("idle"),
    [radius, setRadius] = useState(5);
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<SearchPlace[]>([]),
    [searchStatus, setSearchStatus] = useState(""),
    [searching, setSearching] = useState(false);
  const [data, setData] = useState<DiscoveryResponse | null>(null),
    [receivedAt, setReceivedAt] = useState<number | null>(null),
    [now, setNow] = useState(() => Date.now()),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false),
    [refreshFailed, setRefreshFailed] = useState(false),
    [refresh, setRefresh] = useState(0);
  const selected =
    selectedPlace && activityAreas.some((a) => a.id === selectedPlace)
      ? selectedPlace
      : null;
  const [placeData, setPlaceData] = useState<DiscoveryResponse | null>(null),
    [placeLoading, setPlaceLoading] = useState(false),
    [placeFailed, setPlaceFailed] = useState(false),
    [placeRetry, setPlaceRetry] = useState(0);
  // Request bookkeeping read by effects without re-triggering them.
  const lastKey = useRef(""),
    handledRefresh = useRef(0),
    lastCompletedAt = useRef<number | null>(null),
    receivedAtRef = useRef<number | null>(null);
  function clearData() {
    setData(null);
    setReceivedAt(null);
    setRefreshFailed(false);
    receivedAtRef.current = null;
  }
  const selectedCell = selected
    ? locationContext(activityAreas.find((a) => a.id === selected)!)?.cellId
    : null;
  useEffect(() => {
    if (!selectedCell) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      setPlaceData(null);
      setPlaceFailed(false);
      setPlaceLoading(true);
    });
    void fetch("/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cellId: selectedCell,
        activity,
        minutes,
        radius: 3,
        preferences,
      }),
      signal: controller.signal,
    })
      .then(async (r) => {
        const x = await r.json();
        if (!x.outlook) throw new Error();
        return x as DiscoveryResponse;
      })
      .then((x) => {
        if (!controller.signal.aborted) setPlaceData(x);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlaceFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPlaceLoading(false);
      });
    return () => controller.abort();
  }, [selectedCell, activity, minutes, preferences, placeRetry]);
  // Expired conditions are withdrawn at render time, even if no refresh succeeds.
  const live = data && isWithinMaxAge(receivedAt, now) ? data : null;
  useEffect(() => {
    onMapData(
      point
        ? {
            point,
            name,
            activity,
            places: live?.request.activity === activity ? live.places : [],
            selectedAreaId: selected ?? undefined,
          }
        : null,
    );
  }, [point, name, activity, live, selected, onMapData]);
  const cell = point ? locationContext(point)?.cellId : null,
    key = JSON.stringify({
      cellId: cell,
      activity,
      minutes,
      radius,
      preferences,
    });
  useEffect(() => {
    const current = live?.outlook.current;
    onSnapshot(
      cell && live && current
        ? {
            areaId: cell,
            areaName: ar ? "توقعات المنطقة المحددة" : "Selected area forecast",
            timestamp: Date.parse(live.evaluatedAt),
            temperatureC: current.conditions.temperatureC ?? null,
            windKmh: current.conditions.windKmh ?? null,
            score: current.score,
          }
        : null,
    );
  }, [cell, live, ar, onSnapshot]);
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      const at = Date.now();
      setNow(at);
      if (active && isRefreshDue(lastCompletedAt.current, at))
        setRefresh((n) => n + 1);
    };
    const timer = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active]);
  useEffect(() => {
    if (!cell || !active) return;
    const started = Date.now();
    const mode = refreshMode({
      sameRequest: lastKey.current === key,
      receivedAt: receivedAtRef.current,
      lastCompletedAt: lastCompletedAt.current,
      explicit: handledRefresh.current !== refresh,
      now: started,
    });
    if (mode === "skip") return;
    lastKey.current = key;
    const controller = new AbortController();
    queueMicrotask(() => {
      setBusy(mode === "foreground");
      setFailed(false);
      if (mode === "foreground") clearData();
    });
    // Bookkeeping is recorded on completion, so an aborted request is retried.
    const complete = () => {
      handledRefresh.current = refresh;
      lastCompletedAt.current = Date.now();
    };
    void fetch("/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: key,
      signal: controller.signal,
    })
      .then(async (r) => {
        const x = await r.json();
        if (!x.outlook) throw new Error();
        return x as DiscoveryResponse;
      })
      .then((x) => {
        if (controller.signal.aborted) return;
        complete();
        const at = Date.now();
        receivedAtRef.current = at;
        setData(x);
        setReceivedAt(at);
        setNow(at);
        setRefreshFailed(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        complete();
        // A failed background refresh keeps conditions only while they are fresh.
        if (
          mode === "background" &&
          isWithinMaxAge(receivedAtRef.current, Date.now())
        )
          setRefreshFailed(true);
        else {
          clearData();
          setFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [key, cell, refresh, active]);
  function choose(p: Coordinates, n: string, kind: "gps" | "manual") {
    if (!locationContext(p)) {
      setGeo("outside");
      setPoint(null);
      clearData();
      onSnapshot(null);
      return;
    }
    setPoint(p);
    setName(n);
    setSource(kind);
    setGeo("ready");
    setResults([]);
    setSearchStatus("");
    onSelectPlace(null);
    document.querySelector(".plan")?.scrollIntoView({ block: "start" });
  }
  function locate() {
    setGeo("locating");
    if (!navigator.geolocation) {
      setGeo("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!Number.isFinite(p.coords.accuracy) || p.coords.accuracy > 150) {
          setGeo("poor");
          return;
        }
        choose(
          { latitude: p.coords.latitude, longitude: p.coords.longitude },
          c("currentArea"),
          "gps",
        );
      },
      (e) =>
        setGeo(
          e.code === 1 ? "denied" : e.code === 3 ? "timeout" : "unavailable",
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  async function search() {
    setSearching(true);
    setSearchStatus("");
    setResults([]);
    try {
      const r = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, locale }),
      });
      if (!r.ok) throw new Error();
      const x = await r.json();
      setResults(x.places);
      if (!x.places.length) setSearchStatus(x.status === "outside" ? "outside" : "empty");
    } catch {
      setSearchStatus("error");
    } finally {
      setSearching(false);
    }
  }
  const nearby = rankNearby(live?.places ?? [], point).filter(
    (p) => point && distanceKm(point, p.area) <= radius,
  );
  const current = live?.outlook.current,
    plan = live?.plan;
  const planState = planningState({
    hasLocation: !!point,
    loading: busy,
    failed,
    status: plan?.status,
  });
  const best = nearby.find(
    (p) => p.plan.status === "now" || p.plan.status === "later",
  );
  const clock = ammanClock(locale);
  const headline = !point
    ? c("chooseArea")
    : busy
      ? c("checking")
      : planState === "weather-unavailable"
        ? c("unavailable")
        : plan?.status === "now"
          ? c("goodNow")
          : plan?.status === "later" && plan.window
            ? c("betterLater", { time: clock(plan.window.start) })
            : c("noWindow");
  const subline = !point
    ? c("chooseAreaSub")
    : busy
      ? null
      : planState === "weather-unavailable"
        ? c("unavailableSub")
        : planState === "no-window"
          ? c("noWindowSub", { n: minutes })
          : null;
  const planAction =
    planState === "recommended"
      ? plan?.status === "now"
        ? c(activity === "walking" ? "startWalk" : "startRun", { n: minutes })
        : c("trackLater")
      : planState === "weather-unavailable"
        ? c("trackNoWeather")
        : planState === "no-window"
          ? c("trackNoWindow")
          : planState === "location-unavailable"
            ? c("trackNoLocation")
            : c("trackDefault");
  const featured = activityAreas.filter((a) => featuredIds.includes(a.id));
  const detail = activityAreas.find((a) => a.id === selected);
  const detailWeather = placeData?.places.find((p) => p.area.id === selected);
  const geoCopy: Record<string, string> = {
    denied: c("geoDenied"),
    timeout: c("geoTimeout"),
    unavailable: c("geoUnavailable"),
    poor: c("geoPoor"),
    outside: c("geoOutside"),
  };
  const score = plan?.window?.score ?? current?.score ?? null;
  const scoreTone = score == null ? "unknown" : score >= 80 ? "good" : score >= 60 ? "fair" : "poor";
  const activityLabel = activity === "walking" ? c("walk") : c("run");
  const planWindow = plan?.window ?? null;
  useEffect(() => {
    onPlan?.(
      point && live && !busy
        ? { place: name, headline, window: planWindow, score, hours: live.outlook.hours }
        : null,
    );
  }, [onPlan, point, live, busy, name, headline, planWindow, score]);
  return (
    <div className="home">
      <section
        className="plan"
        aria-busy={busy}
        aria-labelledby="plan-headline"
        data-plan-state={planState}
      >
        <div className="plan-top">
          <span className="plan-place">{name || c("greaterAmman")}</span>
          {live && receivedAt !== null && (
            <span
              className="plan-updated"
              role={refreshFailed ? "status" : undefined}
              data-stale={refreshFailed || undefined}
            >
              {refreshFailed
                ? c("staleRefresh", { time: clock(new Date(receivedAt).toISOString()) })
                : c("updated", { time: clock(new Date(receivedAt).toISOString()) })}
            </span>
          )}
        </div>
        <div className="plan-controls">
          <div className="seg seg-band" role="group" aria-label={c("activity")}>
            {(["walking", "running"] as const).map((k) => (
              <button
                key={k}
                onClick={() => {
                  onSnapshot(null);
                  setActivity(k);
                }}
                aria-pressed={activity === k}
              >
                {k === "walking" ? <Footprints aria-hidden /> : <Activity aria-hidden />}
                {k === "walking" ? c("walk") : c("run")}
              </button>
            ))}
          </div>
          <div className="seg seg-band" role="group" aria-label={c("duration")}>
            {[30, 60, 90].map((value) => (
              <button
                key={value}
                aria-pressed={minutes === value}
                aria-label={c("minLong", { n: value })}
                onClick={() => {
                  onSnapshot(null);
                  setMinutes(value);
                }}
              >
                <span className="num">{value}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="plan-decision">
          <h2 className="plan-headline" id="plan-headline">
            {headline}
          </h2>
          {subline && <p className="plan-sub">{subline}</p>}
        </div>
        {point && !busy && (
          <div className="plan-figures">
            <div className="plan-window">
              <span className="plan-label">{c("window")}</span>
              {plan?.window ? (
                <strong className="plan-window-time num">
                  <bdi>
                    {clock(plan.window.start)}
                    <span className="plan-dash">-</span>
                    {clock(plan.window.end)}
                  </bdi>
                </strong>
              ) : (
                <strong className="plan-window-time plan-window-none">–</strong>
              )}
            </div>
            <div className="plan-score" data-tone={scoreTone}>
              <span className="plan-label">{c("score")}</span>
              <strong className="num">
                <bdi>{score ?? "–"}</bdi>
                <small>/100</small>
              </strong>
              <span className="plan-score-note">
                {plan?.window ? c("scoreWindow") : c("scoreNow")}
              </span>
            </div>
          </div>
        )}
        {busy && (
          <div className="plan-skeleton" role="status" aria-label={c("checking")}>
            <span className="skeleton skeleton-band" />
            <span className="skeleton skeleton-band skeleton-tall" />
          </div>
        )}
        {point && !busy && live && (
          <Meteogram
            hours={live.outlook.hours}
            window={plan?.window ?? null}
            locale={locale}
            activityLabel={activityLabel}
            clock={clock}
          />
        )}
        {current && !busy && (
          <p className="plan-weather">
            <span className="num">{current.conditions.temperatureC ?? "–"}°C</span>
            <span>
              {c("wind")} <bdi className="num">{c("kmh", { n: current.conditions.windKmh ?? "–" })}</bdi>
            </span>
            <span>
              {c("humidity")} <bdi className="num">{current.conditions.relativeHumidityPercent ?? "–"}%</bdi>
            </span>
          </p>
        )}
        {(failed || refreshFailed || (data && !live)) && point && (
          <button className="btn btn-band btn-sm plan-retry" onClick={() => setRefresh((n) => n + 1)}>
            <RefreshCw aria-hidden /> {c("retry")}
          </button>
        )}
        <button
          className="btn btn-lg btn-block plan-start"
          onClick={onStart}
          data-recommended={planState === "recommended" && plan?.status === "now"}
        >
          {planAction}
          <ArrowUpRight aria-hidden className="flip-rtl" />
        </button>
        <p className="plan-note">{c("startNote")}</p>
        {best && (
          <button className="plan-nearby" onClick={() => onSelectPlace(best.area.id)}>
            <span className="plan-label">{c("nearbyOption")}</span>
            <span className="plan-nearby-name">{areaName(locale, best.area)}</span>
            <span className="num">{c("kmApprox", { n: numberText(locale, distanceKm(point!, best.area), 1) })}</span>
            <ChevronRight aria-hidden className="flip-rtl" />
          </button>
        )}
      </section>

      <section className="section near" aria-labelledby="near-title">
        <div className="section-head">
          <h2 className="section-title" id="near-title">{c("nearYou")}</h2>
          <button className="btn btn-secondary btn-sm" onClick={locate} disabled={geo === "locating"}>
            <LocateFixed aria-hidden />
            {geo === "locating" ? c("locating") : c("useLocation")}
          </button>
        </div>
        <p className="section-note">{c("locationNote")}</p>
        {geoCopy[geo] && (
          <p role="status" className="notice" data-tone="caution">
            {geoCopy[geo]}
          </p>
        )}
        <form
          className="search-row near-search"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <label className="sr-only" htmlFor="discovery-query">
            {c("searchLabel")}
          </label>
          <input
            id="discovery-query"
            className="input"
            value={query}
            maxLength={100}
            minLength={2}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c("searchPlaceholder")}
            enterKeyHint="search"
          />
          <button className="btn btn-primary" disabled={searching || query.trim().length < 2}>
            <Search aria-hidden />
            <span className="sr-only">{c("search")}</span>
          </button>
        </form>
        <p className="fine">{c("searchNote")}</p>
        {results.length > 0 && (
          <div className="rows search-results">
            {results.map((p, i) => (
              <button className="row-btn" key={i} onClick={() => choose(p, p.name, "manual")}>
                <span className="row-main">
                  <span className="row-title">{p.name}</span>
                </span>
                <ChevronRight className="row-chevron flip-rtl" aria-hidden />
              </button>
            ))}
          </div>
        )}
        {searchStatus && (
          <p role="status" className="notice" data-tone={searchStatus === "error" ? "danger" : "caution"}>
            {searchStatus === "outside"
              ? c("searchOutside")
              : searchStatus === "empty"
                ? c("searchEmpty")
                : c("searchError")}
          </p>
        )}
        <details className="disclosure reference-picker">
          <summary>{c("orArea")}</summary>
          <div className="chips">
            {weatherAreas.map((a) => (
              <button
                key={a.id}
                className="chip"
                aria-pressed={point?.latitude === a.latitude && point?.longitude === a.longitude}
                onClick={() => choose(a, a.name[locale], "manual")}
              >
                {a.name[locale]}
              </button>
            ))}
          </div>
        </details>
        {point && (
          <div className="near-results">
            <div className="near-toolbar">
              <span className="near-origin">
                {source === "gps" ? c("fromGps") : c("fromArea", { name })}
              </span>
              <div className="near-actions">
                <label className="near-radius">
                  <span className="sr-only">{c("radius")}</span>
                  <select className="input" value={radius} onChange={(e) => setRadius(+e.target.value)}>
                    {[3, 5, 10].map((r) => (
                      <option key={r} value={r}>
                        {r} {ar ? "كم" : "km"}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    onMap({ point, name, activity, places: live?.places ?? [], selectedAreaId: selected ?? best?.area.id })
                  }
                >
                  <MapIcon aria-hidden />
                  {c("viewMap")}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setPoint(null);
                    setName("");
                    clearData();
                    setGeo("idle");
                    setBusy(false);
                    onSnapshot(null);
                    onClear();
                  }}
                >
                  {c("clear")}
                </button>
              </div>
            </div>
            <p className="fine">{c("areaFacts")}</p>
            {failed && <p className="notice" data-tone="danger">{c("conditionsFailed")}</p>}
            {busy ? (
              <div className="rows" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div className="row" key={i}>
                    <span className="skeleton skeleton-line" />
                  </div>
                ))}
              </div>
            ) : (
              nearby.length > 0 && (
                <ol className="rows nearby-list">
                  {nearby.slice(0, 4).map((p, i) => {
                    const tone = p.plan.status === "now" ? "good" : p.plan.window ? "fair" : "poor";
                    return (
                      <li key={p.area.id}>
                        <button className="row-btn nearby-card" onClick={() => onSelectPlace(p.area.id)}>
                          <span className="nearby-rank num">{i + 1}</span>
                          <span className="row-main">
                            <span className="row-title">{areaName(locale, p.area)}</span>
                            <span className="row-meta">
                              <bdi className="num">{c("kmApprox", { n: numberText(locale, distanceKm(point, p.area), 1) })}</bdi>
                              {" · "}
                              {p.area.verificationStatus === "verified" ? c("verified") : c("supported")}
                              {" · "}
                              {label(locale, p.fit)}
                            </span>
                            <span className="tag" data-tone={tone}>
                              {p.plan.status === "now"
                                ? c("goodNowShort")
                                : p.plan.window
                                  ? c("bestAt", { time: clock(p.plan.window.start) })
                                  : c("noUsable")}
                            </span>
                          </span>
                          <span className="row-end nearby-score">
                            <b className="num">{p.score ?? "–"}</b>
                            <small>{c("placeFit")}</small>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )
            )}
            {!busy && live && !nearby.length && <p className="empty-line">{c("noneInRadius")}</p>}
            <p className="fine">{c("rankNote")}</p>
          </div>
        )}
      </section>

      <section className="section featured" aria-labelledby="featured-title">
        <div className="section-head">
          <h2 className="section-title" id="featured-title">{c("featured")}</h2>
          <span className="section-note">{c("featuredNote")}</span>
        </div>
        <div className="featured-rail">
          {featured.map((a) => (
            <button className="featured-card" key={a.id} onClick={() => onSelectPlace(a.id)}>
              <LocationArt
                areaId={a.id}
                locale={locale}
                name={areaName(locale, a)}
                environment={a.environment}
              />
              <span className="featured-foot">
                <span>{label(locale, a.terrain)}</span>
                <span className="featured-open">
                  {c("openProfile")}
                  <ArrowUpRight aria-hidden className="flip-rtl" />
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <PersonalProgress activities={activities} locale={locale} onOpen={onOpen} />

      {detail && (
        <Sheet
          title={areaName(locale, detail)}
          close={() => onSelectPlace(null)}
          closeLabel={ar ? "إغلاق" : "Close"}
          className="place-sheet"
        >
          <LocationArt
            areaId={detail.id}
            locale={locale}
            name={areaName(locale, detail)}
            environment={detail.environment}
          />
          <p className="place-description">{areaDescription(locale, detail)}</p>
          <dl className="place-facts">
            <div>
              <dt>{c("terrain")}</dt>
              <dd>{label(locale, detail.terrain)}</dd>
            </div>
            <div>
              <dt>{c("surface")}</dt>
              <dd>{detail.surfaces.map((s) => label(locale, s)).join(" · ")}</dd>
            </div>
            <div>
              <dt>{c("walkingFit")}</dt>
              <dd>{label(locale, detail.suitability.walking)}</dd>
            </div>
            <div>
              <dt>{c("runningFit")}</dt>
              <dd>{label(locale, detail.suitability.running)}</dd>
            </div>
          </dl>
          <div className="place-conditions">
            {placeLoading ? (
              <p role="status" className="row-meta">{c("checkingPlace")}</p>
            ) : placeFailed ? (
              <p role="status" className="notice" data-tone="danger">
                {c("placeFailed")}{" "}
                <button className="btn btn-secondary btn-sm" onClick={() => setPlaceRetry((n) => n + 1)}>
                  {c("tryAgain")}
                </button>
              </p>
            ) : placeData?.outlook.current ? (
              <p>
                <span className="plan-label">{c("conditionsNow")}</span>
                <span className="place-now num">
                  <bdi>{placeData.outlook.current.score ?? "–"}/100</bdi> ·{" "}
                  <bdi>{placeData.outlook.current.conditions.temperatureC ?? "–"}°C</bdi> · {c("wind")}{" "}
                  <bdi>{c("kmh", { n: placeData.outlook.current.conditions.windKmh ?? "–" })}</bdi>
                </span>
              </p>
            ) : (
              <p className="row-meta">{c("placeNoCurrent")}</p>
            )}
            {detailWeather?.plan.window && (
              <p>
                <span className="plan-label">{c("bestWindow")}</span>
                <span className="place-now num">
                  <bdi>
                    {clock(detailWeather.plan.window.start)} - {clock(detailWeather.plan.window.end)}
                  </bdi>{" "}
                  · {detailWeather.score}/100
                </span>
              </p>
            )}
          </div>
          <p className="fine">{c("placeCaution")}</p>
          <button className="btn btn-primary btn-block" onClick={() => choose(detail, areaName(locale, detail), "manual")}>
            {c("planHere")}
          </button>
          <details className="disclosure">
            <summary>{c("evidence")}</summary>
            <div className="disclosure-body">
              {detail.evidence.map((e) => (
                <a key={e.url} href={e.url} target="_blank" rel="noreferrer">
                  {new URL(e.url).hostname}
                </a>
              ))}
            </div>
          </details>
        </Sheet>
      )}
    </div>
  );
}
