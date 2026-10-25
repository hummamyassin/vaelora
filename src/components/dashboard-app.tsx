"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  MapPin,
  Navigation,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  nearestWeatherArea,
  weatherAreas,
} from "../data/weather-areas";
import { validCoordinates, type Coordinates } from "../lib/geography";
import { translator, type Locale } from "../lib/i18n";
import { homeCopy } from "../lib/copy/home";
import { askCopy, shellCopy } from "../lib/copy/shell";
import { TrackApp } from "./track-app";
import { PlanningTools } from "./planning-tools";
import { ServiceWorkerRegistration } from "./pwa-status";
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
import type { ConditionsSnapshot, RecordedActivity } from "../domain/tracking/activity";
import {
  DiscoveryHome,
  DiscoveryMap,
  type DiscoveryMapData,
  type PlanSummary,
} from "./discovery-home";
import { Sheet } from "./app-dialog";
import { BrandMark } from "./brand-mark";
import { AskPanel } from "./ask-panel";
import { AreaPanel, FiltersPanel } from "./plan-sheets";
import { ForecastTools } from "./forecast-tools";
import { useAppRoute } from "./use-app-route";
import { useAreaForecast } from "./use-area-forecast";
import type { AppRoute } from "../lib/app-route";

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

export function DashboardApp() {
  const { route, navigate, close } = useAppRoute();
  const routeRef = useRef<AppRoute>(route);
  useEffect(() => {
    routeRef.current = route;
  }, [route]);
  const view = route.screen;
  const [discoveryMap, setDiscoveryMap] = useState<DiscoveryMapData | null>(null);
  const [discoverySnapshot, setDiscoverySnapshot] = useState<ConditionsSnapshot | null>(null);
  const quickStart = useRef<(() => void) | null>(null);
  const dynamicStart = useRef(false);
  const [profile, setProfile] = useState<GuestProfile>(defaultProfile);
  const [profileError, setProfileError] = useState(false);
  const [localActivities, setLocalActivities] = useState<RecordedActivity[]>([]),
    [activityError, setActivityError] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false),
    [dataRevision, setDataRevision] = useState(0),
    [trackRevision, setTrackRevision] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [locale, setLocale] = useState<Locale>("en"),
    [ready, setReady] = useState(false);
  const [areaId, setAreaId] = useState("amman-central"),
    [activity, setActivity] = useState<"walking" | "running">("walking"),
    [day, setDay] = useState<"today" | "tomorrow">("today"),
    [minutes, setMinutes] = useState(60),
    [preferences, setPreferences] = useState<string[]>([]);
  const [origin, setOrigin] = useState<Coordinates | null>(null),
    [geo, setGeo] = useState<"idle" | "locating" | "denied" | "outside" | "located">("idle"),
    [radius, setRadius] = useState(5);
  const [scrolled, setScrolled] = useState(false);
  const [planSummary, setPlanSummary] = useState<PlanSummary | null>(null);
  const ar = locale === "ar",
    s = translator(shellCopy, locale),
    h = translator(homeCopy, locale);
  const area = weatherAreas.find((a) => a.id === areaId)!;
  const forecast = useAreaForecast({
    ready,
    tracking,
    onHome: view === "home",
    areaId,
    activity,
    day,
    minutes,
    preferences,
    origin,
    radius,
    onRequestChange: useCallback(() => {}, []),
  });

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
      const theme = profile.theme === "system" ? (media.matches ? "dark" : "light") : profile.theme;
      document.documentElement.dataset.theme = theme;
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((m) => m.setAttribute("content", theme === "dark" ? "#0a1018" : "#eceff1"));
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [profile.theme]);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = ar ? "rtl" : "ltr";
    save("locale", locale);
    save("area", areaId);
    save("activity", activity);
    if (profile.onboarding) {
      try {
        localStorage.setItem(profileKey, JSON.stringify({ ...profile, locale }));
      } catch {
        /* Session remains usable without storage. */
      }
    }
  }, [locale, ar, areaId, activity, ready, profile]);
  // Each screen keeps its own scroll position, like separate app pages.
  const scrollMemo = useRef<Record<string, number>>({});
  const screenRef = useRef(view);
  useEffect(() => {
    const onScroll = () => {
      scrollMemo.current[screenRef.current] = window.scrollY;
      setScrolled(window.scrollY > 4);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    screenRef.current = view;
    window.scrollTo({ top: scrollMemo.current[view] ?? 0, behavior: "instant" });
  }, [view]);

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
    navigate(sessionBusy ? { screen: "track", sheet: null } : { screen: "track", activity: id, sheet: null });
  }
  async function clearLocal(kind: "history" | "profile" | "all") {
    if (sessionBusy) throw new Error("Finish activity first");
    if (kind !== "profile") {
      await clearActivities();
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
    }
    navigate({ screen: kind === "history" ? routeRef.current.screen : "home", sheet: null, activity: null }, { replace: true });
  }
  function locate(): Promise<Coordinates | null> {
    setGeo("locating");
    const openArea = () => navigate({ sheet: "area" }, { replace: routeRef.current.sheet !== null });
    return new Promise((resolve) => {
      const fail = () => {
        setOrigin(null);
        setGeo("denied");
        openArea();
        resolve(null);
      };
      if (!navigator.geolocation) return fail();
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const point = { latitude: p.coords.latitude, longitude: p.coords.longitude };
          if (!validCoordinates(point)) return fail();
          const nearest = nearestWeatherArea(point);
          if (!nearest) {
            setOrigin(null);
            setGeo("outside");
            openArea();
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
  const onRecapChange = useCallback(
    (id: string | null) => {
      const current = routeRef.current;
      if (id) {
        if (current.screen === "track" && current.activity !== id) navigate({ activity: id });
      } else if (current.activity) navigate({ activity: null }, { replace: true });
    },
    [navigate],
  );
  const closeSheet = () => close({ sheet: null });
  const sheetTitle =
    route.sheet === "filters"
      ? s("filtersTitle")
      : route.sheet === "area"
        ? s("areaTitle")
        : translator(askCopy, locale)("title");
  const dock: { id: "home" | "map" | "track"; label: string; Icon: typeof Navigation }[] = [
    { id: "home", label: s("home"), Icon: Navigation },
    { id: "map", label: s("map"), Icon: MapPin },
    { id: "track", label: tracking ? s("recording") : s("track"), Icon: Activity },
  ];
  return (
    <main className="app v2" lang={locale} dir={ar ? "rtl" : "ltr"} data-screen={view}>
      <ServiceWorkerRegistration />
      <header className="topbar" data-scrolled={scrolled}>
        <div className="topbar-inner">
          <a
            href="#/home"
            className="wordmark"
            aria-label={s("homeLink")}
            onClick={(e) => {
              e.preventDefault();
              navigate({ screen: "home", sheet: null });
            }}
          >
            <BrandMark />
            VAELORA
          </a>
          <span className="topbar-spacer" />
          <button
            className="topbar-language"
            lang={ar ? "en" : "ar"}
            aria-label={s("switchLanguage")}
            onClick={() => setLocale(ar ? "en" : "ar")}
          >
            {s("languageName")}
          </button>
          <button
            className="avatar avatar-button profile-entry"
            aria-label={s("openProfile")}
            onClick={() => navigate({ sheet: "profile" })}
          >
            {initials(profile.name)}
          </button>
        </div>
      </header>
      {profileError && (
        <div className="screen screen-banner">
          <p className="notice" data-tone="caution" role="status">
            {s("profileStorage")}
          </p>
        </div>
      )}
      <div className="screen v2-shell" id="dashboard" hidden={view !== "home"}>
        <div className="home-head">
          <h1 className="home-title">
            {profile.name ? h("greeting", { name: profile.name }) : h("planLabel")}
          </h1>
          <button
            className="btn btn-secondary btn-sm filter-button"
            onClick={() => navigate({ sheet: "filters" })}
          >
            <SlidersHorizontal aria-hidden />
            {s("filters")}
            {preferences.length > 0 && <span className="count-badge num">{preferences.length}</span>}
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
          setMinutes={setMinutes}
          preferences={preferences}
          activities={localActivities}
          selectedPlace={route.screen === "home" ? route.place : null}
          onSelectPlace={(id) => (id ? navigate({ place: id }) : close({ place: null }))}
          onStart={() => {
            dynamicStart.current = true;
            navigate({ screen: "track" });
            quickStart.current?.();
          }}
          onOpen={showActivity}
          onMap={(data) => {
            setDiscoveryMap(data);
            navigate({ screen: "map" });
          }}
          onSnapshot={setDiscoverySnapshot}
          onPlan={setPlanSummary}
        />
        <ForecastTools
          locale={locale}
          area={area}
          result={forecast.result}
          loading={forecast.loading}
          error={forecast.error}
          retry={forecast.retry}
          activity={activity}
          setActivity={setActivity}
          day={day}
          setDay={setDay}
          minutes={minutes}
          origin={origin}
          geo={geo}
          radius={radius}
          locate={() => void locate()}
          clearOrigin={() => {
            setOrigin(null);
            setGeo("idle");
          }}
          openArea={() => navigate({ sheet: "area" })}
          openTool={(tool) => navigate({ screen: tool })}
        />
      </div>
      <div className="screen v2-shell track-screen" hidden={view !== "track"} data-live={sessionBusy || undefined}>
        <TrackApp
          key={`${dataRevision}-${trackRevision}`}
          locale={locale}
          onRecording={setTracking}
          onSession={setSessionBusy}
          preferredActivity={activity}
          plannedMinutes={minutes}
          startRef={quickStart}
          recapId={route.screen === "track" ? route.activity : null}
          onRecapChange={onRecapChange}
          snapshot={(kind) => {
            if (
              discoverySnapshot &&
              Date.now() - discoverySnapshot.timestamp < 3600000 &&
              kind === activity
            )
              return discoverySnapshot;
            if (dynamicStart.current) return null;
            const result = forecast.result;
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
      </div>
      {view !== "home" && view !== "track" && (
        <div className="screen v2-shell">
          {view !== "map" && (
            <button className="back-link v21-back" onClick={() => close({ screen: "home" })}>
              <ArrowLeft aria-hidden size={18} />
              {s("back")}
            </button>
          )}
          {view === "map" && discoveryMap ? (
            <>
              <DiscoveryMap data={discoveryMap} locale={locale} />
              <button className="text-btn" onClick={() => setDiscoveryMap(null)}>
                {h("regionalMap")}
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
                navigate({ screen: "home" });
              }}
            />
          )}
        </div>
      )}
      {ready && !profile.onboarding && <Onboarding profile={{ ...profile, locale }} save={updateProfile} />}
      {route.sheet === "profile" && profile.onboarding && (
        <ProfilePanel
          key={profile.locale}
          profile={{ ...profile, locale }}
          save={updateProfile}
          close={closeSheet}
          activities={localActivities}
          storageError={activityError}
          busy={sessionBusy}
          onPlaces={() => navigate({ screen: "saved", sheet: null })}
          onActivity={showActivity}
          onClear={clearLocal}
          onImported={() => {
            if (!sessionBusy) setTrackRevision((n) => n + 1);
          }}
        />
      )}
      <nav className="dock v2-dock" aria-label={s("navLabel")}>
        {dock.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`dock-item ${id === "track" ? "track-dock" : ""}`}
            aria-current={view === id ? "page" : undefined}
            onClick={() => navigate({ screen: id, sheet: null })}
          >
            <Icon aria-hidden />
            {label}
            {id === "track" && tracking && <span className="dock-live" aria-hidden="true" />}
          </button>
        ))}
        <button
          className="dock-item ask-dock"
          aria-current={route.sheet === "ask" ? "page" : undefined}
          onClick={() => navigate({ sheet: "ask" })}
        >
          <Sparkles aria-hidden />
          {s("ask")}
        </button>
      </nav>
      {route.sheet && route.sheet !== "profile" && (
        <Sheet title={sheetTitle} close={closeSheet} closeLabel={s("close")} wide={route.sheet === "ask"}>
          {route.sheet === "filters" && (
            <FiltersPanel
              locale={locale}
              activity={activity}
              setActivity={setActivity}
              minutes={minutes}
              setMinutes={setMinutes}
              preferences={preferences}
              setPreferences={setPreferences}
              hasOrigin={!!origin}
              radius={radius}
              setRadius={setRadius}
              onReset={() => {
                setPreferences([]);
                setMinutes(60);
                setActivity("walking");
                setDay("today");
                setRadius(5);
              }}
              onDone={closeSheet}
            />
          )}
          {route.sheet === "area" && (
            <AreaPanel
              locale={locale}
              areaId={areaId}
              onChoose={(id) => {
                setAreaId(id);
                setOrigin(null);
                setGeo("idle");
                closeSheet();
              }}
            />
          )}
          {route.sheet === "ask" && (
            <AskPanel
              key={locale}
              locale={locale}
              areaId={areaId}
              setAreaId={setAreaId}
              activity={activity}
              day={day}
              minutes={minutes}
              preferences={preferences}
              origin={origin}
              radius={radius}
              locate={locate}
              onClearOrigin={() => setOrigin(null)}
              onAdjust={() => navigate({ sheet: "filters" }, { replace: true })}
              plan={planSummary}
            />
          )}
        </Sheet>
      )}
    </main>
  );
}
