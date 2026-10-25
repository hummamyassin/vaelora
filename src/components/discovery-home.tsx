"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  LocateFixed,
  Search,
  ArrowUpRight,
  Footprints,
  Activity,
} from "lucide-react";
import { activityAreas } from "../data/activity-areas";
import { weatherAreas } from "../data/weather-areas";
import { locationContext } from "../lib/dynamic-location";
import { rankNearby } from "../domain/recommendation/nearby";
import { distanceKm, type Coordinates } from "../lib/geography";
import { areaName, areaDescription, label, type Locale } from "../lib/i18n";
import type { DiscoveryResponse } from "../server/recommendations/discovery";
import type { SearchPlace } from "../server/geocoding";
import type {
  ActivityKind,
  ConditionsSnapshot,
  RecordedActivity,
} from "../domain/tracking/activity";
import { LocationArt } from "./location-art";
import { PersonalProgress } from "./personal-progress";
import { AppDialog } from "./app-dialog";
import { planningState } from "../domain/recommendation/plan-state";
import {
  isRefreshDue,
  isWithinMaxAge,
  refreshMode,
} from "../lib/refresh-policy";
const ScoreMap = dynamic(() => import("./score-map").then((m) => m.ScoreMap), {
  ssr: false,
});
export interface DiscoveryMapData {
  point: Coordinates;
  name: string;
  places: DiscoveryResponse["places"];
  activity: ActivityKind;
  selectedAreaId?: string;
}
export function DiscoveryMap({
  data,
  locale,
}: {
  data: DiscoveryMapData;
  locale: Locale;
}) {
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
  return (
    <section className="discovery-map">
      <header className="map-heading">
        <p className="v2-kicker">
          {locale === "ar" ? "أماكن مدروسة بالقرب منك" : "REVIEWED PLACES NEARBY"}
        </p>
        <h2>{locale === "ar" ? "استكشف الأماكن القريبة" : "Explore nearby"}</h2>
        <p>{data.name}</p>
      </header>
      <ScoreMap
        rows={rows}
        activity={activity}
        locale={locale}
        origin={data.point}
        selectedAreaId={selected}
        onSelect={setSelected}
      />
      <div className="map-legend" aria-label={locale === "ar" ? "دليل الخريطة" : "Map legend"}>
        <span><i data-kind="selected" />{locale === "ar" ? "المكان المحدد" : "Selected place"}</span>
        <span><i data-kind="origin" />{locale === "ar" ? "نقطة البحث" : "Search origin"}</span>
        <span><i data-kind="score" />{locale === "ar" ? "مؤشر ملاءمة مدروس" : "Reviewed place fit"}</span>
        <span><i data-kind="cluster" />{locale === "ar" ? "مجموعة أماكن" : "Place cluster"}</span>
      </div>
      {place && (
        <div className="v21-panel">
          <h3>{areaName(locale, place.area)}</h3>
          <p>{areaDescription(locale, place.area)}</p>
          <p>
            {label(locale, place.area.terrain)} ·{" "}
            {place.area.surfaces.map((s) => label(locale, s)).join(" · ")}
          </p>
        </div>
      )}
      <div className="map-place-list">
        {data.places.map((p) => (
          <button
            key={p.area.id}
            aria-pressed={selected === p.area.id}
            onClick={() => setSelected(p.area.id)}
          >
            {areaName(locale, p.area)} <bdi>{p.score ?? "—"}/100</bdi>
          </button>
        ))}
      </div>
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
}) {
  const ar = locale === "ar",
    t = (en: string, a: string) => (ar ? a : en);
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
    [refresh, setRefresh] = useState(0),
    [selected, setSelected] = useState<string | null>(null);
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
    setSelected(null);
    document.querySelector(".daily-plan")?.scrollIntoView({ block: "start" });
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
          t("Your current area", "منطقتك الحالية"),
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
  const clock = (value: string) =>
    new Intl.DateTimeFormat(ar ? "ar-JO" : "en-GB", {
      timeZone: "Asia/Amman",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  const planCopy = !point
    ? t("Choose your area to plan today.", "حدّد منطقتك لتخطط ليومك.")
    : busy
      ? t("Checking your best time…", "نبحث عن الوقت الأنسب…")
      : failed || !plan || plan.status === "insufficient"
        ? t(
            "Conditions unavailable. Try again when online.",
            "الظروف غير متاحة. أعد المحاولة عند الاتصال.",
          )
        : plan.status === "now"
          ? t("A good moment to move.", "وقت مناسب للحركة.")
          : plan.status === "later"
            ? t("A better window is ahead.", "فترة أفضل بانتظارك.")
            : t("No suitable window today.", "لا تتوفر فترة ملائمة اليوم.");
  const planAction =
    planState === "recommended"
      ? plan?.status === "now"
        ? t(`Start ${minutes} min ${activity === "walking" ? "Walk" : "Run"}`, `ابدأ ${activity === "walking" ? "المشي" : "الجري"} لمدة ${minutes} دقيقة`)
        : t("Track now · best window is later", "سجّل الآن · الفترة الأفضل لاحقًا")
      : planState === "weather-unavailable"
        ? t("Start tracking — conditions unavailable", "ابدأ التسجيل — تعذّر تقييم الطقس")
        : planState === "no-window"
          ? t("Track without a recommendation", "سجّل نشاطًا دون توصية")
          : planState === "location-unavailable"
            ? t("Track without a location plan", "سجّل نشاطًا دون خطة مكانية")
            : t("Start tracking", "ابدأ التسجيل");
  const featured = activityAreas.filter((a) =>
    ["sports-city", "king-hussein-park", "national-gallery-park"].includes(
      a.id,
    ),
  );
  const detail = activityAreas.find((a) => a.id === selected);
  const detailWeather = placeData?.places.find((p) => p.area.id === selected);
  const geoCopy: Record<string, string> = {
    denied: t(
      "Location permission denied. Search or choose an area below.",
      "لم يُسمح بالموقع. ابحث أو اختر منطقة أدناه.",
    ),
    timeout: t(
      "Location timed out. Try again or select an area.",
      "انتهت مهلة تحديد الموقع. حاول مجددًا أو اختر منطقة.",
    ),
    unavailable: t(
      "Location is unavailable on this device. Use search.",
      "الموقع غير متاح على هذا الجهاز. استخدم البحث.",
    ),
    poor: t(
      "GPS accuracy is too low. Try outdoors or choose an area.",
      "دقة الموقع منخفضة. حاول في مكان مكشوف أو اختر منطقة.",
    ),
    outside: t(
      "Outside VAELORA’s current Amman service area. Select a supported area to plan there.",
      "أنت خارج نطاق خدمة VAELORA الحالي في عمّان. اختر منطقة مدعومة للتخطيط فيها.",
    ),
  };
  return (
    <div className="discovery-home">
      <section className="daily-plan" aria-busy={busy} data-plan-state={planState}>
        <div className="plan-heading">
          <span className="plan-day">{t("Today’s outdoor plan", "خطة اليوم في الخارج")}</span>
          <span>{name || t("GREATER AMMAN", "عمّان الكبرى")}</span>
        </div>
        <h2>{planCopy}</h2>
        <div className="plan-controls">
        <div className="v2-segment plan-sports" aria-label={t("Activity", "النشاط")}>
          {(["walking", "running"] as const).map((k) => (
            <button
              key={k}
              onClick={() => {
                onSnapshot(null);
                setActivity(k);
              }}
              aria-pressed={activity === k}
            >
              {k === "walking" ? (
                <Footprints size={18} />
              ) : (
                <Activity size={18} />
              )}{" "}
              {k === "walking" ? t("Walk", "مشي") : t("Run", "جري")}
            </button>
          ))}
        </div>
        <label className="plan-duration">
          <span>{t("Duration", "المدة")}</span>
          <select value={minutes} onChange={(e) => { onSnapshot(null); setMinutes(Number(e.target.value)); }}>
            {[30, 60, 90].map((value) => <option key={value} value={value}>{value} {t("min", "دقيقة")}</option>)}
          </select>
        </label>
        </div>
        <div className="plan-facts">
          <div className="plan-score">
            <span>{t("VAELORA Score", "مؤشر VAELORA")}</span>
            <strong><bdi>{plan?.window?.score ?? current?.score ?? "—"}</bdi><small>/100</small></strong>
            <small>{plan?.window ? t("Full outing window", "فترة النشاط كاملة") : t("Conditions now", "الظروف الآن")}</small>
          </div>
          {plan?.window && (
            <div>
              <span>{t("Best window", "أفضل فترة")}</span>
              <bdi>
                {clock(plan.window.start)} – {clock(plan.window.end)}
              </bdi>
            </div>
          )}
        </div>
        {current && (
          <p className="plan-weather">
            <bdi>{current.conditions.temperatureC ?? "—"}°C</bdi> ·{" "}
            {t("Wind", "الرياح")}{" "}
            <bdi>
              {current.conditions.windKmh ?? "—"} {t("km/h", "كم/س")}
            </bdi>{" "}
            · {t("Humidity", "الرطوبة")}{" "}
            <bdi>{current.conditions.relativeHumidityPercent ?? "—"}%</bdi>
          </p>
        )}
        {live && receivedAt !== null && (
          <small
            className="plan-updated"
            role={refreshFailed ? "status" : undefined}
            data-stale={refreshFailed || undefined}
          >
            {refreshFailed
              ? t(
                  `Couldn’t refresh · showing conditions from ${clock(new Date(receivedAt).toISOString())}`,
                  `تعذّر التحديث · نعرض ظروف الساعة ${clock(new Date(receivedAt).toISOString())}`,
                )
              : t(
                  `Updated ${clock(new Date(receivedAt).toISOString())}`,
                  `آخر تحديث ${clock(new Date(receivedAt).toISOString())}`,
                )}
          </small>
        )}
        {point && (
          <div className="plan-evidence" aria-label={t("Location data status", "حالة بيانات الموقع")}>
            <span><b>{t("Dynamic conditions", "الظروف المتغيرة")}</b>{t("Weather and time evaluated", "تم تقييم الطقس والوقت")}</span>
            <span><b>{t("Area characteristics", "خصائص المنطقة")}</b>{t("Not yet verified", "لم تُوثّق بعد")}</span>
          </div>
        )}
        {best && (
          <p>
            {t("Nearby option", "خيار قريب")}:{" "}
            <button
              className="text-link"
              onClick={() => setSelected(best.area.id)}
            >
              {areaName(locale, best.area)}
            </button>{" "}
            · {point ? distanceKm(point, best.area).toFixed(1) : ""}{" "}
            {t("km approx.", "كم تقريبًا")}
          </p>
        )}
        <button className="quick-start" onClick={onStart} data-recommended={planState === "recommended" && plan?.status === "now"}>
          {planAction} <ArrowUpRight size={20} />
        </button>
        <small className="plan-safety">
          {t(
            "When you start, GPS records your route locally. Forecasts do not guarantee route safety.",
            "عند بدء النشاط، يُستخدم GPS لتسجيل مسارك محليًا. لا تضمن التوقعات سلامة المسار.",
          )}
        </small>
        <details className="plan-details">
          <summary>{t("Planning & privacy details", "تفاصيل التخطيط والخصوصية")}</summary>
          <p>
            {t(
              "Keep this page visible while tracking. Check access and your surroundings. Area-level conditions and reviewed place facts are handled separately.",
              "أبقِ هذه الصفحة ظاهرة أثناء التتبّع، وتحقق من إمكانية الدخول ومحيطك. تُعرض ظروف المنطقة ومعلومات الأماكن الموثّقة كلٌّ على حدة.",
            )}
          </p>
        </details>
      </section>
      <section className="discovery-location">
        <div className="section-heading">
          <div>
            <h2>{t("Near you", "بالقرب منك")}</h2>
          </div>
          <button onClick={locate} disabled={geo === "locating"}>
            <LocateFixed size={18} />
            {geo === "locating"
              ? t("Locating…", "جارٍ التحديد…")
              : t("Use my location", "استخدم موقعي")}
          </button>
        </div>
        <p className="location-reassurance">
          {t(
            "Your precise GPS stays on this device; forecasts use an approximate area.",
            "يبقى موقع GPS الدقيق على هذا الجهاز، وتستخدم التوقعات منطقة تقريبية.",
          )}
        </p>
        <details className="location-details">
          <summary>{t("How location and search work", "كيف نستخدم الموقع والبحث")}</summary>
          <p>{t("Location finds nearby places and local weather. Search terms are sent to Photon / OpenStreetMap.", "يساعد الموقع في إيجاد أماكن قريبة وطقس محلي. تُرسل كلمات البحث إلى Photon / OpenStreetMap.")}</p>
        </details>
        {geoCopy[geo] && (
          <p role="status" className="v21-notice">
            {geoCopy[geo]}
          </p>
        )}
        <form
          className="discovery-search"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <label className="sr-only" htmlFor="discovery-query">
            {t("Search Amman", "ابحث في عمّان")}
          </label>
          <input
            id="discovery-query"
            value={query}
            maxLength={100}
            minLength={2}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "Search an area or place…",
              "ابحث عن منطقة أو مكان…",
            )}
          />
          <button
            disabled={searching || query.trim().length < 2}
            aria-label={t("Search", "بحث")}
          >
            <Search size={20} />
            {searching ? "…" : t("Search", "بحث")}
          </button>
        </form>
        <div className="search-results">
          {results.map((p, i) => (
            <button key={i} onClick={() => choose(p, p.name, "manual")}>
              {p.name}
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
        {searchStatus && (
          <p role="status">
            {searchStatus === "outside"
              ? t("Results are outside VAELORA’s Greater Amman coverage. Try a supported area.", "النتائج خارج نطاق VAELORA في عمّان الكبرى. جرّب منطقة مدعومة.")
              : searchStatus === "empty"
              ? t(
                  "No matching place in our service area. Try another name.",
                  "لا توجد نتيجة ضمن نطاق الخدمة. جرّب اسمًا آخر.",
                )
              : t(
                  "Search unavailable or busy. Try again, or use a reference area below.",
                  "البحث غير متاح أو مشغول. أعد المحاولة أو اختر منطقة مرجعية أدناه.",
                )}
          </p>
        )}
        <details className="reference-picker">
          <summary>
            {t("Choose a reference area instead", "أو اختر منطقة مرجعية")}
          </summary>
          <div>
            {weatherAreas.map((a) => (
              <button
                key={a.id}
                onClick={() => choose(a, a.name[locale], "manual")}
              >
                {a.name[locale]}
              </button>
            ))}
          </div>
        </details>
        {point && (
          <>
            <div className="section-heading">
              <span>
                {source === "gps"
                  ? t("From your location", "من موقعك")
                  : t("From selected area", "من المنطقة المحددة")}
              </span>
              <button
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
                {t("Clear location", "مسح الموقع")}
              </button>
              <select
                aria-label={t("Nearby radius", "نطاق البحث القريب")}
                value={radius}
                onChange={(e) => setRadius(+e.target.value)}
              >
                {[3, 5, 10].map((r) => (
                  <option key={r} value={r}>
                    {r} {t("km", "كم")}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  onMap({ point, name, activity, places: live?.places ?? [], selectedAreaId: selected ?? best?.area.id })
                }
              >
                {t("View map", "عرض الخريطة")} ↗
              </button>
            </div>
            <small>
              {t(
                "Approximate straight-line distances, not travel times. Ranked by available window, reviewed fit, evidence, then distance.",
                "مسافات تقريبية بخط مستقيم، وليست أوقات وصول. الترتيب حسب الفترة المتاحة، والملاءمة المراجعة، والمصادر، ثم المسافة.",
              )}
            </small>
            {(failed || refreshFailed || (data && !live)) && (
              <button onClick={() => setRefresh((n) => n + 1)}>
                {t("Retry conditions", "إعادة تحميل الظروف")}
              </button>
            )}
            <div className="nearby-cards">
              {nearby.slice(0, 4).map((p, i) => (
                <button
                  className="nearby-card"
                  key={p.area.id}
                  onClick={() => setSelected(p.area.id)}
                >
                  <span className="nearby-number">{i + 1}</span>
                  <span>
                    <strong>{areaName(locale, p.area)}</strong>
                    <small>
                      {distanceKm(point, p.area).toFixed(1)}{" "}
                      {t("km approx.", "كم تقريبًا")} ·{" "}
                      {p.plan.status === "now"
                        ? t("Good now", "مناسب الآن")
                        : p.plan.window
                          ? `${t("Best at", "الأفضل عند")} ${clock(p.plan.window.start)}`
                          : t("No usable window", "لا توجد فترة متاحة")}
                    </small>
                    <small>
                      {p.area.verificationStatus === "verified"
                        ? t("Verified evidence", "مصادر موثّقة")
                        : t("Source-supported", "مدعوم بمصادر")}{" "}
                      · {label(locale, p.fit)}
                    </small>
                  </span>
                  <b>
                    {p.score ?? "—"}
                    <small>{t("place fit", "ملاءمة المكان")}</small>
                  </b>
                </button>
              ))}
            </div>
            {!busy && live && !nearby.length && (
              <p>
                {t(
                  "No reviewed places match within this radius. Your area’s conditions remain available; try 10 km or change your preferences.",
                  "لا توجد أماكن مراجعة مطابقة ضمن هذا النطاق. تظل ظروف منطقتك متاحة؛ جرّب ١٠ كم أو غيّر تفضيلاتك.",
                )}
              </p>
            )}
          </>
        )}
      </section>
      <section className="featured-places">
        <div className="section-heading">
          <div>
            <h2>{t("Featured places", "أماكن مختارة")}</h2>
          </div>
        </div>
        <div className="featured-grid">
          {featured.map((a) => (
            <button key={a.id} onClick={() => setSelected(a.id)}>
              <LocationArt
                areaId={a.id}
                locale={locale}
                name={areaName(locale, a)}
                environment={a.environment}
              />
              <span>
                {t("Reviewed place profile", "معلومات مكان موثّقة")}{" "}
                <ArrowUpRight size={17} />
              </span>
            </button>
          ))}
        </div>
      </section>
      <PersonalProgress
        activities={activities}
        locale={locale}
        onOpen={onOpen}
      />
      {detail && (
        <AppDialog
          title={areaName(locale, detail)}
          close={() => setSelected(null)}
          closeLabel={t("Close", "إغلاق")}
        >
          <LocationArt
            areaId={detail.id}
            locale={locale}
            name={areaName(locale, detail)}
            environment={detail.environment}
          />
          <p>{areaDescription(locale, detail)}</p>
          <p>
            {label(locale, detail.terrain)} ·{" "}
            {detail.surfaces.map((s) => label(locale, s)).join(" · ")}
          </p>
          <p>
            {t("Walking", "المشي")}: {label(locale, detail.suitability.walking)}{" "}
            · {t("Running", "الجري")}:{" "}
            {label(locale, detail.suitability.running)}
          </p>
          {placeLoading ? (
            <p role="status">{t("Checking conditions…", "جارٍ فحص الظروف…")}</p>
          ) : placeFailed ? (
            <p role="status">
              {t(
                "Couldn’t check conditions for this place.",
                "تعذّر فحص الظروف لهذا المكان.",
              )}{" "}
              <button
                className="text-link"
                onClick={() => setPlaceRetry((n) => n + 1)}
              >
                {t("Try again", "حاول مجددًا")}
              </button>
            </p>
          ) : placeData?.outlook.current ? (
            <p>
              {t("Area conditions now", "ظروف المنطقة الآن")}:{" "}
              {placeData.outlook.current.score ?? "—"}/100 ·{" "}
              {placeData.outlook.current.conditions.temperatureC ?? "—"}°C ·{" "}
              {t("Wind", "الرياح")}{" "}
              {placeData.outlook.current.conditions.windKmh ?? "—"}{" "}
              {t("km/h", "كم/س")}
            </p>
          ) : (
            <p>
              {t(
                "Current conditions unavailable.",
                "الظروف الحالية غير متاحة.",
              )}
            </p>
          )}
          {detailWeather?.plan.window && (
            <p>
              {t("Best window", "أفضل فترة")}:{" "}
              <bdi>
                {clock(detailWeather.plan.window.start)} –{" "}
                {clock(detailWeather.plan.window.end)}
              </bdi>{" "}
              · {detailWeather.score}/100
            </p>
          )}
          <p>
            {t(
              "Check current access locally. A reviewed profile is not a surveyed route or safety guarantee.",
              "تحقق من إمكانية الدخول محليًا. المعلومات المراجعة ليست مسارًا ممسوحًا أو ضمانًا للسلامة.",
            )}
          </p>
          <button
            onClick={() => choose(detail, areaName(locale, detail), "manual")}
          >
            {t("Plan around this place", "خطّط بالقرب من هذا المكان")}
          </button>
          <details>
            <summary>{t("Place evidence", "مصادر المكان")}</summary>
            {detail.evidence.map((e) => (
              <p key={e.url}>
                <a href={e.url} target="_blank" rel="noreferrer">
                  {new URL(e.url).hostname} ↗
                </a>
              </p>
            ))}
          </details>
        </AppDialog>
      )}
    </div>
  );
}
