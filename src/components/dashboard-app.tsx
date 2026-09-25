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
import { TrackApp } from "./track-app";
import { PlanningTools } from "./planning-tools";
import { PwaStatus } from "./pwa-status";
import { loadActivities, clearActivities } from "../lib/activity-store";
import {
  defaultProfile,
  parseProfile,
  profileKey,
  initials,
  clearPreferences,
  clearAppPreferences,
  type GuestProfile,
} from "../lib/guest-profile";
import { Onboarding, ProfilePanel } from "./guest-profile";
import type { RecordedActivity } from "../domain/tracking/activity";
import { localActivityAnswer } from "../domain/tracking/summary";
import {
  DiscoveryHome,
  DiscoveryMap,
  type DiscoveryMapData,
} from "./discovery-home";
import type { ConditionsSnapshot } from "../domain/tracking/activity";
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
  const [discoveryMap, setDiscoveryMap] = useState<DiscoveryMapData | null>(
    null,
  );
  const [discoverySnapshot, setDiscoverySnapshot] =
    useState<ConditionsSnapshot | null>(null);
  const quickStart = useRef<(() => void) | null>(null);
  const dynamicStart = useRef(false);
  const [profile, setProfile] = useState<GuestProfile>(defaultProfile);
  const [profileOpen, setProfileOpen] = useState(false),
    [profileError, setProfileError] = useState(false);
  const [localActivities, setLocalActivities] = useState<RecordedActivity[]>(
      [],
    ),
    [activityError, setActivityError] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false),
    [dataRevision, setDataRevision] = useState(0),
    [openActivityId, setOpenActivityId] = useState<string | null>(null);
  const [view, setView] = useState<
    "home" | "track" | "map" | "compare" | "outlook" | "saved"
  >("home");
  const [tracking, setTracking] = useState(false);
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
      const stored = read("guest-profile");
      if (stored) {
        try {
          const p = parseProfile(stored);
          setProfile(p);
          setLocale(p.locale);
          setActivity(p.activity);
          setMinutes(p.minutes);
        } catch {
          setProfileError(true);
        }
      }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    let mounted = true;
    const refresh = () =>
      void loadActivities()
        .then((rows) => {
          if (mounted) {
            setLocalActivities(rows);
            setActivityError(false);
          }
        })
        .catch(() => {
          if (mounted) setActivityError(true);
        });
    refresh();
    globalThis.addEventListener("vaelora:activities", refresh);
    return () => {
      mounted = false;
      globalThis.removeEventListener("vaelora:activities", refresh);
    };
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme =
        profile.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : profile.theme;
      document.documentElement.dataset.theme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", theme === "dark" ? "#171719" : "#f6f1e8");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [profile.theme]);
  function updateProfile(next: GuestProfile) {
    const valid = parseProfile(next);
    setProfile(valid);
    setLocale(valid.locale);
    setActivity(valid.activity);
    setMinutes(valid.minutes);
    try {
      localStorage.setItem(profileKey, JSON.stringify(valid));
      setProfileError(false);
    } catch {
      setProfileError(true);
    }
  }
  function showActivity(id: string) {
    if (sessionBusy) {
      setProfileOpen(false);
      setView("track");
      return;
    }
    setOpenActivityId(id);
    setProfileOpen(false);
    setView("track");
  }
  async function clearLocal(kind: "history" | "profile" | "all") {
    if (sessionBusy) throw new Error("Finish activity first");
    if (kind !== "profile") {
      await clearActivities();
      setOpenActivityId(null);
      setDataRevision((n) => n + 1);
    }
    if (kind !== "history") {
      if (kind === "all") clearAppPreferences(localStorage);
      else clearPreferences(localStorage);
      setProfile(defaultProfile);
      setLocale("en");
      setActivity("walking");
      setMinutes(60);
      setAreaId("amman-central");
      setPreferences([]);
      setOrigin(null);
      setProfileOpen(false);
      setView("home");
    }
  }
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = ar ? "rtl" : "ltr";
    save("locale", locale);
    save("area", areaId);
    save("activity", activity);
    if (profile.onboarding) {
      try {
        localStorage.setItem(
          profileKey,
          JSON.stringify({ ...profile, locale }),
        );
      } catch {
        /* Session remains usable without storage. */
      }
    }
  }, [locale, ar, areaId, activity, ready, profile]);
  useEffect(() => {
    if (!ready || tracking) return;
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
    tracking,
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
      if (localActivityAnswer(prompt, [], locale) !== null) {
        setAnswer({
          status: "conditions",
          text: localActivityAnswer(prompt, await loadActivities(), locale)!,
          trace: [],
        });
        return;
      }
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
        <a
          href="#dashboard"
          className="v2-brand"
          onClick={() => setView("home")}
        >
          <Navigation size={23} />
          VAELORA
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
        <button
          className="profile-entry"
          aria-label={text("Open profile", "فتح الملف الشخصي")}
          onClick={() => setProfileOpen(true)}
        >
          {initials(profile.name)}
        </button>
      </header>
      {profileError && (
        <p className="v2-notice" role="status">
          {text(
            "Profile storage unavailable. You can continue for this session.",
            "تعذّر حفظ الملف محليًا. يمكنك متابعة الاستخدام في هذه الجلسة.",
          )}
        </p>
      )}
      <div className="v2-shell" id="dashboard" hidden={view !== "home"}>
        <div className="v2-title-row">
          <div>
            <p className="v2-kicker">
              {text("YOUR OUTDOORS. YOUR RHYTHM.", "وقتك في الخارج. بإيقاعك.")}
            </p>
            <h1>
              {profile.name ? (
                <>
                  {text("Ready, ", "مستعد للانطلاق، ")}
                  <bdi>{profile.name}</bdi>
                  {ar ? "؟" : "?"}
                </>
              ) : (
                text("Make your move.", "حان وقت الانطلاق.")
              )}
            </h1>
          </div>
          <button className="filter-button" onClick={() => setSheet("filters")}>
            <SlidersHorizontal size={17} />
            {text("Filters", "التفضيلات")}
            {preferences.length > 0 && <span>{preferences.length}</span>}
          </button>
        </div>
        <DiscoveryHome
          key={dataRevision}
          active={view === "home" && !tracking}
          onClear={() => setDiscoveryMap(null)}
          onMapData={setDiscoveryMap}
          locale={locale}
          activity={activity}
          setActivity={setActivity}
          minutes={minutes}
          preferences={preferences}
          activities={localActivities}
          onStart={() => {
            dynamicStart.current = true;
            setView("track");
            quickStart.current?.();
          }}
          onOpen={showActivity}
          onMap={(data) => {
            setDiscoveryMap(data);
            setView("map");
          }}
          onSnapshot={setDiscoverySnapshot}
        />
        <details className="secondary-planner">
          <summary>
            {text(
              "More weather & planning tools",
              "المزيد من أدوات الطقس والتخطيط",
            )}
          </summary>
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
            <div
              className="v2-score-card"
              data-score={
                score == null
                  ? "unknown"
                  : score >= 90
                    ? "excellent"
                    : score >= 70
                      ? "good"
                      : score >= 60
                        ? "fair"
                        : "poor"
              }
            >
              <div className="v2-card-top">
                <span className="v2-kicker">
                  {text("VAELORA Score", "مؤشر VAELORA")}
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
                          behavior: matchMedia(
                            "(prefers-reduced-motion: reduce)",
                          ).matches
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
          <div className="home-launch">
            <button
              className="product-primary"
              onClick={() => {
                setOpenActivityId(null);
                setView("track");
              }}
            >
              <Activity size={22} />
              {sessionBusy
                ? text("Return to activity", "العودة إلى النشاط")
                : text("Start Activity", "ابدأ النشاط")}
              <ArrowUpRight size={20} />
            </button>
            <p>
              {text(
                "Your route. Your pace. Saved on this device.",
                "مسارك، بإيقاعك. محفوظ على هذا الجهاز.",
              )}
            </p>
          </div>
          <div
            className="v21-tools-nav"
            aria-label={text("Planning tools", "أدوات التخطيط")}
          >
            {(["compare", "outlook", "saved"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}>
                {v === "compare"
                  ? text("Compare Areas", "مقارنة المناطق")
                  : v === "outlook"
                    ? text("3-Day Outlook", "توقعات 3 أيام")
                    : text("Saved Areas", "المناطق المحفوظة")}
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
          {localActivities.length > 0 && (
            <section className="home-recent">
              <h2>{text("Last time out", "آخر نشاط لك")}</h2>
              <button
                className="profile-recent"
                onClick={() => showActivity(localActivities[0].id)}
              >
                <span>
                  {t(locale, localActivities[0].activity)} ·{" "}
                  {new Date(localActivities[0].startedAt).toLocaleDateString(
                    ar ? "ar-JO" : "en-GB",
                  )}
                </span>
                <strong>
                  {(localActivities[0].distanceM / 1000).toFixed(2)}{" "}
                  {text("km", "كم")}
                </strong>
                <ArrowUpRight size={18} />
              </button>
            </section>
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
              aria-label={text(
                "Hourly activity scores",
                "مؤشرات النشاط كل ساعة",
              )}
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
        </details>
        <PwaStatus locale={locale} />
      </div>
      <div className="v2-shell" hidden={view !== "track"}>
        <TrackApp
          key={dataRevision}
          locale={locale}
          onRecording={setTracking}
          onSession={setSessionBusy}
          preferredActivity={activity}
          startRef={quickStart}
          openActivityId={openActivityId}
          onActivityOpened={setOpenActivityId}
          snapshot={(kind) => {
            if (
              discoverySnapshot &&
              Date.now() - discoverySnapshot.timestamp < 3600000 &&
              kind === activity
            )
              return discoverySnapshot;
            if (dynamicStart.current) return null;
            const hour = result?.[kind].current;
            const timestamp = Date.parse(result?.evaluatedAt ?? "");
            if (
              !hour ||
              result?.area.id !== area.id ||
              !Number.isFinite(timestamp) ||
              Date.now() - timestamp > 3600000
            )
              return null;
            return {
              areaId: area.id,
              areaName: area.name[locale],
              timestamp,
              temperatureC: hour.conditions.temperatureC ?? null,
              windKmh: hour.conditions.windKmh ?? null,
              score: hour.score,
            };
          }}
        />
        <PwaStatus locale={locale} />
      </div>
      {view !== "home" && view !== "track" && (
        <div className="v2-shell">
          <button className="v21-back" onClick={() => setView("home")}>
            {text("Back to Home", "العودة للرئيسية")}
          </button>
          {view === "map" && discoveryMap ? (
            <>
              <DiscoveryMap data={discoveryMap} locale={locale} />
              <button onClick={() => setDiscoveryMap(null)}>
                {text("Regional forecast map", "خريطة توقعات المناطق")}
              </button>
            </>
          ) : (
            <PlanningTools
              key={view}
              mode={view}
              locale={locale}
              areaId={areaId}
              minutes={minutes}
              origin={origin}
              onSelect={(id) => {
                setAreaId(id);
                setOrigin(null);
                setView("home");
              }}
            />
          )}
          <PwaStatus locale={locale} />
        </div>
      )}
      {ready && !profile.onboarding && (
        <Onboarding profile={{ ...profile, locale }} save={updateProfile} />
      )}
      {profileOpen && profile.onboarding && (
        <ProfilePanel
          key={profile.locale}
          profile={{ ...profile, locale }}
          save={updateProfile}
          close={() => setProfileOpen(false)}
          activities={localActivities}
          storageError={activityError}
          busy={sessionBusy}
          onPlaces={() => {
            setProfileOpen(false);
            setView("saved");
          }}
          onActivity={showActivity}
          onClear={clearLocal}
        />
      )}
      <nav
        className="v2-dock"
        aria-label={text("Quick actions", "إجراءات سريعة")}
      >
        <button aria-pressed={view === "home"} onClick={() => setView("home")}>
          <Navigation size={20} />
          {text("Home", "الرئيسية")}
        </button>
        <button aria-pressed={view === "map"} onClick={() => setView("map")}>
          <MapPin size={20} />
          {text("Map", "الخريطة")}
        </button>
        <button
          className="track-dock"
          aria-pressed={view === "track"}
          onClick={() => setView("track")}
        >
          <Activity size={20} />
          {tracking
            ? text("Recording", "جارٍ التسجيل")
            : text("Track", "تتبّع")}
        </button>
        <button className="ask-dock" onClick={() => setSheet("ai")}>
          <Sparkles size={20} />
          {text("Ask", "اسأل")}
        </button>
      </nav>
      {sheet && (
        <Sheet
          title={
            sheet === "filters"
              ? text("Make it your outing", "خطط لنشاط يناسبك")
              : sheet === "area"
                ? text("Choose your area", "اختر منطقتك")
                : text("Ask VAELORA", "اسأل VAELORA")
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
              <div className="ai-intro">
                <span className="ai-mark">
                  <Sparkles size={22} />
                </span>
                <div>
                  <h3>
                    {text(
                      "Your outdoor intelligence",
                      "دليلك للنشاط في الخارج",
                    )}
                  </h3>
                  <p>
                    {text(
                      "A better plan starts with a question.",
                      "سؤال بسيط يقودك إلى خطة أفضل.",
                    )}
                  </p>
                </div>
              </div>
              <button
                className="ai-local-action"
                onClick={() =>
                  setPrompt(text("My activity today", "نشاطي اليوم"))
                }
              >
                {text(
                  "My activity today · on this device",
                  "نشاطي اليوم · على هذا الجهاز",
                )}
              </button>
              <p className="ai-grounding">
                {text(
                  "Real forecasts. Deterministic scores. Reviewed places.",
                  "توقعات فعلية. مؤشرات محسوبة. أماكن مدروسة.",
                )}
              </p>
              <p className="ai-grounding">
                {text("AI planning reference", "مرجع التخطيط للذكاء الاصطناعي")}
                : <strong>{area.name[locale]}</strong>.{" "}
                {text(
                  "Dynamic GPS cells and activity routes are never sent to the model.",
                  "لا تُرسل خلايا GPS الديناميكية أو مسارات الأنشطة إلى النموذج.",
                )}
              </p>
              <label className="ai-reference" htmlFor="ai-reference-area">
                <span>{text("Reference area", "المنطقة المرجعية")}</span>
                <select
                  id="ai-reference-area"
                  value={areaId}
                  onChange={(e) => {
                    setAreaId(e.target.value);
                    setOrigin(null);
                    setAnswer(null);
                  }}
                >
                  {weatherAreas.map((option) => (
                    <option key={option.id} value={option.id}>{option.name[locale]}</option>
                  ))}
                </select>
              </label>
              <div className="v2-suggestions">
                {[
                  text(
                    "When is the best time to walk today?",
                    "متى أفضل وقت للمشي اليوم؟",
                  ),
                  text(
                    `Where should I run around ${area.name.en}?`,
                    `أين يمكنني الجري قرب ${area.name.ar}؟`,
                  ),
                  text(
                    "Compare Shafa Badran and Jubaiha",
                    "قارن شفا بدران والجبيهة",
                  ),
                ].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPrompt(p);
                      document.getElementById("v2-prompt")?.focus();
                    }}
                  >
                    {p}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
              <form onSubmit={ask} aria-busy={asking}>
                <label htmlFor="v2-prompt">
                  {text("Your question", "سؤالك")}
                </label>
                <textarea
                  id="v2-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={2000}
                  rows={2}
                  placeholder={text(
                    "Plan a walk, find a time…",
                    "خطّط للمشي، واختر وقتًا…",
                  )}
                />
                <button
                  className="v2-primary ai-send"
                  disabled={asking || !prompt.trim()}
                >
                  <Send size={17} />
                  {asking
                    ? text("Checking…", "جارٍ الفحص…")
                    : text("Ask", "اسأل")}
                </button>
              </form>
              {asking && (
                <p className="ai-progress" role="status">
                  {text(
                    "Checking your request against VAELORA’s tools…",
                    "نتحقق من طلبك باستخدام أدوات VAELORA…",
                  )}
                </p>
              )}
              <p className="v2-fine">{t(locale, "aiRule")}</p>
              {answer && (
                <div
                  className="v2-ai-answer"
                  data-status={answer.status}
                  role={answer.status.endsWith("error") ? "alert" : "status"}
                >
                  <h3>
                    {answer.status.endsWith("error")
                      ? text(
                          "Couldn’t complete your request",
                          "تعذّر إكمال طلبك",
                        )
                      : answer.status === "clarification"
                        ? text(
                            "A little more detail",
                            "نحتاج إلى تفاصيل إضافية",
                          )
                        : text("Your answer", "إجابتك")}
                  </h3>
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
                  {!answer.status.endsWith("error") && (
                    <div className="ai-recovery" aria-label={text("Try another plan", "جرّب خطة أخرى")}>
                      <button onClick={() => { setPrompt(text(`What is the best time tomorrow around ${area.name.en}?`, `ما أفضل وقت غدًا قرب ${area.name.ar}؟`)); document.getElementById("v2-prompt")?.focus(); }}>
                        {text("Check tomorrow", "تحقق من ظروف الغد")}
                      </button>
                      <button onClick={() => document.getElementById("ai-reference-area")?.focus()}>
                        {text("Choose another area", "اختر منطقة أخرى")}
                      </button>
                      <button onClick={() => setSheet("filters")}>
                        {text("Adjust preferences", "عدّل التفضيلات")}
                      </button>
                    </div>
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
