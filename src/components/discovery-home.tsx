"use client";
import { useEffect, useState } from "react";
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
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false),
    [refresh, setRefresh] = useState(0),
    [selected, setSelected] = useState<string | null>(null);
  const [placeData, setPlaceData] = useState<DiscoveryResponse | null>(null),
    [placeLoading, setPlaceLoading] = useState(false);
  const selectedCell = selected
    ? locationContext(activityAreas.find((a) => a.id === selected)!)?.cellId
    : null;
  useEffect(() => {
    if (!selectedCell) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      setPlaceData(null);
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
      .then((r) => r.json())
      .then((x) => {
        if (!controller.signal.aborted && x.outlook) setPlaceData(x);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setPlaceLoading(false);
      });
    return () => controller.abort();
  }, [selectedCell, activity, minutes, preferences]);
  useEffect(() => {
    onSnapshot(null);
  }, [onSnapshot]);
  useEffect(() => {
    onMapData(
      point
        ? {
            point,
            name,
            activity,
            places: data?.request.activity === activity ? data.places : [],
            selectedAreaId: selected ?? undefined,
          }
        : null,
    );
  }, [point, name, activity, data, selected, onMapData]);
  const cell = point ? locationContext(point)?.cellId : null,
    key = JSON.stringify({
      cellId: cell,
      activity,
      minutes,
      radius,
      preferences,
    });
  useEffect(() => {
    const timer = setInterval(() => {
      if (active && document.visibilityState === "visible")
        setRefresh((n) => n + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (!cell || !active) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      setBusy(true);
      setFailed(false);
      setData(null);
    });
    onSnapshot(null);
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
        setData(x);
        const h = x.outlook.current;
        if (h)
          onSnapshot({
            areaId: cell,
            areaName: ar ? "توقعات المنطقة المحددة" : "Selected area forecast",
            timestamp: Date.parse(x.evaluatedAt),
            temperatureC: h.conditions.temperatureC ?? null,
            windKmh: h.conditions.windKmh ?? null,
            score: h.score,
          });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [key, cell, refresh, onSnapshot, ar, active]);
  function choose(p: Coordinates, n: string, kind: "gps" | "manual") {
    if (!locationContext(p)) {
      setGeo("outside");
      setPoint(null);
      setData(null);
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
      if (!x.places.length) setSearchStatus("empty");
    } catch {
      setSearchStatus("error");
    } finally {
      setSearching(false);
    }
  }
  const nearby = rankNearby(data?.places ?? [], point).filter(
    (p) => point && distanceKm(point, p.area) <= radius,
  );
  const current = data?.outlook.current,
    plan = data?.plan;
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
      ? t("Start recommended activity", "ابدأ النشاط الموصى به")
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
          <p className="v2-kicker">{t("YOUR PLAN FOR TODAY", "خطتك لليوم")}</p>
          <span>{name || t("GREATER AMMAN", "عمّان الكبرى")}</span>
        </div>
        <h2>{planCopy}</h2>
        <div className="v2-segment plan-sports">
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
        <div className="plan-facts">
          <strong>
            {minutes} <small>{t("min", "دقيقة")}</small>
          </strong>
          {plan?.window && (
            <div>
              <span>{t("Best window", "أفضل فترة")}</span>
              <bdi>
                {clock(plan.window.start)} – {clock(plan.window.end)}
              </bdi>
            </div>
          )}
          {current?.score != null && (
            <div>
              <span>{t("Conditions now", "الظروف الآن")}</span>
              <bdi>{current.score}/100</bdi>
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
        <button className="quick-start" onClick={onStart} data-recommended={planState === "recommended"}>
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
            <p className="v2-kicker">
              {t("FIND YOUR START", "اختر نقطة انطلاقك")}
            </p>
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
            {searchStatus === "empty"
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
                  setData(null);
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
                  onMap({ point, name, activity, places: data?.places ?? [], selectedAreaId: selected ?? best?.area.id })
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
            {failed && (
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
            {!busy && data && !nearby.length && (
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
            <p className="v2-kicker">{t("A PLACE TO MOVE", "مكان للحركة")}</p>
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
