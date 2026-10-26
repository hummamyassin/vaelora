"use client";
import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  type Ref,
} from "react";
import { IconGps, IconNext, IconPause, IconPlay, IconRun, IconStop, IconWalk } from "./icons";
import { ActivityShare } from "./activity-share";
import { ProgressRing, ScoreRing } from "./score-ring";
import dynamic from "next/dynamic";
import {
  ActivityRecorder,
  durationLabel,
  metrics,
  paceLabel,
  type ActivityKind,
  type ConditionsSnapshot,
  type RecordedActivity,
} from "../domain/tracking/activity";
import { exportGPX } from "../domain/tracking/export";
import {
  deleteActivity,
  deleteDraft,
  loadActivities,
  loadDrafts,
  saveActivity,
  saveDraft,
} from "../lib/activity-store";
import { requestPersistence } from "../lib/storage-persistence";
import { shown, translator, type Locale } from "../lib/i18n";
import { gpsQualityCopy, trackCopy } from "../lib/copy/track";
const shownPace = (seconds: number | null) => shown(paceLabel(seconds));
const RouteMap = dynamic(
  () => import("./tracking-map").then((m) => m.TrackingMap),
  { ssr: false, loading: () => <div className="track-map track-map-loading" /> },
);
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function TrackApp({
  locale,
  snapshot,
  onRecording,
  onSession,
  preferredActivity = "walking",
  plannedMinutes,
  recapId = null,
  onRecapChange,
  startRef,
}: {
  locale: Locale;
  snapshot: (activity: ActivityKind) => ConditionsSnapshot | null;
  onRecording: (active: boolean) => void;
  onSession: (busy: boolean) => void;
  preferredActivity?: ActivityKind;
  plannedMinutes?: number;
  /** Saved activity recap requested by the route (Back, refresh, deep link). */
  recapId?: string | null;
  /** Reports the recap on screen so the route can follow it. */
  onRecapChange?: (id: string | null) => void;
  startRef?: Ref<() => void>;
}) {
  const ar = locale === "ar",
    c = translator(trackCopy, locale);
  const engine = useRef<ActivityRecorder | null>(null),
    watch = useRef<number | null>(null),
    writes = useRef(Promise.resolve()),
    wake = useRef<WakeLockSentinel | null>(null),
    keepAwakeRef = useRef(true);
  const [revision, setRevision] = useState(0),
    [kind, setKind] = useState<ActivityKind>("walking"),
    [history, setHistory] = useState<RecordedActivity[]>([]),
    [drafts, setDrafts] = useState<RecordedActivity[]>([]),
    [summary, setSummary] = useState<RecordedActivity | null>(null),
    [showHistory, setShowHistory] = useState(false),
    [notice, setNotice] = useState<string | null>(null),
    [storageError, setStorageError] = useState(false),
    [saving, setSaving] = useState(false),
    [keepAwake, setKeepAwake] = useState(true),
    // Active time when the page was hidden mid-recording; shown as a resume prompt on return.
    [backgrounded, setBackgrounded] = useState<number | null>(null),
    [online, setOnline] = useState(true),
    [exportConfirm, setExportConfirm] = useState(false),
    [deleteConfirm, setDeleteConfirm] = useState(false),
    [saved, setSaved] = useState(true);
  const [display, setDisplay] = useState<{
    data: RecordedActivity | null;
    currentSpeedMps: number | null;
    accuracy: number | null;
    quality: string;
  }>({ data: null, currentSpeedMps: null, accuracy: null, quality: "waiting" });
  const a = display.data,
    state = a?.state ?? "idle",
    active = state === "recording";
  const refresh = () => {
    const r = engine.current;
    setDisplay({
      data: r ? { ...r.data, points: r.data.points.slice() } : null,
      currentSpeedMps: r?.currentSpeedMps ?? null,
      accuracy: r?.accuracy ?? null,
      quality: r?.quality ?? "waiting",
    });
    setRevision((n) => n + 1);
  };
  const stopWatch = () => {
    if (watch.current !== null) {
      navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
    }
    if (wake.current) {
      void wake.current.release().catch(() => {});
      wake.current = null;
    }
  };
  const checkpoint = () => {
    const data = engine.current?.data;
    if (!data || data.state === "idle" || data.state === "finished") return;
    const copy = structuredClone(data);
    writes.current = writes.current
      .catch(() => {})
      .then(() => saveDraft(copy))
      .catch(() => {
        setStorageError(true);
      });
  };
  // A screen lock or app switch pauses recording (web GPS stops in the background),
  // so keep the screen on by default and take the lock again whenever it is lost.
  const keepScreenOn = () => {
    if (!keepAwakeRef.current || wake.current) return;
    if (!("wakeLock" in navigator)) {
      setNotice("wake-unavailable");
      return;
    }
    void navigator.wakeLock
      .request("screen")
      .then((lock) => {
        if (engine.current?.data.state !== "recording") return void lock.release();
        wake.current = lock;
        lock.addEventListener("release", () => {
          if (wake.current === lock) wake.current = null;
        });
      })
      .catch(() => setNotice("wake-unavailable"));
  };
  const watchGPS = () => {
    if (watch.current !== null) return;
    if (!navigator.geolocation) {
      engine.current?.pause(Date.now());
      setNotice("gps-denied");
      refresh();
      return;
    }
    try {
      watch.current = navigator.geolocation.watchPosition(
        (p) => {
          engine.current?.point(
            {
              latitude: p.coords.latitude,
              longitude: p.coords.longitude,
              accuracy: p.coords.accuracy,
              timestamp: p.timestamp,
              speed: p.coords.speed,
            },
            Date.now(),
          );
        },
        (error) => {
          setNotice(error.code === 1 ? "gps-denied" : "gps-error");
          if (error.code === 1) {
            engine.current?.pause(Date.now());
            stopWatch();
            checkpoint();
          }
          refresh();
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      );
    } catch {
      engine.current?.pause(Date.now());
      setNotice("gps-denied");
      refresh();
    }
    keepScreenOn();
  };
  useEffect(() => {
    let mounted = true;
    try {
      if (localStorage.getItem("vaelora:keep-awake") === "off") {
        keepAwakeRef.current = false;
        queueMicrotask(() => setKeepAwake(false));
      }
    } catch {
      /* Keep the default. */
    }
    void Promise.all([loadActivities(), loadDrafts()])
      .then(([h, d]) => {
        if (mounted) {
          setHistory(h);
          setDrafts(d);
        }
      })
      .catch(() => {
        if (mounted) setStorageError(true);
      });
    let ticks = 0;
    const timer = setInterval(() => {
      const r = engine.current;
      if (r && r.data.state === "recording") {
        r.tick(Date.now());
        if (r.data.state !== "recording") stopWatch();
        refresh();
        if (++ticks % 5 === 0) checkpoint();
      }
    }, 1000);
    const visibility = () => {
      if (
        document.visibilityState === "hidden" &&
        engine.current?.data.state === "recording"
      ) {
        engine.current.pause(Date.now());
        engine.current.quality = "interrupted";
        setBackgrounded(engine.current.data.activeMs);
        stopWatch();
        checkpoint();
        refresh();
      } else if (document.visibilityState === "visible" && engine.current?.data.state === "recording") {
        keepScreenOn();
      }
    };
    const connectivity = () => setOnline(navigator.onLine);
    connectivity();
    const unload = (event: BeforeUnloadEvent) => {
      if (
        engine.current &&
        ["recording", "paused"].includes(engine.current.data.state)
      ) {
        event.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("beforeunload", unload);
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    return () => {
      mounted = false;
      clearInterval(timer);
      if (engine.current?.data.state === "recording")
        engine.current.pause(Date.now());
      stopWatch();
      checkpoint();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
    };
    // Long-lived listeners read the engine ref, not a captured render's activity.
  }, []);
  useEffect(() => {
    onRecording(active);
  }, [active, onRecording]);
  useEffect(() => {
    onSession(state === "recording" || state === "paused");
  }, [state, onSession]);
  useEffect(() => {
    if (state === "idle" || state === "finished") {
      const frame = requestAnimationFrame(() => setKind(preferredActivity));
      return () => cancelAnimationFrame(frame);
    }
  }, [preferredActivity, state]);
  // Route to recap: open a saved activity once per requested ID (Back, refresh,
  // deep link), never while a session is live. Local closes are not reopened.
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!recapId || state === "recording" || state === "paused") return;
    if (openedFor.current === recapId) return;
    const item = history.find((a) => a.id === recapId);
    if (!item) return;
    const frame = requestAnimationFrame(() => {
      openedFor.current = recapId;
      setSummary(item);
      setSaved(true);
      setShowHistory(false);
      setDeleteConfirm(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [recapId, history, state]);
  // Back from a saved recap closes it. Unsaved recaps stay so nothing is lost.
  const previousRecap = useRef(recapId);
  useEffect(() => {
    const was = previousRecap.current;
    previousRecap.current = recapId;
    if (!recapId) openedFor.current = null;
    if (!was || recapId || !summary || !saved || saving) return;
    const frame = requestAnimationFrame(() => {
      setSummary(null);
      engine.current = null;
      setExportConfirm(false);
      setDeleteConfirm(false);
      refresh();
    });
    return () => cancelAnimationFrame(frame);
    // Only a change of recapId may close the recap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recapId]);
  const recapChange = useRef(onRecapChange);
  useEffect(() => {
    recapChange.current = onRecapChange;
  }, [onRecapChange]);
  const summaryId = summary?.state === "finished" ? summary.id : null;
  const reported = useRef<string | null>(null);
  useEffect(() => {
    // Report closes only for a recap this component opened, so a deep link
    // waiting for history to load is never cleared.
    if (summaryId === reported.current || (!summaryId && !reported.current)) return;
    reported.current = summaryId;
    recapChange.current?.(summaryId);
  }, [summaryId]);
  function start() {
    if (drafts.length) {
      setNotice("unfinished");
      document.querySelector(".track-recovery")?.scrollIntoView({ block: "center" });
      return;
    }
    if (
      engine.current &&
      ["recording", "paused"].includes(engine.current.data.state)
    )
      return;
    const r = new ActivityRecorder(kind, crypto.randomUUID(), Date.now());
    r.start(Date.now(), snapshot(kind));
    engine.current = r;
    setSummary(null);
    setNotice(null);
    setSaved(false);
    setShowHistory(false);
    watchGPS();
    checkpoint();
    refresh();
  }
  function pause() {
    setBackgrounded(null);
    engine.current?.pause(Date.now());
    stopWatch();
    checkpoint();
    refresh();
  }
  function resume() {
    if (engine.current?.resume(Date.now())) {
      setBackgrounded(null);
      setNotice(null);
      watchGPS();
      checkpoint();
      refresh();
    }
  }
  async function persist(data: RecordedActivity) {
    setSaving(true);
    try {
      await writes.current;
      await saveActivity(data);
      // Ask once history exists; browsers that decline keep best-effort storage.
      void requestPersistence();
      setSaved(true);
      setStorageError(false);
      setHistory(await loadActivities());
      setDrafts(await loadDrafts());
    } catch {
      setStorageError(true);
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }
  async function finish() {
    const r = engine.current;
    if (!r?.finish(Date.now())) return;
    stopWatch();
    const data = structuredClone(r.data);
    setSummary(data);
    refresh();
    await persist(data);
  }
  useImperativeHandle(startRef, () => () => {
    start();
  });
  const current = summary ?? a,
    stats = current ? metrics(current) : null;
  const degraded = ["poor", "jump", "stale", "invalid", "interrupted", "limit"].includes(display.quality);
  const visualState = summary
    ? "finished"
    : state === "paused"
      ? "paused"
      : display.quality === "waiting"
        ? "acquiring"
        : degraded
          ? "degraded"
          : "recording";
  const planMs = plannedMinutes ? plannedMinutes * 60000 : 0,
    planShare = planMs && current ? Math.min(1, current.activeMs / planMs) : 0,
    planLabel =
      planMs && current && current.activeMs >= planMs
        ? c("planComplete", { n: plannedMinutes ?? 0 })
        : c("planProgress", { p: Math.floor(planShare * 100), n: plannedMinutes ?? 0 });
  const currentSpeed =
    active && display.currentSpeedMps != null
      ? display.currentSpeedMps * 3.6
      : null;
  const live = !summary && (active || state === "paused");
  const kindLabel = (k: ActivityKind) => (k === "walking" ? c("walking") : c("running"));
  const dateTime = (ms: number) =>
    new Date(ms).toLocaleString(ar ? "ar-JO-u-nu-latn" : "en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  const noticeText =
    notice === "gps-denied"
      ? c("gpsDenied")
      : notice === "wake-unavailable"
        ? c("wakeUnavailable")
        : notice === "share-error"
          ? c("shareError")
          : notice === "unfinished"
            ? c("unfinished")
            : c("gpsInterrupted");
  return (
    <section
      className="track-app"
      data-session={live ? "live" : "idle"}
      aria-label={c("label")}
    >
      {!live && (
        <header className="screen-head track-heading">
          <h1 className="screen-title">
            {summary
              ? summary.activity === "walking"
                ? c("walkDone")
                : c("runDone")
              : c("title")}
          </h1>
          {!summary && (
            <button
              className="btn btn-secondary btn-sm"
              aria-expanded={showHistory}
              onClick={() => setShowHistory(!showHistory)}
            >
              {c("history")} <span className="num">{history.length}</span>
            </button>
          )}
        </header>
      )}
      {(storageError || !online || notice) && (
        <div className="stack-notices">
          {storageError && (
            <p role="alert" className="notice" data-tone="danger">
              {c("storageError")}
            </p>
          )}
          {!online && (
            <p role="status" className="notice" data-tone="caution">
              {c("offline")}
            </p>
          )}
          {notice && (
            <p role="status" className="notice" data-tone="caution">
              {noticeText}
            </p>
          )}
        </div>
      )}
      {showHistory && !live && (
        <section className="track-history-panel" aria-label={c("history")}>
          {!history.length ? (
            <p className="empty-line">{c("historyEmpty")}</p>
          ) : (
            <div className="rows track-history">
              {history.map((item) => (
                <button
                  key={item.id}
                  className="row-btn"
                  disabled={active || state === "paused"}
                  onClick={() => {
                    setSummary(item);
                    setSaved(true);
                    setShowHistory(false);
                    setDeleteConfirm(false);
                  }}
                >
                  <span className="activity-glyph" data-kind={item.activity} aria-hidden="true">
                    {item.activity === "walking" ? <IconWalk weight="bold" /> : <IconRun weight="bold" />}
                  </span>
                  <span className="row-main">
                    <span className="sr-only">{kindLabel(item.activity)}</span>
                    <span className="row-title num">
                      <bdi>
                        {(item.distanceM / 1000).toFixed(2)} {c("km")}
                      </bdi>
                    </span>
                    <span className="row-meta">
                      {new Date(item.startedAt).toLocaleDateString(ar ? "ar-JO-u-nu-latn" : "en-GB")}
                      {" · "}
                      <bdi className="num">{durationLabel(item.activeMs)}</bdi>
                      {" · "}
                      <bdi className="num">
                        {shownPace(metrics(item).averagePaceSeconds)} {c("perKm")}
                      </bdi>
                    </span>
                  </span>
                  <IconNext className="row-chevron flip-rtl" aria-hidden />
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {!summary && drafts.length === 0 && (!a || state === "idle" || state === "finished") && (
        <section className="track-ready instrument" aria-labelledby="ready-title">
          <div className="track-ready-head">
            <h2 id="ready-title" className="track-ready-title">
              {c("readyTitle")}
            </h2>
            {plannedMinutes && (
              <span className="tag">{c("planned", { n: plannedMinutes })}</span>
            )}
          </div>
          <p className="track-ready-body">{c("readyBody")}</p>
          <div className="seg seg-band track-kind-seg" role="group" aria-label={c("label")}>
            {(["walking", "running"] as const).map((k) => (
              <button key={k} aria-pressed={kind === k} data-activity={k} onClick={() => setKind(k)}>
                {k === "walking" ? <IconWalk aria-hidden weight="bold" /> : <IconRun aria-hidden weight="bold" />}
                {kindLabel(k)}
              </button>
            ))}
          </div>
          <button className="track-start" onClick={start}>
            <span className="track-start-key" aria-hidden="true">
              <IconPlay weight="fill" />
            </span>
            <span className="track-start-label">{c("start")}</span>
          </button>
          <label className="check check-band track-wake">
            <input
              type="checkbox"
              checked={keepAwake}
              onChange={(e) => {
                setKeepAwake(e.target.checked);
                keepAwakeRef.current = e.target.checked;
                try {
                  localStorage.setItem("vaelora:keep-awake", e.target.checked ? "on" : "off");
                } catch {
                  /* Optional preference. */
                }
              }}
            />
            {c("keepAwake")}
          </label>
          <p className="track-screen-note">{c("screenNote")}</p>
        </section>
      )}
      {!summary && drafts.length > 0 && (!a || state === "finished") && (
        <section className="panel track-recovery" aria-labelledby="recovery-title">
          <h2 id="recovery-title" className="section-title">
            {c("recoveryTitle")}
          </h2>
          <p className="section-note">{c("recoveryBody")}</p>
          {drafts.map((d) => (
            <div key={d.id} className="track-actions">
              <span className="recovery-meta">
                <span className="tag" data-tone={d.activity}>
                  {kindLabel(d.activity)}
                </span>
                <bdi className="num">{durationLabel(d.activeMs)}</bdi>
              </span>
              <button
                className="btn btn-primary"
                onClick={() => {
                  engine.current = new ActivityRecorder(
                    d.activity,
                    d.id,
                    Date.now(),
                    d,
                  );
                  setSummary(null);
                  setSaved(false);
                  refresh();
                }}
              >
                {c("resume")}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (window.confirm(c("discardConfirm")))
                    void deleteDraft(d.id)
                      .then(() => loadDrafts())
                      .then(setDrafts)
                      .catch(() => setStorageError(true));
                }}
              >
                {c("discard")}
              </button>
            </div>
          ))}
        </section>
      )}
      {current && live && (
        <div className="track-session instrument" data-recap="false">
          {backgrounded !== null && state === "paused" && (
            <div className="track-interrupt" role="alert">
              <strong>{c("backgroundTitle")}</strong>
              <p>{c("backgroundBody", { time: durationLabel(backgrounded) })}</p>
              <div className="track-interrupt-actions">
                <button className="btn btn-course btn-lg" onClick={resume}>
                  <IconPlay aria-hidden weight="fill" />
                  {c("backgroundResume")}
                </button>
                <button className="btn btn-band btn-lg" onClick={() => setBackgrounded(null)}>
                  {c("backgroundLater")}
                </button>
              </div>
            </div>
          )}
          <section className="track-live" data-state={visualState}>
            <div className="track-status">
              <span className="track-state">
                <span className="state-dot" aria-hidden="true" />
                {visualState === "acquiring"
                  ? c("acquiring")
                  : visualState === "degraded"
                    ? c("degraded")
                    : active
                      ? c("recording")
                      : c("paused")}
              </span>
              <span className="track-kind">
                {kindLabel(current.activity)}
                {plannedMinutes ? ` · ${c("planned", { n: plannedMinutes })}` : ""}
              </span>
            </div>
            <ProgressRing
              className="track-dial"
              value={planShare}
              label={plannedMinutes ? planLabel : undefined}
            >
              <span className="track-timer">
                <span className="track-label">{c("activeTime")}</span>
                <strong data-testid="active-time" className="num">
                  <bdi>{durationLabel(current.activeMs)}</bdi>
                </strong>
                {plannedMinutes ? <span className="track-plan num">{planLabel}</span> : null}
              </span>
            </ProgressRing>
            <div className="track-primary">
              <div className="track-metric">
                <strong data-testid="track-distance" className="num">
                  {(current.distanceM / 1000).toFixed(2)} <small>{c("km")}</small>
                </strong>
                <span className="track-label">
                  {c("distance")} · {c("distanceNote")}
                </span>
              </div>
              <div className="track-metric">
                <strong className="num">
                  <bdi>{shownPace(stats?.averagePaceSeconds ?? null)}</bdi> <small>{c("perKm")}</small>
                </strong>
                <span className="track-label">{c("avgPace")}</span>
              </div>
            </div>
            <dl className="track-secondary">
              <div>
                <dt>{c("currentPace")}</dt>
                <dd className="num">
                  <bdi>
                    {shownPace(currentSpeed && currentSpeed > 0 ? 3600 / currentSpeed : null)} {c("perKm")}
                  </bdi>
                </dd>
              </div>
              <div>
                <dt>{c("currentSpeed")}</dt>
                <dd className="num">
                  {currentSpeed?.toFixed(1) ?? "–"} {c("kmh")}
                </dd>
              </div>
              <div>
                <dt>{c("avgSpeed")}</dt>
                <dd className="num">
                  {stats?.averageSpeedKmh?.toFixed(1) ?? "–"} {c("kmh")}
                </dd>
              </div>
            </dl>
            <p
              className="track-gps"
              role="status"
              data-quality={active ? display.quality : "paused"}
            >
              <IconGps aria-hidden weight="bold" />
              <span>
                {!active
                  ? c("gpsPaused")
                  : (gpsQualityCopy[display.quality as keyof typeof gpsQualityCopy] ?? gpsQualityCopy.waiting)[
                      ar ? 1 : 0
                    ]}
              </span>
              <span className="num">
                {display.accuracy != null
                  ? `±${Math.round(display.accuracy)} ${c("m")}`
                  : "–"}
              </span>
            </p>
          </section>
          <RouteMap
            points={current.points}
            revision={revision}
            finished={false}
            locale={locale}
          />
          <div className="track-controls">
            <button
              className={`btn btn-lg ${active ? "btn-band" : "btn-course"}`}
              onClick={active ? pause : resume}
            >
              {active ? <IconPause aria-hidden weight="fill" /> : <IconPlay aria-hidden weight="fill" />}
              {active ? c("pause") : c("resumeShort")}
            </button>
            <button className="btn btn-lg btn-band track-finish" onClick={() => void finish()}>
              <IconStop aria-hidden weight="fill" />
              {c("finish")}
            </button>
          </div>
        </div>
      )}
      {current && summary && (
        <div className="track-session recap" data-recap="true">
          <p className="recap-title">
            {c("recapTitle")} · {dateTime(current.startedAt)}
          </p>
          <RouteMap
            points={current.points}
            revision={revision}
            finished
            locale={locale}
          />
          <section className="track-live recap-metrics" data-state="finished">
            <div className="recap-hero">
              <strong data-testid="track-distance" className="num">
                {(current.distanceM / 1000).toFixed(2)}
              </strong>
              <span className="recap-hero-unit">{c("km")}</span>
              <span className="tag" data-tone={current.activity}>
                {current.activity === "walking" ? <IconWalk aria-hidden weight="bold" /> : <IconRun aria-hidden weight="bold" />}
                {kindLabel(current.activity)}
              </span>
            </div>
            <div className="stats recap-stats">
              <div className="stat">
                <span className="stat-value" data-testid="active-time">
                  <bdi>{durationLabel(current.activeMs)}</bdi>
                </span>
                <span className="stat-label">{c("activeTime")}</span>
              </div>
              <div className="stat">
                <span className="stat-value">
                  <bdi>{shownPace(stats?.averagePaceSeconds ?? null)}</bdi>
                  <span className="stat-unit">{c("perKm")}</span>
                </span>
                <span className="stat-label">{c("avgPace")}</span>
              </div>
              <div className="stat">
                <span className="stat-value">
                  {stats?.averageSpeedKmh?.toFixed(1) ?? "–"}
                  <span className="stat-unit">{c("kmh")}</span>
                </span>
                <span className="stat-label">{c("avgSpeed")}</span>
              </div>
            </div>
          </section>
          <section className="recap-conditions" aria-labelledby="conditions-title">
            <h2 id="conditions-title" className="mini-title">
              {c("conditions")}
            </h2>
            {summary.conditions ? (
              <div className="recap-conditions-body">
                {summary.conditions.score != null && (
                  <ScoreRing
                    score={summary.conditions.score}
                    label={`VAELORA ${summary.conditions.score}/100`}
                  />
                )}
                <div>
                  <p className="num">
                    <bdi>
                      {c("conditionsLine", {
                        area: summary.conditions.areaName,
                        temp: summary.conditions.temperatureC ?? "–",
                        wind: summary.conditions.windKmh ?? "–",
                      })}
                    </bdi>
                  </p>
                  <p className="fine">{c("conditionsNote")}</p>
                </div>
              </div>
            ) : (
              <p className="section-note">{c("noConditions")}</p>
            )}
          </section>
          <p
            role="status"
            className="save-status"
            data-saved={saved && !saving ? "true" : "false"}
          >
            {saving ? c("saving") : saved ? c("saved") : c("notSaved")}
          </p>
          <div className="track-actions recap-actions">
            {!saved && (
              <button
                className="btn btn-primary"
                onClick={() => void persist(summary)}
                disabled={saving}
              >
                {c("retrySave")}
              </button>
            )}
            <button
              className="btn btn-secondary"
              disabled={!saved || saving}
              onClick={() => {
                setSummary(null);
                engine.current = null;
                setExportConfirm(false);
                setDeleteConfirm(false);
                refresh();
              }}
            >
              {c("newActivity")}
            </button>
            <button
              className="btn btn-secondary"
              disabled={!summary.points.length}
              aria-expanded={exportConfirm}
              onClick={() => setExportConfirm(!exportConfirm)}
            >
              {c("gpx")}
            </button>
            <button
              className="btn btn-ghost"
              disabled={!saved || saving}
              aria-expanded={deleteConfirm}
              onClick={() => setDeleteConfirm(!deleteConfirm)}
            >
              {c("delete")}
            </button>
          </div>
          {exportConfirm && (
            <div className="notice" data-tone="caution">
              <p>{c("gpxWarning")}</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  download(
                    new Blob([exportGPX(summary)], {
                      type: "application/gpx+xml",
                    }),
                    `vaelora-${summary.id}.gpx`,
                  );
                  setExportConfirm(false);
                }}
              >
                {c("exportRoute")}
              </button>
            </div>
          )}
          {deleteConfirm && (
            <div className="notice" data-tone="danger">
              <p>{c("deleteConfirm")}</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() =>
                  void deleteActivity(summary.id)
                    .then(() => loadActivities())
                    .then((h) => {
                      setHistory(h);
                      setSummary(null);
                      engine.current = null;
                      setDeleteConfirm(false);
                      refresh();
                    })
                    .catch(() => setStorageError(true))
                }
              >
                {c("confirmDelete")}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(false)}>
                {c("cancel")}
              </button>
            </div>
          )}
          <ActivityShare activity={summary} locale={locale} />
        </div>
      )}
      {!summary && <p className="fine track-limit">{c("limits")}</p>}
    </section>
  );
}
