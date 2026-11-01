"use client";
import { useEffect, useState } from "react";
import { IconBookmark, IconFollow, IconPin, IconWarn } from "./icons";
import { Sheet } from "./app-dialog";
import { LocationArt } from "./location-art";
import { ScoreRing, scoreTone } from "./score-ring";
import { ElevationProfile, RoutePreview, type RouteFile } from "./route-figures";
import { placeById, estimatedMinutes, outingKm, routeDifficulty, routeSummary } from "../data/outdoor-places";
import { locationContext } from "../lib/dynamic-location";
import { governorates } from "../lib/jordan";
import { areaDescription, areaName, label, numberText, translator, type Locale } from "../lib/i18n";
import { exploreCopy, placeCopy } from "../lib/copy/explore";
import { homeCopy } from "../lib/copy/home";
import type { DiscoveryResponse } from "../server/recommendations/discovery";
import type { ActivityKind } from "../domain/tracking/activity";

const clockFor = (locale: Locale) => (value: string) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", {
    timeZone: "Asia/Amman",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

/** "≈ 1 h 20 min" style estimate in the user's language. */
export function durationText(locale: Locale, minutes: number) {
  const p = translator(placeCopy, locale);
  return minutes < 60 ? p("minutes", { n: minutes }) : p("hours", { h: Math.floor(minutes / 60), m: minutes % 60 });
}

/**
 * Route and place details: verified facts only, the weather fit for today
 * and the next good window, then Save, Follow route and Plan here.
 */
export function PlaceSheet({
  placeId,
  locale,
  activity,
  minutes,
  preferences,
  saved,
  completed,
  onToggleSave,
  onClose,
  onPlanHere,
  onFollow,
}: {
  placeId: string;
  locale: Locale;
  activity: ActivityKind;
  minutes: number;
  preferences: string[];
  saved: boolean;
  completed: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  onPlanHere: () => void;
  onFollow?: () => void;
}) {
  const place = placeById(placeId)!;
  const p = translator(placeCopy, locale),
    e = translator(exploreCopy, locale),
    h = translator(homeCopy, locale);
  const ar = locale === "ar";
  const clock = clockFor(locale);
  const summary = routeSummary(place);
  const cell = locationContext(place)?.cellId ?? null;
  const [weather, setWeather] = useState<DiscoveryResponse | null>(null),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0),
    [route, setRoute] = useState<RouteFile | null>(null);
  useEffect(() => {
    if (!cell) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      setLoading(true);
      setFailed(false);
    });
    void fetch("/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cellId: cell, activity, minutes, radius: 3, preferences }),
      signal: controller.signal,
    })
      .then(async (r) => {
        const x = await r.json();
        if (!x.outlook) throw new Error();
        if (!controller.signal.aborted) setWeather(x as DiscoveryResponse);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [cell, activity, minutes, preferences, retry]);
  // Geometry loads only when a trail's details open.
  useEffect(() => {
    if (!place.route) return;
    const controller = new AbortController();
    void fetch(`/routes/${place.route.summaryId}.json`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => {
        if (!controller.signal.aborted && x?.geometry) setRoute(x as RouteFile);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [place.route]);

  const own = weather?.places.find((x) => x.area.id === place.id) ?? null;
  const current = weather?.outlook.current ?? null;
  const slot = own?.plan.window ?? weather?.plan.window ?? null;
  const score = own?.score ?? slot?.score ?? current?.score ?? null;
  const tomorrow = !slot ? weather?.tomorrow ?? null : null;
  const tone = scoreTone(score);
  const fitText = tone === "good" ? p("favourable") : tone === "fair" ? p("fair") : tone === "poor" ? p("lessSuitable") : null;
  const governorate = governorates.find((g) => g.id === place.governorate);
  const supports = place.supportedActivities.includes(activity);
  const minutesEstimate = summary ? estimatedMinutes(place, summary, "walking") : null;
  const km = summary ? outingKm(place, summary) : null;

  return (
    <Sheet title={areaName(locale, place)} close={onClose} closeLabel={p("close")} className="place-sheet">
      <LocationArt areaId={place.id} locale={locale} name={areaName(locale, place)} environment={place.environment} />
      <p className="place-where">
        <IconPin aria-hidden weight="fill" />
        {ar ? place.locality.ar : place.locality.en}
        {governorate && ` · ${ar ? `محافظة ${governorate.ar}` : `${governorate.en} Governorate`}`}
      </p>
      <p className="place-badges">
        <span className="tag" data-tone={place.tier === "reviewed" ? "good" : undefined}>
          {place.tier === "reviewed" ? e("reviewed") : e("openData")}
        </span>
        <span className="tag">{place.kind === "trail" ? e("trail") : e("place")}</span>
        {completed && <span className="tag" data-tone="good">{e("completed")}</span>}
      </p>
      <p className="place-description">{areaDescription(locale, place)}</p>

      {summary && km !== null && minutesEstimate !== null ? (
        <dl className="place-facts route-facts">
          <div>
            <dt>{p("distance")}</dt>
            <dd className="num">
              <bdi>{place.route?.shape === "out-and-back" ? p("outingKm", { km: numberText(locale, km, 1) }) : p("mappedKm", { km: numberText(locale, km, 1) })}</bdi>
            </dd>
          </div>
          <div>
            <dt>{p("duration")}</dt>
            <dd className="num">
              <bdi>{durationText(locale, minutesEstimate)}</bdi>
            </dd>
          </div>
          <div>
            <dt>{p("climb")}</dt>
            <dd className="num">
              <bdi>+{summary.elevationGainM} m</bdi>
            </dd>
          </div>
          <div>
            <dt>{p("difficulty")}</dt>
            <dd>{e(routeDifficulty(summary))}</dd>
          </div>
          <div className="route-shape">
            <dt>{p("shape")}</dt>
            <dd>
              {p(place.route!.shape)}
              {place.route?.from && place.route.to
                ? ` · ${p("fromTo", { from: ar ? place.route.from.ar : place.route.from.en, to: ar ? place.route.to.ar : place.route.to.en })}`
                : ""}
            </dd>
          </div>
        </dl>
      ) : (
        <dl className="place-facts">
          <div>
            <dt>{h("terrain")}</dt>
            <dd>{place.terrain === "unknown" ? p("unknownFit") : label(locale, place.terrain)}</dd>
          </div>
          <div>
            <dt>{h("surface")}</dt>
            <dd>{place.surfaces.includes("unknown") ? p("unknownFit") : place.surfaces.map((s) => label(locale, s)).join(" · ")}</dd>
          </div>
          <div>
            <dt>{h("walkingFit")}</dt>
            <dd>{place.suitability.walking === "unknown" ? p("unknownFit") : label(locale, place.suitability.walking)}</dd>
          </div>
          <div>
            <dt>{h("runningFit")}</dt>
            <dd>{place.suitability.running === "unknown" ? p("unknownFit") : label(locale, place.suitability.running)}</dd>
          </div>
        </dl>
      )}

      <section className="place-weather" aria-labelledby="weather-fit-title" aria-busy={loading}>
        <h3 className="mini-title" id="weather-fit-title">
          {p("weatherFit")}
        </h3>
        {loading ? (
          <p role="status" className="row-meta">
            {p("checking")}
          </p>
        ) : failed ? (
          <p role="status" className="notice" data-tone="danger">
            {p("failed")}{" "}
            <button className="btn btn-secondary btn-sm" onClick={() => setRetry((n) => n + 1)}>
              {p("retry")}
            </button>
          </p>
        ) : (
          <div className="place-now-row">
            <ScoreRing score={score} label={h("scoreMeter", { n: score ?? "–" })} />
            <div>
              {fitText && <p className="place-fit">{fitText}</p>}
              <p className="place-window num">
                {slot ? (
                  <>
                    <span className="plan-label">{own?.plan.status === "now" || weather?.plan.status === "now" ? p("now") : p("bestToday")}</span>{" "}
                    <bdi>
                      {clock(slot.start)}–{clock(slot.end)}
                    </bdi>
                  </>
                ) : tomorrow ? (
                  <>
                    <span className="plan-label">{p("nextGood")}</span> <bdi>{p("tomorrowAt", { time: clock(tomorrow.window.start) })}</bdi>
                  </>
                ) : (
                  <span>{p("noWindow")}</span>
                )}
              </p>
              {current && (
                <p className="row-meta num">
                  <bdi>{current.conditions.temperatureC ?? "–"}°C</bdi> · {h("wind")} <bdi>{h("kmh", { n: current.conditions.windKmh ?? "–" })}</bdi>
                </p>
              )}
            </div>
          </div>
        )}
        <p className="fine">{p("regional")}</p>
      </section>

      {route && (
        <section className="place-route" aria-label={p("preview")}>
          <div className="route-figure">
            <h3 className="mini-title">{p("preview")}</h3>
            <RoutePreview geometry={route.geometry} label={p("preview")} />
            <p className="fine">{p("previewNote")}</p>
          </div>
          {summary && (
            <div className="route-figure">
              <h3 className="mini-title">
                {p("profile")}{" "}
                <span className="row-meta num">
                  <bdi>{p("profileRange", { low: summary.minElevationM, high: summary.maxElevationM })}</bdi>
                </span>
              </h3>
              <ElevationProfile profile={route.profile} locale={locale} label={`${p("profile")}: ${p("profileRange", { low: summary.minElevationM, high: summary.maxElevationM })}`} />
            </div>
          )}
          <p className="fine">{p("estimates")}</p>
        </section>
      )}

      {place.caveats.length > 0 && (
        <section className="place-caveats" aria-labelledby="caveats-title">
          <h3 className="mini-title" id="caveats-title">
            <IconWarn aria-hidden /> {p("beforeYouGo")}
          </h3>
          <ul>
            {place.caveats.map((c) => (
              <li key={c.en}>{ar ? c.ar : c.en}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="place-actions">
        <button className="btn btn-secondary" aria-pressed={saved} onClick={onToggleSave}>
          <IconBookmark aria-hidden weight={saved ? "fill" : "regular"} />
          {saved ? p("saved") : p("save")}
        </button>
        {onFollow && place.route && supports && (
          <button className="btn btn-primary" onClick={onFollow}>
            <IconFollow aria-hidden weight="fill" />
            {p("follow")}
          </button>
        )}
        <button className={`btn ${onFollow && place.route ? "btn-secondary" : "btn-primary"}`} onClick={onPlanHere}>
          {p("planHere")}
        </button>
      </div>
      {onFollow && place.route && <p className="fine">{p("followNote")}</p>}
      <p className="fine">{p("saveHint")}</p>
      <p className="fine">
        {place.tier === "reviewed" ? p("reviewedNote") : p("openDataNote")} {p("noClaims")}
      </p>
      <details className="disclosure">
        <summary>{p("sources")}</summary>
        <div className="disclosure-body">
          {place.evidence.map((x) => (
            <a key={x.url} href={x.url} target="_blank" rel="noreferrer">
              {new URL(x.url).hostname}
              {new URL(x.url).pathname.length > 1 ? new URL(x.url).pathname : ""}
            </a>
          ))}
          {route && <span className="fine">{route.license}</span>}
        </div>
      </details>
    </Sheet>
  );
}
