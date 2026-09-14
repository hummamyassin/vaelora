"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  Footprints,
  MapPin,
  LocateFixed,
  SlidersHorizontal,
  Sparkles,
  X,
  Wind,
  Droplets,
  CloudRain,
  ArrowUpRight,
  Navigation,
  Clock3,
  ChevronDown,
  Sun,
  Send,
} from "lucide-react";
import { activityAreas } from "../data/activity-areas";
import {
  weatherAreas,
  searchWeatherAreas,
  nearestWeatherArea,
} from "../data/weather-areas";
import { scoreBand } from "../domain/recommendation/score";
import type { DashboardResponse } from "../server/recommendations/dashboard";
import { areaName, areaDescription, label, t, type Locale } from "../lib/i18n";
import {
  distanceKm,
  orderNearby,
  validCoordinates,
  type Coordinates,
} from "../lib/geography";
import { LocationPhoto, PhotoCredit } from "./location-photo";
import type { AgentView } from "./types";
const ActivityMap = dynamic(
  () => import("./amman-map").then((m) => m.ActivityMap),
  { ssr: false, loading: () => <p>…</p> },
);
function read(key: string) {
  try {
    return JSON.parse(localStorage.getItem(`vaelora:${key}`) ?? "null");
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`vaelora:${key}`, JSON.stringify(value));
  } catch {
    /* optional storage */
  }
}
function Sheet({
  title,
  close,
  closeLabel,
  children,
}: {
  title: string;
  close: () => void;
  closeLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!,
      previous = document.activeElement as HTMLElement;
    el.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="v2-sheet"
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="sheet-title"
    >
      <div className="sheet-inner">
        <header>
          <h2 id="sheet-title">{title}</h2>
          <button onClick={close} aria-label={closeLabel}>
            <X />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
function Gauge({
  score,
  caption,
}: {
  score: number | null | undefined;
  caption: string;
}) {
  return (
    <div
      className="score-gauge"
      style={{ "--score": score ?? 0 } as React.CSSProperties}
      role="img"
      aria-label={`${caption}: ${score ?? "—"} / 100`}
    >
      <div>
        <strong>{score ?? "—"}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}
export function DashboardApp() {
  const [locale, setLocale] = useState<Locale>("en"),
    [ready, setReady] = useState(false);
  const [areaId, setAreaId] = useState("amman-central"),
    [activity, setActivity] = useState<"walking" | "running">("walking"),
    [day, setDay] = useState<"today" | "tomorrow">("today"),
    [minutes, setMinutes] = useState(60),
    [preferences, setPreferences] = useState<string[]>([]);
  const [sheet, setSheet] = useState<"filters" | "area" | "ai" | null>(null),
    [query, setQuery] = useState("");
  const [result, setResult] = useState<DashboardResponse | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const [origin, setOrigin] = useState<Coordinates | null>(null),
    [geo, setGeo] = useState<
      "idle" | "locating" | "denied" | "outside" | "located"
    >("idle"),
    [radius, setRadius] = useState(5);
  const [selected, setSelected] = useState<string | null>(null),
    [showMap, setShowMap] = useState(false),
    [hourIndex, setHourIndex] = useState(0);
  const [prompt, setPrompt] = useState(""),
    [answer, setAnswer] = useState<AgentView | null>(null),
    [asking, setAsking] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const lastRequest = useRef("");
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") setRefreshTick((n) => n + 1);
    };
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const ar = locale === "ar",
    text = (en: string, arabic: string) => (ar ? arabic : en);
  const area = weatherAreas.find((a) => a.id === areaId)!;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setLocale(read("locale") === "ar" ? "ar" : "en");
      const id = read("area");
      if (weatherAreas.some((a) => a.id === id)) setAreaId(id);
      const a = read("activity");
      if (a === "running" || a === "walking") setActivity(a);
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = ar ? "rtl" : "ltr";
    save("locale", locale);
    save("area", areaId);
    save("activity", activity);
  }, [locale, ar, areaId, activity, ready]);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const requestKey = JSON.stringify({
      areaId,
      activity,
      day,
      minutes,
      preferences,
      origin,
      radius,
      retry,
    });
    const changed = lastRequest.current !== requestKey;
    lastRequest.current = requestKey;
    const timer = setTimeout(async () => {
      if (changed) setLoading(true);
      setError(false);
      if (changed) {
        setResult(null);
        setHourIndex(0);
        setSelected(null);
      }
      try {
        const response = await fetch("/api/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            areaId,
            activity,
            day,
            minutes,
            preferences,
            ...(origin
              ? {
                  placeIds: activityAreas
                    .filter(
                      (a) =>
                        a.verificationStatus !== "unverified" &&
                        distanceKm(origin, a) <= radius,
                    )
                    .map((a) => a.id),
                }
              : {}),
          }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!data.area || !data.walking || !data.running)
          throw new Error("Unavailable");
        if (!controller.signal.aborted) setResult(data);
      } catch {
        if (!controller.signal.aborted) {
          setError(true);
          setResult(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    ready,
    areaId,
    activity,
    day,
    minutes,
    preferences,
    retry,
    origin,
    radius,
    refreshTick,
  ]);
  const outlook = result?.[activity],
    best = outlook?.bestWindow;
  const displayed = outlook?.hours[hourIndex];
  const score = day === "today" ? outlook?.current?.score : best?.score;
  const matches = useMemo(
    () =>
      orderNearby(result?.topMatches ?? [], origin).filter(
        (m) => !origin || distanceKm(origin, m.area) <= radius,
      ),
    [result, origin, radius],
  );
  const match = matches.find((m) => m.area.id === selected) ?? matches[0];
  const clock = (date: string) =>
    new Intl.DateTimeFormat(ar ? "ar-JO" : "en-GB", {
      timeZone: "Asia/Amman",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(date));
  const window = (start: string, end: string) => (
    <bdi>
      {clock(start)} – {clock(end)}
    </bdi>
  );
  function locate(): Promise<Coordinates | null> {
    setGeo("locating");
    return new Promise((resolve) => {
      const fail = () => {
        setOrigin(null);
        setGeo("denied");
        setSheet("area");
        resolve(null);
      };
      if (!navigator.geolocation) return fail();
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const point = {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
          };
          if (!validCoordinates(point)) return fail();
          const nearest = nearestWeatherArea(point);
          if (!nearest) {
            setOrigin(null);
            setGeo("outside");
            setSheet("area");
            resolve(null);
            return;
          }
          setOrigin(point);
          setAreaId(nearest.id);
          setGeo("located");
          resolve(point);
        },
        fail,
        { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false },
      );
    });
  }
  async function ask(e: FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || asking) return;
    setAsking(true);
    setAnswer(null);
    try {
      const nearRequested = /near me|قريب(?:ًا|ا|ة)? مني|بالقرب مني/i.test(
        prompt,
      );
      const point = nearRequested && !origin ? await locate() : origin;
      if (nearRequested && !point) return;
      const context = {
        areaId: point ? nearestWeatherArea(point)!.id : areaId,
        activity,
        day,
        minutes,
        preferences,
        ...(point
          ? {
              placeIds: activityAreas
                .filter(
                  (a) =>
                    a.verificationStatus !== "unverified" &&
                    distanceKm(point, a) <= radius,
                )
                .map((a) => a.id),
            }
          : {}),
      };
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, locale, context }),
      });
      const data = await response.json();
      setAnswer(
        data.status
          ? data
          : { status: "service-error", text: t(locale, "aiError"), trace: [] },
      );
    } catch {
      setAnswer({
        status: "service-error",
        text: t(locale, "aiError"),
        trace: [],
      });
    } finally {
      setAsking(false);
    }
  }
  const metricLabels: Record<string, string> = {
    temperatureC: text("Temperature", "الحرارة"),
    apparentTemperatureC: text("Feels like", "المحسوسة"),
    relativeHumidityPercent: text("Humidity", "الرطوبة"),
    windKmh: text("Wind", "الرياح"),
    precipitationProbabilityPercent: text("Rain chance", "احتمال الهطول"),
    uvIndex: text("UV index", "الأشعة فوق البنفسجية"),
  };
  return (
    <main className="v2" lang={locale} dir={ar ? "rtl" : "ltr"}>
      <header className="v2-header">
        <a href="#dashboard" className="v2-brand">
          <Navigation size={23} />
          {text("VAELORA", "ڤيلورا")}
        </a>
        <span className="v2-header-note">
          {text(
            "OUTDOOR INTELLIGENCE · JORDAN",
            "ذكاء الأنشطة الخارجية · الأردن",
          )}
        </span>
        <button
          className="v2-language"
          disabled={asking}
          onClick={() => {
            setLocale(ar ? "en" : "ar");
            setAnswer(null);
            setPrompt("");
          }}
        >
          {ar ? "English" : "العربية"}
        </button>
      </header>
      <div className="v2-shell" id="dashboard">
        <div className="v2-location-row">
          <button className="area-control" onClick={() => setSheet("area")}>
            <MapPin size={20} />
            <span>
              <small>
                {geo === "located"
                  ? text("NEAREST FORECAST AREA", "أقرب منطقة للتوقعات")
                  : text("YOUR FORECAST AREA", "منطقة التوقعات")}
              </small>
              <strong>
                {area.name[locale]} <ChevronDown size={16} />
              </strong>
            </span>
          </button>
          <div className="v2-segment days">
            {(["today", "tomorrow"] as const).map((d) => (
              <button
                key={d}
                aria-pressed={day === d}
                onClick={() => setDay(d)}
              >
                {d === "today"
                  ? text("Today", "اليوم")
                  : text("Tomorrow", "غدًا")}
              </button>
            ))}
          </div>
        </div>
        <div className="v2-title-row">
          <div>
            <p className="v2-kicker">
              {text(
                "A LITTLE MOVEMENT. A BETTER DAY.",
                "قليل من الحركة. يوم أفضل.",
              )}
            </p>
            <h1>{text("Your time outside.", "وقتك في الخارج.")}</h1>
          </div>
          <button className="filter-button" onClick={() => setSheet("filters")}>
            <SlidersHorizontal size={17} />
            {text("Filters", "التفضيلات")}
            {preferences.length > 0 && <span>{preferences.length}</span>}
          </button>
        </div>
        <div className="v2-active">
          <span>
            {minutes} {text("min", "دقيقة")}
          </span>
          {preferences.map((p) => (
            <span key={p}>{t(locale, p as "flat")}</span>
          ))}
          {origin && (
            <button
              onClick={() => {
                setOrigin(null);
                setGeo("idle");
              }}
            >
              {text("Clear location", "مسح الموقع")} ×
            </button>
          )}
        </div>
        {(geo === "denied" || geo === "outside") && (
          <p role="status" className="v2-notice">
            {geo === "denied"
              ? text(
                  "Location unavailable. Choose an area to continue.",
                  "تعذّر تحديد موقعك. اختر منطقة للمتابعة.",
                )
              : text(
                  "You are outside current coverage. Choose a supported area.",
                  "أنت خارج نطاق التغطية الحالي. اختر منطقة مدعومة.",
                )}
          </p>
        )}
        <section className="v2-overview" aria-busy={loading}>
          <div className="v2-score-card">
            <div className="v2-card-top">
              <span className="v2-kicker">
                {text("VAELORA SCORE", "مؤشر ڤيلورا")}
              </span>
              <span className="v2-live">
                {day === "today"
                  ? text("This hour", "هذه الساعة")
                  : text("Best window", "أفضل فترة")}
              </span>
            </div>
            <div className="score-composition">
              <Gauge
                score={loading ? null : score}
                caption={text("Outdoor conditions", "الظروف الخارجية")}
              />
              <div className="score-copy">
                <h2>
                  {loading
                    ? text("Checking conditions…", "جارٍ فحص الظروف…")
                    : score == null
                      ? text("Conditions unavailable", "الظروف غير متاحة")
                      : scoreBand(score)[locale]}
                </h2>
                <p>
                  {text("For your ", "لنشاط ")}
                  {t(locale, activity)}
                  {text(" in ", " في ")}
                  {area.name[locale]}
                </p>
                <button
                  className="v2-text-action"
                  onClick={() => {
                    setHourIndex(
                      day === "today"
                        ? 0
                        : Math.max(
                            0,
                            outlook?.hours.findIndex(
                              (h) =>
                                best &&
                                h.time.slice(0, 13) ===
                                  new Date(Date.parse(best.start) + 10800000)
                                    .toISOString()
                                    .slice(0, 13),
                            ) ?? 0,
                          ),
                    );
                    const el = document.getElementById("score-details")
                      ?.parentElement as HTMLDetailsElement | null;
                    if (el) {
                      el.open = true;
                      el.scrollIntoView({
                        block: "center",
                        behavior: matchMedia("(prefers-reduced-motion: reduce)")
                          .matches
                          ? "instant"
                          : "smooth",
                      });
                    }
                  }}
                >
                  {text("Why this score?", "لماذا هذا المؤشر؟")}{" "}
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
            <div className="v2-activity-switch">
              {(["walking", "running"] as const).map((a) => {
                const n =
                  day === "today"
                    ? result?.[a].current?.score
                    : result?.[a].bestWindow?.score;
                return (
                  <button
                    key={a}
                    aria-pressed={activity === a}
                    onClick={() => setActivity(a)}
                  >
                    {a === "walking" ? (
                      <Footprints size={21} />
                    ) : (
                      <Activity size={21} />
                    )}
                    <span>{t(locale, a)}</span>
                    <strong>{loading ? "—" : (n ?? "—")}</strong>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="v2-window-card">
            <div>
              <p className="v2-kicker">
                <Clock3 size={16} />
                {text("YOUR BEST WINDOW", "أفضل فترة لك")}
              </p>
              <h2>
                {loading
                  ? "—"
                  : best
                    ? window(best.start, best.end)
                    : text("No suitable window", "لا تتوفر فترة ملائمة")}
              </h2>
              <p>
                {best
                  ? `${minutes} ${text("minutes to move", "دقيقة للحركة")} · ${scoreBand(best.score)[locale]}`
                  : text(
                      "We need a complete, favorable forecast interval.",
                      "نحتاج إلى فترة توقعات مكتملة وملائمة.",
                    )}
              </p>
            </div>
            <div className="window-footer">
              <div>
                <span>{text("CONDITIONS SCORE", "مؤشر الظروف")}</span>
                <strong>
                  {loading ? "—" : (best?.score ?? "—")}
                  <small>/100</small>
                </strong>
              </div>
              <button
                className="v2-primary"
                disabled={geo === "locating"}
                onClick={locate}
              >
                <LocateFixed size={18} />
                {geo === "locating"
                  ? text("Locating…", "جارٍ التحديد…")
                  : text("Best near me", "الأفضل بالقرب مني")}
              </button>
            </div>
          </div>
        </section>
        {(error || result?.status === "weather-unavailable") && (
          <div className="v2-notice" role="alert">
            {text(
              "Forecasts are temporarily unavailable. No estimated scores are shown.",
              "التوقعات غير متاحة مؤقتًا. لا نعرض مؤشرات تقديرية.",
            )}{" "}
            <button onClick={() => setRetry((x) => x + 1)}>
              {text("Try again", "حاول مجددًا")}
            </button>
          </div>
        )}
        <section className="v2-timeline-card">
          <div className="v2-section-heading">
            <div>
              <p className="v2-kicker">
                {text("FIND YOUR MOMENT", "اختر وقتك")}
              </p>
              <h2>{text("Your day, hour by hour", "يومك، ساعة بساعة")}</h2>
            </div>
            <span>
              {t(locale, activity)} · {text("Amman time", "بتوقيت عمّان")}
            </span>
          </div>
          <div
            className="v2-hourly"
            aria-label={text("Hourly activity scores", "مؤشرات النشاط كل ساعة")}
          >
            {loading ? (
              <p role="status">
                {text(
                  "Reading hourly forecast…",
                  "جارٍ تحميل التوقعات الساعية…",
                )}
              </p>
            ) : (
              outlook?.hours.map((h, i) => (
                <button
                  key={h.time}
                  aria-pressed={hourIndex === i}
                  aria-label={`${clock(`${h.time}:00+03:00`)} · ${h.score ?? text("unavailable", "غير متاح")} / 100${best && h.time.slice(0, 13) === new Date(Date.parse(best.start) + 10800000).toISOString().slice(0, 13) ? " · " + text("Best hour", "أفضل ساعة") : ""}`}
                  className={`${h.score != null && h.score >= 80 ? "good" : ""} ${best && h.time === new Date(Date.parse(best.start) + 10800000).toISOString().slice(0, 13) + ":00" ? "best-hour" : ""}`}
                  onClick={() => setHourIndex(i)}
                >
                  <time>{clock(`${h.time}:00+03:00`)}</time>
                  <span className="hour-bar">
                    <span style={{ height: `${h.score ?? 0}%` }} />
                  </span>
                  <strong>{h.score ?? "—"}</strong>
                  <small>{h.conditions.temperatureC ?? "—"}°</small>
                </button>
              ))
            )}
          </div>
          <div className="v2-metrics">
            {[
              [Sun, "temperatureC", "°"],
              [Wind, "windKmh", text(" km/h", " كم/س")],
              [Droplets, "relativeHumidityPercent", "%"],
              [CloudRain, "precipitationProbabilityPercent", "%"],
            ].map(([Icon, key, unit]) => {
              const I = Icon as typeof Sun,
                k = key as keyof NonNullable<typeof displayed>["conditions"];
              return (
                <div key={String(key)}>
                  <I size={17} />
                  <span>{metricLabels[String(key)]}</span>
                  <strong>
                    {displayed?.conditions[k] ?? "—"}
                    {String(unit)}
                  </strong>
                </div>
              );
            })}
          </div>
          <details className="v2-breakdown">
            <summary id="score-details">
              {text("Why this score?", "لماذا هذا المؤشر؟")}
            </summary>
            <p>
              {text(
                "Selected hour · worst weather factor determines the conditions score. Preferences can exclude a time. This is a provisional comfort index, not medical advice or route safety.",
                "الساعة المختارة · يحدد أقل عوامل الطقس ملاءمة مؤشر الظروف. قد تستبعد التفضيلات فترة معينة. هذا مؤشر أولي للراحة، وليس نصيحة طبية أو تقييمًا لسلامة المسار.",
              )}
            </p>
            {displayed?.factors.map((f) => (
              <div key={f.metric}>
                <span>{metricLabels[f.metric]}</span>
                <strong>
                  {f.severity === null
                    ? text("Unavailable", "غير متاح")
                    : f.severity === 0
                      ? text("Preferred", "ملائم")
                      : f.severity === 1
                        ? text("Acceptable", "مقبول")
                        : text("Unfavorable", "غير ملائم")}
                </strong>
              </div>
            ))}
            <p>
              {text(
                "Hourly forecast resolution. 60 minutes by default. AQI, route safety and opening hours are not assessed.",
                "دقة التوقعات ساعة واحدة. المدة الافتراضية ٦٠ دقيقة. لا يشمل التقييم جودة الهواء أو سلامة المسارات أو ساعات العمل.",
              )}
            </p>
          </details>
        </section>
        <section className="v2-places">
          <div className="v2-section-heading">
            <div>
              <p className="v2-kicker">
                {text("A PLACE TO MOVE", "مكان للحركة")}
              </p>
              <h2>{text("Your top matches", "أفضل الخيارات لك")}</h2>
            </div>
            <span>
              {origin
                ? text(
                    `Reviewed places within ${radius} km of you`,
                    `أماكن مدروسة ضمن ${radius} كم منك`,
                  )
                : text(
                    "Reviewed places within 5 km of area",
                    "أماكن مدروسة ضمن ٥ كم من المنطقة",
                  )}
            </span>
          </div>
          {loading ? (
            <div className="v2-empty" role="status">
              {text("Finding your matches…", "جارٍ البحث عن الخيارات…")}
            </div>
          ) : !match ? (
            <div className="v2-empty">
              <MapPin />
              <h3>
                {error || result?.status === "weather-unavailable"
                  ? text("Waiting for conditions", "بانتظار بيانات الظروف")
                  : result?.placeWeatherFailures
                    ? text(
                        "Some place forecasts are unavailable",
                        "بعض توقعات الأماكن غير متاحة",
                      )
                    : result?.coverageCount === 0
                      ? text(
                          "Conditions here. More places to come.",
                          "الظروف متاحة. والأماكن قريبًا.",
                        )
                      : text(
                          "No match for this outing",
                          "لا يتوفر خيار لهذا النشاط",
                        )}
              </h3>
              <p>
                {error || result?.status === "weather-unavailable"
                  ? text(
                      "Try again when forecasts are available.",
                      "حاول مجددًا عند توفر التوقعات.",
                    )
                  : result?.placeWeatherFailures
                    ? text(
                        "A place forecast could not be retrieved. Try again shortly; unavailable weather is never replaced with an estimated score.",
                        "تعذّر جلب توقعات أحد الأماكن. حاول مجددًا قريبًا؛ لا نستبدل الطقس غير المتاح بمؤشر تقديري.",
                      )
                    : result?.coverageCount === 0
                      ? text(
                          "Outdoor conditions are available for this area. Verified activity-place recommendations are not available nearby yet.",
                          "ظروف الأنشطة الخارجية متاحة لهذه المنطقة. لا تتوفر توصيات بأماكن نشاط موثقة بالقرب منها بعد.",
                        )
                      : text(
                          "No reviewed places match these preferences, distance and available time windows. Try adjusting your filters.",
                          "لا توجد أماكن مدروسة تطابق التفضيلات والمسافة والفترات المتاحة. جرّب تعديل التفضيلات.",
                        )}
              </p>
            </div>
          ) : (
            <>
              <div className="v2-match-layout">
                <article className="v2-top-match">
                  <div className="v2-place-image">
                    <LocationPhoto
                      key={match.area.id}
                      areaId={match.area.id}
                      locale={locale}
                      name={areaName(locale, match.area)}
                      environment={match.area.environment}
                    />
                    <span className="v2-match-badge">
                      {text("TOP MATCH", "خيار مميز")}
                    </span>
                  </div>
                  <div className="v2-place-content">
                    <div className="v2-place-title">
                      <div>
                        <span className="v2-kicker">
                          {label(locale, match.area.verificationStatus)} ·{" "}
                          {t(locale, activity)}
                        </span>
                        <h3>{areaName(locale, match.area)}</h3>
                      </div>
                      <div className="place-score">
                        <strong>
                          {
                            result?.topMatches.find(
                              (m) => m.area.id === match.area.id,
                            )?.score
                          }
                        </strong>
                        <small>{text("Place fit", "ملاءمة المكان")}</small>
                      </div>
                    </div>
                    <p>
                      <Clock3 size={16} />
                      <bdi>
                        {match.bestWindows[0].start.slice(11)} –{" "}
                        {match.bestWindows[0].end.slice(11)}
                      </bdi>
                      {origin && (
                        <span>
                          {" "}
                          · {distanceKm(origin, match.area).toFixed(1)}{" "}
                          {text("km away", "كم")}
                        </span>
                      )}
                    </p>
                    <details>
                      <summary>{text("Why it fits", "لماذا يناسبك")}</summary>
                      <p>{areaDescription(locale, match.area)}</p>
                      <p>
                        {label(locale, match.fit)} ·{" "}
                        {label(locale, match.area.terrain)} ·{" "}
                        {match.area.surfaces
                          .map((s) => label(locale, s))
                          .join(" · ")}
                      </p>
                      <p>
                        {text(
                          "Place score includes activity fit and weather category; compare it with place scores only. Tied matches stay equivalent.",
                          "يجمع مؤشر المكان ملاءمة النشاط وفئة الطقس؛ قارنه بمؤشرات الأماكن فقط. تبقى الخيارات المتعادلة متكافئة.",
                        )}
                      </p>
                      {match.area.evidence.map((e, i) => (
                        <a
                          key={e.url}
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {text("Evidence", "المصدر")} {i + 1} ↗{" "}
                        </a>
                      ))}
                    </details>
                    <PhotoCredit areaId={match.area.id} locale={locale} />
                    <button
                      className="v2-map-action"
                      onClick={() => setShowMap((x) => !x)}
                    >
                      <MapPin size={17} />
                      {showMap
                        ? text("Hide map", "إخفاء الخريطة")
                        : text("View on map", "عرض على الخريطة")}
                    </button>
                  </div>
                </article>
                <div className="v2-other-matches">
                  {matches.map((m) => (
                    <button
                      key={m.area.id}
                      aria-pressed={m.area.id === match.area.id}
                      onClick={() => setSelected(m.area.id)}
                    >
                      <MapPin size={18} />
                      <span>
                        <strong>{areaName(locale, m.area)}</strong>
                        <small>
                          {label(locale, m.fit)}
                          {origin
                            ? ` · ${distanceKm(origin, m.area).toFixed(1)} ${text("km", "كم")}`
                            : ""}
                        </small>
                      </span>
                      <ArrowUpRight size={17} />
                    </button>
                  ))}
                  <p>
                    {text(
                      "Near-ties are equally recommended. Distance orders tied matches when your location is available.",
                      "الخيارات المتقاربة موصى بها بالتساوي. ترتب المسافة الخيارات المتعادلة عند توفر موقعك.",
                    )}
                  </p>
                </div>
              </div>
              {showMap && (
                <div className="v2-map">
                  <ActivityMap
                    matches={matches}
                    selectedAreaId={match.area.id}
                    locale={locale}
                    onSelect={setSelected}
                  />
                </div>
              )}
            </>
          )}
        </section>
        <footer className="v2-footer">
          <span>
            {text(
              "Made for movement. Built for Jordan.",
              "للحركة. من أجل الأردن.",
            )}
          </span>
          <span>
            {text(
              "Forecasts: Open-Meteo · Places: reviewed evidence",
              "التوقعات: Open-Meteo · الأماكن: مصادر مدروسة",
            )}
          </span>
          <small>
            {text(
              "Check local access before setting out. Weather areas are not verified routes.",
              "تحقق من إمكانية الدخول قبل الانطلاق. مناطق الطقس ليست مسارات موثقة.",
            )}
          </small>
          <details>
            <summary>
              {text("Forecast area sources", "مصادر منطقة التوقعات")}
            </summary>
            <p>
              {area.name[locale]} ·{" "}
              {text(
                "Reference point, not a route or boundary.",
                "نقطة مرجعية، وليست مسارًا أو حدودًا إدارية.",
              )}
            </p>
            {area.sources.map((source) => (
              <a key={source} href={source} target="_blank" rel="noreferrer">
                {new URL(source).hostname} ↗{" "}
              </a>
            ))}
            <p>
              {text(
                "Area data: GeoNames, OpenStreetMap contributors and Wikidata.",
                "بيانات المناطق: GeoNames ومساهمو OpenStreetMap وWikidata.",
              )}
            </p>
          </details>
        </footer>
      </div>
      <nav
        className="v2-dock"
        aria-label={text("Quick actions", "إجراءات سريعة")}
      >
        <button onClick={locate}>
          <LocateFixed size={20} />
          {text("Near me", "بالقرب مني")}
        </button>
        <button onClick={() => setSheet("filters")}>
          <SlidersHorizontal size={20} />
          {text("Plan activity", "خطط لنشاطك")}
        </button>
        <button className="ask-dock" onClick={() => setSheet("ai")}>
          <Sparkles size={20} />
          {text("Ask VAELORA", "اسأل ڤيلورا")}
        </button>
      </nav>
      {sheet && (
        <Sheet
          title={
            sheet === "filters"
              ? text("Make it your outing", "خطط لنشاط يناسبك")
              : sheet === "area"
                ? text("Choose your area", "اختر منطقتك")
                : text("Ask VAELORA", "اسأل ڤيلورا")
          }
          close={() => setSheet(null)}
          closeLabel={text("Close panel", "إغلاق اللوحة")}
        >
          {sheet === "filters" && (
            <div className="v2-filter-content">
              <fieldset>
                <legend>{text("Activity", "النشاط")}</legend>
                <div className="v2-segment">
                  {(["walking", "running"] as const).map((a) => (
                    <button
                      key={a}
                      aria-pressed={activity === a}
                      onClick={() => setActivity(a)}
                    >
                      {t(locale, a)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>
                  {text("Duration · optional", "المدة · اختيارية")}
                </legend>
                <div className="v2-segment">
                  {[30, 60, 90].map((n) => (
                    <button
                      key={n}
                      aria-pressed={minutes === n}
                      onClick={() => setMinutes(n)}
                    >
                      {n} {text("min", "دقيقة")}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>{text("Preferences", "التفضيلات")}</legend>
                <div className="v2-preferences">
                  {["flat", "paved", "park", "avoidHeat", "lowWind"].map(
                    (p) => (
                      <button
                        key={p}
                        aria-pressed={preferences.includes(p)}
                        onClick={() =>
                          setPreferences((old) =>
                            old.includes(p)
                              ? old.filter((x) => x !== p)
                              : [...old, p],
                          )
                        }
                      >
                        {t(locale, p as "flat")}
                      </button>
                    ),
                  )}
                </div>
              </fieldset>
              {origin && (
                <label>
                  {text("Maximum distance from you", "أقصى مسافة من موقعك")}
                  <select
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                  >
                    {[2, 5, 10].map((n) => (
                      <option value={n} key={n}>
                        {n} {text("km", "كم")}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p>
                {text(
                  "Preferences apply immediately. Forecasts are checked across the entire outing.",
                  "تُطبق التفضيلات مباشرة، وتُفحص التوقعات طوال مدة النشاط.",
                )}
              </p>
              <button
                onClick={() => {
                  setPreferences([]);
                  setMinutes(60);
                  setActivity("walking");
                  setDay("today");
                  setRadius(5);
                }}
              >
                {text("Reset filters", "إعادة ضبط التفضيلات")}
              </button>
              <button className="v2-primary" onClick={() => setSheet(null)}>
                {text("Done", "تم")}
              </button>
            </div>
          )}
          {sheet === "area" && (
            <div className="v2-area-search">
              <label htmlFor="area-search">
                {text(
                  "Search in Arabic or English",
                  "ابحث بالعربية أو الإنجليزية",
                )}
              </label>
              <input
                id="area-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={100}
                placeholder={text(
                  "Search Amman areas…",
                  "ابحث في مناطق عمّان…",
                )}
              />
              <div>
                {searchWeatherAreas(query).map((a) => (
                  <button
                    key={a.id}
                    aria-pressed={a.id === areaId}
                    onClick={() => {
                      setAreaId(a.id);
                      setOrigin(null);
                      setGeo("idle");
                      setQuery("");
                      setSheet(null);
                    }}
                  >
                    <MapPin size={18} />
                    <span>
                      {a.name[locale]}
                      <small>
                        {text(
                          "Weather planning · Amman",
                          "تخطيط حسب الطقس · عمّان",
                        )}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
              {!searchWeatherAreas(query).length && (
                <p>
                  {text(
                    "This area is not supported yet. No coordinates or places will be guessed.",
                    "هذه المنطقة غير مدعومة بعد. لا نستخدم إحداثيات أو أماكن تخمينية.",
                  )}
                </p>
              )}
              <p>
                {text(
                  "Hay Al-Shaheed Al-Janoubi: geographic reference point under review.",
                  "حي الشهيد الجنوبي: النقطة الجغرافية المرجعية قيد التحقق.",
                )}
              </p>
            </div>
          )}
          {sheet === "ai" && (
            <div className="v2-ai">
              <p>
                {text(
                  "Real forecasts. Deterministic scores. Reviewed places.",
                  "توقعات فعلية. مؤشرات محسوبة. أماكن مدروسة.",
                )}
              </p>
              <div className="v2-suggestions">
                {[
                  text(
                    "When is the best time to walk today?",
                    "متى أفضل وقت للمشي اليوم؟",
                  ),
                  text(
                    "Where should I run near me?",
                    "أين يمكنني الجري بالقرب مني؟",
                  ),
                  text(
                    "Compare Shafa Badran and Jubaiha",
                    "قارن شفا بدران والجبيهة",
                  ),
                ].map((p) => (
                  <button key={p} onClick={() => setPrompt(p)}>
                    {p}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
              <form onSubmit={ask}>
                <label htmlFor="v2-prompt">
                  {text("Your question", "سؤالك")}
                </label>
                <textarea
                  id="v2-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={2000}
                  rows={3}
                />
                <button
                  className="v2-primary"
                  disabled={asking || !prompt.trim()}
                >
                  <Send size={17} />
                  {asking
                    ? text("Checking…", "جارٍ الفحص…")
                    : text("Ask", "اسأل")}
                </button>
              </form>
              <p className="v2-fine">{t(locale, "aiRule")}</p>
              {answer && (
                <div className="v2-ai-answer" role="status">
                  <p>{answer.text || t(locale, "aiError")}</p>
                  {answer.trace?.length > 0 && (
                    <details>
                      <summary>
                        {text("How this was checked", "كيف جرى التحقق")}
                      </summary>
                      <ol>
                        {answer.trace.map((item, i) => (
                          <li key={i}>{label(locale, item.action)}</li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </Sheet>
      )}
    </main>
  );
}
