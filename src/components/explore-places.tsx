"use client";
import { useEffect, useMemo, useState } from "react";
import { IconBookmark, IconLocate, IconNext, IconPlay, IconRun, IconWalk } from "./icons";
import { ScoreRing } from "./score-ring";
import { durationText } from "./place-sheet";
import { outdoorPlaces, estimatedMinutes, outingKm, routeDifficulty, routeSummary } from "../data/outdoor-places";
import { activeFilterCount, defaultFilters, filterLibrary, nearestBeyond, sortLibrary, type LibraryFilters } from "../domain/discovery/library";
import { rankNearby } from "../domain/recommendation/nearby";
import { locationContext } from "../lib/dynamic-location";
import { distanceKm, type Coordinates } from "../lib/geography";
import { governorates, isInsideJordan } from "../lib/jordan";
import { areaName, numberText, translator, type Locale } from "../lib/i18n";
import { exploreCopy } from "../lib/copy/explore";
import type { DiscoveryResponse } from "../server/recommendations/discovery";
import type { ActivityKind } from "../domain/tracking/activity";
import type { OutdoorPlace } from "../domain/outdoor-place";

const NEAR_RADIUS = 50;
const clockFor = (locale: Locale) => (value: string) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", {
    timeZone: "Asia/Amman",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

/** Explore: Near Me Now, then the whole curated library with simple filters. */
export function ExplorePlaces({
  locale,
  activity,
  setActivity,
  homeOrigin,
  savedIds,
  completedIds,
  onOpenPlace,
  onPlanWeather,
  onStartFree,
}: {
  locale: Locale;
  activity: ActivityKind;
  setActivity: (a: ActivityKind) => void;
  /** The area Home is planning for, when there is one. */
  homeOrigin: { point: Coordinates; name: string } | null;
  savedIds: string[];
  completedIds: string[];
  onOpenPlace: (id: string) => void;
  onPlanWeather: () => void;
  onStartFree: () => void;
}) {
  const e = translator(exploreCopy, locale);
  const clock = clockFor(locale);
  const ar = locale === "ar";
  const [gps, setGps] = useState<Coordinates | null>(null),
    [geo, setGeo] = useState<"idle" | "locating" | "outside" | "failed">("idle"),
    [near, setNear] = useState<DiscoveryResponse | null>(null),
    [nearLoading, setNearLoading] = useState(false),
    [nearFailed, setNearFailed] = useState(false);
  const [filters, setFilters] = useState<LibraryFilters>({ ...defaultFilters, activity });
  const f = useMemo(() => ({ ...filters, activity }), [filters, activity]);
  const origin = gps ?? homeOrigin?.point ?? null;
  const originLabel = gps ? e("fromGps") : homeOrigin ? e("fromHome", { name: homeOrigin.name }) : null;
  const cell = origin ? locationContext(origin)?.cellId ?? null : null;

  useEffect(() => {
    if (!cell) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      setNearLoading(true);
      setNearFailed(false);
    });
    void fetch("/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cellId: cell, activity, minutes: 60, radius: NEAR_RADIUS, preferences: [] }),
      signal: controller.signal,
    })
      .then(async (r) => {
        const x = await r.json();
        if (!x.outlook) throw new Error();
        if (!controller.signal.aborted) setNear(x as DiscoveryResponse);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setNear(null);
          setNearFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setNearLoading(false);
      });
    return () => controller.abort();
  }, [cell, activity]);

  function locate() {
    setGeo("locating");
    if (!navigator.geolocation) return setGeo("failed");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const point = { latitude: p.coords.latitude, longitude: p.coords.longitude };
        // Outside Jordan nothing is substituted: say so plainly.
        if (!isInsideJordan(point)) {
          setGps(null);
          setGeo("outside");
          return;
        }
        setGps(point);
        setGeo("idle");
      },
      () => setGeo("failed"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  const nearRows = useMemo(
    () => (near && origin ? rankNearby(near.places, origin).slice(0, 5) : []),
    [near, origin],
  );
  const library = useMemo(() => sortLibrary(filterLibrary(outdoorPlaces, f, savedIds), origin), [f, savedIds, origin]);
  const nearest = origin && !nearRows.length ? nearestBeyond(outdoorPlaces, origin, activity) : null;
  const count = activeFilterCount(f);
  const set = (patch: Partial<LibraryFilters>) => setFilters((old) => ({ ...old, ...patch }));

  const routeLine = (p: OutdoorPlace) => {
    const s = routeSummary(p);
    if (!s) return null;
    return `${numberText(locale, outingKm(p, s), 1)} ${ar ? "كم" : "km"} · ${e(routeDifficulty(s))} · ${e("approx", {
      time: durationText(locale, estimatedMinutes(p, s, "walking")).replace(/^≈\s*/, ""),
    })}`;
  };
  const marks = (p: OutdoorPlace) => (
    <>
      {savedIds.includes(p.id) && (
        <span className="tag" data-tone="good">
          <IconBookmark aria-hidden weight="fill" /> {e("saved")}
        </span>
      )}
      {completedIds.includes(p.id) && <span className="tag">{e("completed")}</span>}
    </>
  );

  return (
    <section className="explore" aria-labelledby="explore-title">
      <header className="screen-head">
        <h1 className="screen-title" id="explore-title">
          {e("title")}
        </h1>
      </header>
      <p className="section-note">{e("intro")}</p>

      <div className="seg seg-band explore-activity" role="group" aria-label={e("walk") + " / " + e("run")}>
        {(["walking", "running"] as const).map((k) => (
          <button key={k} aria-pressed={activity === k} data-activity={k} onClick={() => setActivity(k)}>
            {k === "walking" ? <IconWalk aria-hidden weight="bold" /> : <IconRun aria-hidden weight="bold" />}
            {k === "walking" ? e("walk") : e("run")}
          </button>
        ))}
      </div>

      <section className="section explore-near" aria-labelledby="near-now-title" aria-busy={nearLoading}>
        <div className="section-head">
          <h2 className="section-title" id="near-now-title">
            {e("nearNow")}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={locate} disabled={geo === "locating"}>
            <IconLocate aria-hidden />
            {geo === "locating" ? e("locating") : e("useLocation")}
          </button>
        </div>
        {originLabel && <p className="near-origin">{originLabel}</p>}
        {geo === "outside" && (
          <p role="status" className="notice" data-tone="caution">
            {e("outside")}
          </p>
        )}
        {geo === "failed" && (
          <p role="status" className="notice" data-tone="caution">
            {e("geoFailed")}
          </p>
        )}
        {origin && nearLoading && (
          <p role="status" className="row-meta">
            {e("checking")}
          </p>
        )}
        {origin && nearFailed && (
          <p role="status" className="notice" data-tone="danger">
            {e("conditionsFailed")}
          </p>
        )}
        {origin && !nearLoading && nearRows.length > 0 && (
          <ol className="rows near-now-list">
            {nearRows.map((r) => {
              const place = outdoorPlaces.find((p) => p.id === r.area.id)!;
              const status =
                r.plan.status === "now" && r.plan.window
                  ? e("goodUntil", { time: clock(r.plan.window.end) })
                  : r.plan.window
                    ? e("bestAt", { time: clock(r.plan.window.start) })
                    : e("noWindow");
              return (
                <li key={r.area.id}>
                  <button className="row-btn nearby-card" onClick={() => onOpenPlace(r.area.id)}>
                    <ScoreRing size="sm" score={r.score} label={e("scoreShort", { n: r.score ?? "–" })} />
                    <span className="row-main">
                      <span className="row-title">{areaName(locale, place)}</span>
                      <span className="row-meta num">
                        <bdi>{e("kmAway", { km: numberText(locale, distanceKm(origin, place), 1) })}</bdi>
                        {" · "}
                        {place.kind === "trail" ? e("trail") : e("place")}
                        {routeLine(place) && <> · <bdi>{routeLine(place)}</bdi></>}
                      </span>
                      <span className="tag" data-tone={r.plan.status === "now" ? "good" : r.plan.window ? "fair" : "poor"}>
                        {status}
                      </span>
                    </span>
                    <IconNext className="row-chevron flip-rtl" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {origin && !nearLoading && !nearFailed && near && !nearRows.length && (
          <div className="empty-state">
            <p>{e("noneNear", { km: NEAR_RADIUS })}</p>
            {nearest && (
              <p className="row-meta">
                {e("nearestIs", { name: areaName(locale, nearest.place), km: numberText(locale, nearest.km, 0) })}
              </p>
            )}
            <div className="empty-actions">
              <button className="btn btn-secondary btn-sm" onClick={onPlanWeather}>
                {e("planWeather")}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={onStartFree}>
                <IconPlay aria-hidden weight="fill" />
                {e("startFree")}
              </button>
            </div>
          </div>
        )}
        <p className="fine">{e("nearNowNote")}</p>
      </section>

      <section className="section explore-library" aria-labelledby="library-title">
        <div className="section-head">
          <h2 className="section-title" id="library-title">
            {e("library")}
          </h2>
          <span className="section-note num">{e("libraryCount", { n: library.length })}</span>
        </div>
        <div className="explore-filters" role="group" aria-label={e("filters")}>
          <div className="chips" role="group" aria-label={e("time")}>
            {([null, 30, 60, 90] as const).map((t) => (
              <button key={String(t)} className="chip" aria-pressed={f.time === t} onClick={() => set({ time: t })}>
                {t === null ? e("timeAny") : e(`time${t}`)}
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label={e("kind")}>
            {(["all", "place", "trail"] as const).map((k) => (
              <button key={k} className="chip" aria-pressed={f.kind === k} onClick={() => set({ kind: k })}>
                {k === "all" ? e("kindAll") : k === "place" ? e("kindPlace") : e("kindTrail")}
              </button>
            ))}
            <button className="chip" aria-pressed={f.saved} onClick={() => set({ saved: !f.saved })}>
              <IconBookmark aria-hidden weight={f.saved ? "fill" : "regular"} /> {e("savedOnly")}
            </button>
          </div>
          <details className="disclosure explore-more">
            <summary>
              {e("moreFilters")}
              {count > 0 && <span className="count-badge num">{count}</span>}
            </summary>
            <div className="disclosure-body explore-more-body">
              <fieldset className="filter-group">
                <legend>{e("difficulty")}</legend>
                <div className="chips">
                  {([null, "easy", "moderate", "hard"] as const).map((d) => (
                    <button key={String(d)} className="chip" aria-pressed={f.difficulty === d} onClick={() => set({ difficulty: d })}>
                      {d === null ? e("any") : e(d)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="filter-group">
                <legend>{e("distance")}</legend>
                <div className="chips">
                  {([null, "short", "medium", "long"] as const).map((d) => (
                    <button key={String(d)} className="chip" aria-pressed={f.distance === d} onClick={() => set({ distance: d })}>
                      {d === null ? e("any") : e(d)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="filter-group">
                <span className="filter-label">{e("governorate")}</span>
                <select className="input" value={f.governorate ?? ""} onChange={(ev) => set({ governorate: ev.target.value || null })}>
                  <option value="">{e("allGovernorates")}</option>
                  {[...governorates]
                    .sort((a, b) => (ar ? a.ar.localeCompare(b.ar, "ar") : a.en.localeCompare(b.en)))
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {ar ? g.ar : g.en}
                      </option>
                    ))}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={f.reviewed} onChange={(ev) => set({ reviewed: ev.target.checked })} />
                {e("reviewedOnly")}
              </label>
              <p className="fine">{e("timeNote")}</p>
              {count > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ ...defaultFilters, activity })}>
                  {e("clearFilters")}
                </button>
              )}
            </div>
          </details>
        </div>
        {library.length ? (
          <ul className="rows explore-list">
            {library.map((p) => {
              const g = governorates.find((x) => x.id === p.governorate);
              return (
                <li key={p.id}>
                  <button className="row-btn" onClick={() => onOpenPlace(p.id)} data-place={p.id}>
                    <span className="place-kind" data-kind={p.kind} aria-hidden="true" />
                    <span className="row-main">
                      <span className="row-title">{areaName(locale, p)}</span>
                      <span className="row-meta">
                        {ar ? p.locality.ar : p.locality.en}
                        {g && p.locality.en !== g.en ? ` · ${ar ? g.ar : g.en}` : ""}
                        {origin && <> · <bdi className="num">{e("kmAway", { km: numberText(locale, distanceKm(origin, p), 0) })}</bdi></>}
                      </span>
                      <span className="row-meta num">
                        {p.kind === "trail" ? e("trail") : e("place")}
                        {routeLine(p) && <> · <bdi>{routeLine(p)}</bdi></>}
                        {" · "}
                        {p.tier === "reviewed" ? e("reviewed") : e("openData")}
                      </span>
                      <span className="explore-marks">{marks(p)}</span>
                    </span>
                    <IconNext className="row-chevron flip-rtl" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty-line">{e("empty")}</p>
        )}
      </section>
    </section>
  );
}
