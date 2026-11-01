"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  IconHumidity,
  IconLocate,
  IconMap,
  IconNext,
  IconOpen,
  IconPin,
  IconRetry,
  IconRun,
  IconSearch,
  IconTemperature,
  IconWalk,
  IconWind,
} from "./icons";
import { outdoorPlaces, placeById } from "../data/outdoor-places";
import { featuredNear } from "../domain/discovery/library";
import { weatherAreas } from "../data/weather-areas";
import { IconBookmark, IconExplore } from "./icons";
import { locationContext } from "../lib/dynamic-location";
import { parsePlanPlace, planPlaceFor, planPlaceKey } from "../lib/plan-place";
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
import { Meteogram } from "./meteogram";
import { ScoreRing, scoreTone as toneOf } from "./score-ring";
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
            <ScoreRing score={place.score} label={`${c("placeFit")} ${place.score ?? "–"}`} />
            <div className="map-card-title">
              <h2>{areaName(locale, place.area)}</h2>
              <p className="row-meta">
            {numberText(locale, distanceKm(data.point, place.area), 1)} {locale === "ar" ? "كم" : "km"} ·{" "}
            {place.plan.status === "now"
              ? c("goodNowShort")
              : place.plan.window
                ? c("bestAt", { time: clock(place.plan.window.start) })
                : c("noUsable")}
              </p>
            </div>
          </div>
          <p>{areaDescription(locale, place.area)}</p>
          {place.area.terrain !== "unknown" && (
            <p className="row-meta">
              {label(locale, place.area.terrain)}
              {!place.area.surfaces.includes("unknown") && <> · {place.area.surfaces.map((s) => label(locale, s)).join(" · ")}</>}
            </p>
          )}
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
              <span className="map-chip-dot" data-tone={toneOf(p.score)} aria-hidden="true" />
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
  onExplore,
  savedIds = [],
  planAt = null,
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
  onExplore?: () => void;
  savedIds?: string[];
  /** A request from a place sheet to plan around that place. */
  planAt?: { latitude: number; longitude: number; name: string; nonce: number } | null;
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
  const selected = selectedPlace && placeById(selectedPlace) ? selectedPlace : null;
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
  // A returning visit opens on the last place Home planned from.
  useEffect(() => {
    let saved = null;
    try {
      saved = parsePlanPlace(JSON.parse(localStorage.getItem(planPlaceKey) ?? "null"));
    } catch {
      /* Ignore unreadable storage. */
    }
    if (!saved) return;
    const place = saved;
    queueMicrotask(() => {
      setPoint({ latitude: place.latitude, longitude: place.longitude });
      setName(place.kind === "gps" ? c("lastArea") : place.name);
      setSource("manual");
      setGeo("ready");
    });
    // Restore once on mount; later choices overwrite the stored place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    try {
      const place = planPlaceFor(p, n, kind === "gps" ? "gps" : "area");
      if (place) localStorage.setItem(planPlaceKey, JSON.stringify(place));
    } catch {
      /* Remembering the place is optional. */
    }
    setGeo("ready");
    setResults([]);
    setSearchStatus("");
    onSelectPlace(null);
    document.querySelector(".plan")?.scrollIntoView({ block: "start" });
  }
  // A place sheet's "Plan here" arrives as a one-shot request.
  const handledPlanAt = useRef(0);
  useEffect(() => {
    if (!planAt || planAt.nonce === handledPlanAt.current) return;
    handledPlanAt.current = planAt.nonce;
    queueMicrotask(() => choose(planAt, planAt.name, "manual"));
    // choose() reads current state; the request itself is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planAt]);
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
    plan = live?.plan,
    tomorrow = live?.tomorrow ?? null;
  const planState = planningState({
    hasLocation: !!point,
    loading: busy,
    failed,
    // Today has run out of hours but tomorrow is known: that is "no window", not missing weather.
    status: tomorrow && plan?.status === "insufficient" ? "poor" : plan?.status,
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
            : tomorrow
              ? c("tomorrowBest", { time: clock(tomorrow.window.start) })
              : c("noWindow");
  const subline = !point
    ? c("chooseAreaSub")
    : busy
      ? null
      : planState === "weather-unavailable"
        ? c("unavailableSub")
        : planState === "no-window"
          ? tomorrow
            ? c("tomorrowSub", { n: minutes })
            : c("noWindowSub", { n: minutes })
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
  // Featured follows where the user is planning; never a fixed Amman list.
  const featured = featuredNear(outdoorPlaces, point, activity);
  const saved = savedIds.map((id) => placeById(id)).filter((p) => p !== null).slice(0, 3);
  const geoCopy: Record<string, string> = {
    denied: c("geoDenied"),
    timeout: c("geoTimeout"),
    unavailable: c("geoUnavailable"),
    poor: c("geoPoor"),
    outside: c("geoOutside"),
  };
  const shownWindow = plan?.window ?? tomorrow?.window ?? null;
  const score = plan?.window?.score ?? tomorrow?.window.score ?? current?.score ?? null;
  const scoreTone = toneOf(score);
  const activityLabel = activity === "walking" ? c("walk") : c("run");
  const planWindow = shownWindow;
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
          <span className="plan-place">
            <IconPin aria-hidden weight="fill" />
            {name || c("jordan")}
          </span>
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
                data-activity={k}
              >
                {k === "walking" ? <IconWalk aria-hidden weight="bold" /> : <IconRun aria-hidden weight="bold" />}
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
        <div className="plan-hero" data-ready={(point && !busy) || undefined}>
          {point && !busy && (
            <div className="plan-score" data-tone={scoreTone}>
              <ScoreRing size="lg" max score={score} label={c("scoreMeter", { n: score ?? "–" })} />
              <span className="plan-score-note">
                {c("score")}
                <br />
                {plan?.window ? c("scoreWindow") : tomorrow ? c("scoreTomorrow") : c("scoreNow")}
              </span>
            </div>
          )}
          <div className="plan-decision">
            <h2 className="plan-headline" id="plan-headline">
              {headline}
            </h2>
            {subline && <p className="plan-sub">{subline}</p>}
            {point && !busy && (
              <p className="plan-window" data-day={!plan?.window && tomorrow ? "tomorrow" : undefined}>
                <span className="plan-label">{!plan?.window && tomorrow ? c("tomorrowWindow") : c("window")}</span>
                {shownWindow ? (
                  <strong className="plan-window-time num">
                    <bdi>
                      {clock(shownWindow.start)}
                      <span className="plan-dash">–</span>
                      {clock(shownWindow.end)}
                    </bdi>
                  </strong>
                ) : (
                  <strong className="plan-window-time plan-window-none">–</strong>
                )}
              </p>
            )}
            {current && !busy && (
              <p className="plan-weather">
                <span>
                  <IconTemperature aria-hidden />
                  <bdi className="num">{current.conditions.temperatureC ?? "–"}°C</bdi>
                </span>
                <span>
                  <IconWind aria-hidden />
                  <span className="sr-only">{c("wind")}</span>
                  <bdi className="num">{c("kmh", { n: current.conditions.windKmh ?? "–" })}</bdi>
                </span>
                <span>
                  <IconHumidity aria-hidden />
                  <span className="sr-only">{c("humidity")}</span>
                  <bdi className="num">{current.conditions.relativeHumidityPercent ?? "–"}%</bdi>
                </span>
              </p>
            )}
          </div>
        </div>
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
        {(failed || refreshFailed || (data && !live)) && point && (
          <button className="btn btn-band btn-sm plan-retry" onClick={() => setRefresh((n) => n + 1)}>
            <IconRetry aria-hidden /> {c("retry")}
          </button>
        )}
        <button
          className="btn btn-lg btn-block plan-start"
          onClick={onStart}
          data-recommended={planState === "recommended" && plan?.status === "now"}
        >
          {activity === "walking" ? <IconWalk aria-hidden weight="bold" /> : <IconRun aria-hidden weight="bold" />}
          {planAction}
        </button>
        <p className="plan-note">{c("startNote")}</p>
        {best && (
          <button className="plan-nearby" onClick={() => onSelectPlace(best.area.id)}>
            <ScoreRing size="sm" score={best.score} label={`${c("placeFit")} ${best.score ?? "–"}`} />
            <span className="plan-nearby-text">
              <span className="plan-label">{c("nearbyOption")}</span>
              <span className="plan-nearby-name">{areaName(locale, best.area)}</span>
            </span>
            <span className="num plan-nearby-distance">
              {c("kmApprox", { n: numberText(locale, distanceKm(point!, best.area), 1) })}
            </span>
            <IconNext aria-hidden className="flip-rtl" />
          </button>
        )}
      </section>

      <section className="section near" aria-labelledby="near-title">
        <div className="section-head">
          <h2 className="section-title" id="near-title">{c("nearYou")}</h2>
          <button className="btn btn-secondary btn-sm" onClick={locate} disabled={geo === "locating"}>
            <IconLocate aria-hidden />
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
          <IconSearch aria-hidden className="search-icon" />
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
          <button className="btn btn-secondary search-go" disabled={searching || query.trim().length < 2}>
            <IconOpen aria-hidden className="flip-rtl" />
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
                <IconNext className="row-chevron flip-rtl" aria-hidden />
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
                {source === "gps" ? c("fromGps") : name === c("lastArea") ? c("fromLast") : c("fromArea", { name })}
              </span>
              <div className="near-actions">
                <label className="near-radius">
                  <span className="sr-only">{c("radius")}</span>
                  <select className="input" value={radius} onChange={(e) => setRadius(+e.target.value)}>
                    {[3, 5, 10, 25, 50].map((r) => (
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
                  <IconMap aria-hidden />
                  {c("viewMap")}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    try {
                      localStorage.removeItem(planPlaceKey);
                    } catch {
                      /* Optional storage. */
                    }
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
                          <ScoreRing
                            size="sm"
                            score={p.score}
                            label={`${i + 1}. ${c("placeFit")} ${p.score ?? "–"}`}
                          />
                          <span className="row-main">
                            <span className="row-title">{areaName(locale, p.area)}</span>
                            <span className="row-meta">
                              <bdi className="num">{c("kmApprox", { n: numberText(locale, distanceKm(point, p.area), 1) })}</bdi>
                              {" · "}
                              {placeById(p.area.id)?.tier === "open-data"
                                ? c("openData")
                                : p.area.verificationStatus === "verified"
                                  ? c("verified")
                                  : c("supported")}
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
                          <IconNext className="row-chevron flip-rtl" aria-hidden />
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

      {saved.length > 0 && (
        <section className="section saved-places" aria-labelledby="saved-title">
          <div className="section-head">
            <h2 className="section-title" id="saved-title">
              {c("savedPlaces")}
            </h2>
          </div>
          <ul className="rows">
            {saved.map((place) => {
              const row = live?.places.find((x) => x.area.id === place.id);
              return (
                <li key={place.id}>
                  <button className="row-btn" onClick={() => onSelectPlace(place.id)}>
                    <IconBookmark aria-hidden weight="fill" className="row-icon" />
                    <span className="row-main">
                      <span className="row-title">{areaName(locale, place)}</span>
                      <span className="row-meta">
                        {ar ? place.locality.ar : place.locality.en}
                        {point && <> · <bdi className="num">{c("kmApprox", { n: numberText(locale, distanceKm(point, place), 0) })}</bdi></>}
                      </span>
                      {row && (row.plan.status === "now" || row.plan.status === "later") && (
                        <span className="tag" data-tone="good">
                          {c("savedGood")}
                        </span>
                      )}
                    </span>
                    <IconNext className="row-chevron flip-rtl" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="section featured" aria-labelledby="featured-title">
        <div className="section-head">
          <h2 className="section-title" id="featured-title">{c("featured")}</h2>
          {featured.length > 0 && <span className="section-note">{c("featuredNote")}</span>}
        </div>
        {featured.length > 0 ? (
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
                  <span className="num">{point && c("kmApprox", { n: numberText(locale, distanceKm(point, a), 0) })}</span>
                  <span className="featured-open">
                    {c("openProfile")}
                    <IconOpen aria-hidden className="flip-rtl" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-line">{point ? c("featuredNone") : c("featuredChoose")}</p>
        )}
        {onExplore && (
          <button className="btn btn-secondary btn-sm featured-explore" onClick={onExplore}>
            <IconExplore aria-hidden />
            {c("exploreAll")}
          </button>
        )}
      </section>

      <PersonalProgress activities={activities} locale={locale} onOpen={onOpen} />

    </div>
  );
}
