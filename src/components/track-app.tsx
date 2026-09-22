"use client";
import { useEffect, useRef, useState } from "react";
import { Navigation } from "lucide-react";
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
import type { Locale } from "../lib/i18n";
const RouteMap = dynamic(
  () => import("./tracking-map").then((m) => m.TrackingMap),
  { ssr: false, loading: () => <p>…</p> },
);
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function shareCard(a: RecordedActivity, ar: boolean) {
  // Privacy-safe by construction: no date, place, coordinates, or route enters this bitmap.
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 1000;
  const c = canvas.getContext("2d")!;
  const tokens = getComputedStyle(document.documentElement);
  const color = (name: string) => tokens.getPropertyValue(name).trim();
  c.fillStyle = color("--surface-strong");
  c.fillRect(0, 0, 1000, 1000);
  c.fillStyle = color("--brand-primary");
  c.font = "bold 42px Arial";
  c.textAlign = "center";
  c.fillText("VAELORA", 500, 125);
  c.fillStyle = color("--on-strong");
  c.font = "32px Arial";
  c.fillText(
    ar
      ? a.activity === "walking"
        ? "نشاط مشي مكتمل"
        : "نشاط جري مكتمل"
      : a.activity === "walking"
        ? "COMPLETED WALK"
        : "COMPLETED RUN",
    500,
    250,
  );
  c.font = "bold 120px Arial";
  c.fillText(
    `${(a.distanceM / 1000).toFixed(2)} ${ar ? "كم" : "km"}`,
    500,
    430,
  );
  c.font = "52px Arial";
  c.fillText(durationLabel(a.activeMs), 500, 565);
  c.font = "30px Arial";
  c.fillText(ar ? "الوقت النشط" : "ACTIVE TIME", 500, 620);
  c.font = "50px Arial";
  c.fillText(
    `${paceLabel(metrics(a).averagePaceSeconds)} ${ar ? "/كم" : "/km"}`,
    500,
    740,
  );
  c.font = "25px Arial";
  c.fillText(
    ar
      ? "متوسط الوتيرة · بلا بيانات الموقع"
      : "AVERAGE PACE · NO LOCATION DATA",
    500,
    795,
  );
  if (a.conditions?.score != null) {
    c.fillStyle = color("--brand-primary");
    c.fillText(`VAELORA ${a.conditions.score}/100`, 500, 900);
  }
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image unavailable"))),
      "image/png",
    ),
  );
  download(blob, "vaelora-activity.png");
}
const qualityCopy: Record<string, [string, string]> = {
  waiting: ["Waiting for GPS…", "بانتظار إشارة GPS…"],
  good: ["GPS recording", "تسجيل GPS مستمر"],
  poor: [
    "Low GPS accuracy · point excluded",
    "دقة GPS منخفضة · استُبعدت النقطة",
  ],
  jump: ["GPS jump excluded", "استُبعدت قفزة في الموقع"],
  stale: ["Old GPS reading excluded", "استُبعدت قراءة GPS قديمة"],
  stationary: ["No reliable movement yet", "لم تُرصد حركة موثوقة بعد"],
  invalid: ["Invalid GPS point excluded", "استُبعدت نقطة GPS غير صالحة"],
  interrupted: [
    "Recording interrupted · resume when ready",
    "انقطع التسجيل · استأنف عندما تكون جاهزًا",
  ],
  limit: [
    "Recording limit reached · finish to save",
    "بلغ التسجيل الحد الأقصى · أنهِ النشاط لحفظه",
  ],
};
export function TrackApp({
  locale,
  snapshot,
  onRecording,
  onSession,
  preferredActivity = "walking",
  openActivityId,
  onActivityOpened,
}: {
  locale: Locale;
  snapshot: (activity: ActivityKind) => ConditionsSnapshot | null;
  onRecording: (active: boolean) => void;
  onSession: (busy: boolean) => void;
  preferredActivity?: ActivityKind;
  openActivityId?: string | null;
  onActivityOpened: (id: null) => void;
}) {
  const ar = locale === "ar",
    text = (en: string, arabic: string) => (ar ? arabic : en);
  const engine = useRef<ActivityRecorder | null>(null),
    watch = useRef<number | null>(null),
    writes = useRef(Promise.resolve()),
    wake = useRef<WakeLockSentinel | null>(null),
    keepAwakeRef = useRef(false);
  const [revision, setRevision] = useState(0),
    [kind, setKind] = useState<ActivityKind>("walking"),
    [history, setHistory] = useState<RecordedActivity[]>([]),
    [drafts, setDrafts] = useState<RecordedActivity[]>([]),
    [summary, setSummary] = useState<RecordedActivity | null>(null),
    [showHistory, setShowHistory] = useState(false),
    [notice, setNotice] = useState<string | null>(null),
    [storageError, setStorageError] = useState(false),
    [saving, setSaving] = useState(false),
    [keepAwake, setKeepAwake] = useState(false),
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
    if (keepAwakeRef.current && "wakeLock" in navigator)
      void navigator.wakeLock
        .request("screen")
        .then((lock) => {
          if (engine.current?.data.state === "recording") wake.current = lock;
          else void lock.release();
        })
        .catch(() => setNotice("wake-unavailable"));
  };
  useEffect(() => {
    let mounted = true;
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
        stopWatch();
        checkpoint();
        refresh();
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
  useEffect(() => {
    if (!openActivityId || state === "recording" || state === "paused") return;
    const item = history.find((a) => a.id === openActivityId);
    if (!item) return;
    const frame = requestAnimationFrame(() => {
      setSummary(item);
      setSaved(true);
      setShowHistory(false);
      setDeleteConfirm(false);
      onActivityOpened(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [openActivityId, history, state, onActivityOpened]);
  function start() {
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
    engine.current?.pause(Date.now());
    stopWatch();
    checkpoint();
    refresh();
  }
  function resume() {
    if (engine.current?.resume(Date.now())) {
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
  const current = summary ?? a,
    stats = current ? metrics(current) : null;
  const currentSpeed =
    active && display.currentSpeedMps != null
      ? display.currentSpeedMps * 3.6
      : null;
  return (
    <section
      className="track-app"
      data-session={
        !summary && (active || state === "paused") ? "live" : "idle"
      }
      aria-label={text("VAELORA Track", "تتبّع النشاط")}
    >
      <header className="track-heading">
        <div>
          <p className="v2-kicker">
            {text("Plan · Track · Analyze", "خطّط · تتبّع · حلّل")}
          </p>
          <h1>
            {summary
              ? text("Your activity, recorded.", "نشاطك، كما سجّلته.")
              : text("Move at your rhythm.", "تحرّك بإيقاعك.")}
          </h1>
        </div>
        <button
          className="v21-quiet"
          onClick={() => setShowHistory(!showHistory)}
        >
          {text("Activity History", "سجل الأنشطة")} ({history.length})
        </button>
      </header>
      <p className="track-privacy">
        {text(
          "Your recorded route stays on this device.",
          "يبقى مسار نشاطك محفوظًا على هذا الجهاز.",
        )}
      </p>
      {storageError && (
        <p role="alert" className="v21-notice">
          {text(
            "Device storage is unavailable or contains an unsupported record. Keep this page open; retry saving or export your completed activity. Existing data was not erased.",
            "تخزين الجهاز غير متاح أو يحتوي سجلًا غير مدعوم. أبقِ الصفحة مفتوحة، ثم أعد الحفظ أو صدّر النشاط المكتمل. لم نمسح البيانات الموجودة.",
          )}
        </p>
      )}
      {!online && (
        <p role="status" className="v21-notice">
          {text(
            "Offline · GPS and the local timer can continue. Weather, AI and map tiles need a connection.",
            "دون اتصال · يمكن استمرار GPS والمؤقت المحلي. الطقس والذكاء الاصطناعي وخلفية الخريطة تحتاج اتصالًا.",
          )}
        </p>
      )}
      {notice && (
        <p role="status" className="v21-notice">
          {notice === "gps-denied"
            ? text(
                "Location permission unavailable. Allow location in browser settings, then Resume. The activity is paused.",
                "إذن الموقع غير متاح. اسمح به في إعدادات المتصفح ثم استأنف. النشاط متوقف مؤقتًا.",
              )
            : notice === "wake-unavailable"
              ? text(
                  "Keep-screen-on is unavailable. Keep this page visible while recording.",
                  "إبقاء الشاشة مضاءة غير متاح. أبقِ الصفحة ظاهرة أثناء التسجيل.",
                )
              : notice === "share-error"
                ? text(
                    "The share card could not be created. Try again; your activity is still saved.",
                    "تعذر إنشاء بطاقة المشاركة. حاول مجددًا؛ نشاطك ما زال محفوظًا.",
                  )
                : text(
                    "GPS signal interrupted. Missing points are not invented; recording resumes with a route gap.",
                    "انقطعت إشارة GPS. لن نختلق نقاطًا مفقودة؛ يُستأنف المسار مع فجوة.",
                  )}
        </p>
      )}
      {showHistory && (
        <section className="v21-panel">
          <h2>{text("Activity History", "سجل الأنشطة")}</h2>
          {!history.length && (
            <p>
              {text(
                "Your first walk or run starts here.",
                "ابدأ هنا أول نشاط مشي أو جري.",
              )}
            </p>
          )}
          <div className="track-history">
            {history.map((item) => (
              <button
                key={item.id}
                disabled={active || state === "paused"}
                onClick={() => {
                  setSummary(item);
                  setSaved(true);
                  setShowHistory(false);
                  setDeleteConfirm(false);
                }}
              >
                <strong>
                  {item.activity === "walking"
                    ? text("Walking", "المشي")
                    : text("Running", "الجري")}{" "}
                  · {(item.distanceM / 1000).toFixed(2)} {text("km", "كم")}
                </strong>
                <span>
                  {new Date(item.startedAt).toLocaleDateString(
                    ar ? "ar-JO" : "en-GB",
                  )}{" "}
                  · <bdi>{durationLabel(item.activeMs)}</bdi> ·{" "}
                  <bdi>
                    {paceLabel(metrics(item).averagePaceSeconds)}{" "}
                    {text("/km", "/كم")}
                  </bdi>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      {!summary && (!a || state === "idle" || state === "finished") && (
        <section className="track-ready v21-panel">
          <div className="v2-segment">
            {(["walking", "running"] as const).map((k) => (
              <button
                key={k}
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {k === "walking"
                  ? text("Walking", "المشي")
                  : text("Running", "الجري")}
              </button>
            ))}
          </div>
          <div className="track-ready-orbit" aria-hidden="true">
            <Navigation size={44} />
          </div>
          <h2>{text("A little movement. Yours.", "خطوات بسيطة، تخصّك.")}</h2>
          <p>
            {text(
              "Location draws your route and measures distance. Choose an activity, then start when you’re ready.",
              "نستخدم الموقع لرسم مسارك وقياس المسافة. اختر نشاطك وابدأ عندما تكون جاهزًا.",
            )}
          </p>
          <label className="track-wake">
            <input
              type="checkbox"
              checked={keepAwake}
              onChange={(e) => {
                setKeepAwake(e.target.checked);
                keepAwakeRef.current = e.target.checked;
              }}
            />
            {text(
              "Keep screen on, when supported",
              "إبقاء الشاشة مضاءة، عند توفر الدعم",
            )}
          </label>
          <button className="track-start" onClick={start}>
            {text("Start Activity", "ابدأ النشاط")}{" "}
            <span aria-hidden="true">↗</span>
          </button>
        </section>
      )}
      {!summary && drafts.length > 0 && (!a || state === "finished") && (
        <section className="v21-panel">
          <h2>{text("Unfinished activity", "نشاط غير مكتمل")}</h2>
          <p>
            {text(
              "Recovered at the last local checkpoint. Unobserved time and movement are excluded.",
              "استُعيد النشاط عند آخر حفظ محلي. لم نحتسب الوقت والحركة غير المسجلين.",
            )}
          </p>
          {drafts.map((d) => (
            <div key={d.id} className="track-actions">
              <span>
                <bdi>{durationLabel(d.activeMs)}</bdi>
              </span>
              <button
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
                {text("Recover paused", "استعادة متوقفًا مؤقتًا")}
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      text(
                        "Delete this unfinished activity from this device?",
                        "هل تريد حذف هذا النشاط غير المكتمل من الجهاز؟",
                      ),
                    )
                  )
                    void deleteDraft(d.id)
                      .then(() => loadDrafts())
                      .then(setDrafts)
                      .catch(() => setStorageError(true));
                }}
              >
                {text("Discard", "حذف")}
              </button>
            </div>
          ))}
        </section>
      )}
      {current && (summary || state === "recording" || state === "paused") && (
        <div className="track-session">
          <section
            className="track-live"
            data-state={summary ? "finished" : state}
          >
            <div className="track-state">
              <span className={active && !summary ? "recording-dot" : ""} />
              {summary
                ? text("Completed", "مكتمل")
                : active
                  ? text("Recording", "جارٍ التسجيل")
                  : text("Paused", "متوقف مؤقتًا")}{" "}
              ·{" "}
              {current.activity === "walking"
                ? text("Walking", "المشي")
                : text("Running", "الجري")}
            </div>
            {summary && (
              <p>
                {new Date(current.startedAt).toLocaleString(
                  ar ? "ar-JO" : "en-GB",
                )}
              </p>
            )}
            <div className="track-timer">
              <strong data-testid="active-time">
                <bdi>{durationLabel(current.activeMs)}</bdi>
              </strong>
              <span>{text("Active time", "الوقت النشط")}</span>
            </div>
            <div className="track-metrics">
              <div>
                <strong data-testid="track-distance">
                  {(current.distanceM / 1000).toFixed(2)}{" "}
                  <small>{text("km", "كم")}</small>
                </strong>
                <span>
                  {text("Distance · GPS estimate", "المسافة · تقدير GPS")}
                </span>
              </div>
              <div>
                <strong>
                  <bdi>{paceLabel(stats?.averagePaceSeconds ?? null)}</bdi>{" "}
                  <small>{text("/km", "/كم")}</small>
                </strong>
                <span>{text("Average pace", "متوسط الوتيرة")}</span>
              </div>
              <div className="track-speed">
                <strong>
                  {stats?.averageSpeedKmh?.toFixed(1) ?? "—"}{" "}
                  <small>{text("km/h", "كم/س")}</small>
                </strong>
                <span>{text("Average speed", "متوسط السرعة")}</span>
              </div>
              {!summary && (
                <div className="track-speed">
                  <strong>
                    {currentSpeed?.toFixed(1) ?? "—"}{" "}
                    <small>{text("km/h", "كم/س")}</small>
                  </strong>
                  <span>{text("Current speed", "السرعة الحالية")}</span>
                </div>
              )}
            </div>
            {!summary && (
              <p
                className="track-gps"
                role="status"
                data-quality={active ? display.quality : "paused"}
              >
                <span>
                  {!active
                    ? text("GPS paused", "تتبّع الموقع متوقف مؤقتًا")
                    : (qualityCopy[display.quality] ?? qualityCopy.waiting)[
                        ar ? 1 : 0
                      ]}{" "}
                  ·{" "}
                  {display.accuracy != null
                    ? `±${Math.round(display.accuracy)} ${text("m", "م")}`
                    : "—"}
                </span>
                <span>
                  {text("Current pace", "الوتيرة الحالية")}{" "}
                  <bdi>
                    {paceLabel(
                      currentSpeed && currentSpeed > 0
                        ? 3600 / currentSpeed
                        : null,
                    )}{" "}
                    {text("/km", "/كم")}
                  </bdi>
                </span>
              </p>
            )}
          </section>
          <RouteMap
            points={current.points}
            revision={revision}
            finished={!!summary}
            locale={locale}
          />
          {!summary && (
            <div className="track-controls">
              <button onClick={active ? pause : resume}>
                {active
                  ? text("Pause", "إيقاف مؤقت")
                  : text("Resume", "استئناف")}
              </button>
              <button onClick={() => void finish()}>
                {text("Finish", "إنهاء النشاط")}
              </button>
            </div>
          )}
          {summary && (
            <section className="v21-panel track-summary">
              <h2>{text("Conditions at start", "الظروف عند البداية")}</h2>
              {summary.conditions ? (
                <p>
                  {summary.conditions.areaName} ·{" "}
                  {summary.conditions.temperatureC ?? "—"}°C ·{" "}
                  {text("Wind", "الرياح")} {summary.conditions.windKmh ?? "—"}{" "}
                  {text("km/h", "كم/س")} · VAELORA{" "}
                  {summary.conditions.score ?? "—"}/100
                  <br />
                  <small>
                    {text(
                      "Area forecast snapshot, not measured along your route.",
                      "لقطة توقعات المنطقة، وليست قياسات على طول المسار.",
                    )}
                  </small>
                </p>
              ) : (
                <p>
                  {text(
                    "No weather snapshot was available. Your recorded metrics are unaffected.",
                    "لم تتوفر لقطة للطقس. لا يؤثر ذلك على مقاييس نشاطك المسجلة.",
                  )}
                </p>
              )}
              <p role="status">
                {saving
                  ? text("Saving on this device…", "جارٍ الحفظ على الجهاز…")
                  : saved
                    ? text("Saved on this device", "محفوظ على هذا الجهاز")
                    : text("Not saved yet", "لم يُحفظ بعد")}
              </p>
              <div className="track-actions">
                {!saved && (
                  <button
                    onClick={() => void persist(summary)}
                    disabled={saving}
                  >
                    {text("Retry save", "إعادة الحفظ")}
                  </button>
                )}
                <button
                  disabled={!summary.points.length}
                  onClick={() => setExportConfirm(!exportConfirm)}
                >
                  GPX ↓
                </button>
                <button
                  onClick={() =>
                    void shareCard(summary, ar).catch(() =>
                      setNotice("share-error"),
                    )
                  }
                >
                  {text("Download share card", "تنزيل بطاقة المشاركة")}
                </button>
                <button
                  disabled={!saved || saving}
                  onClick={() => {
                    setSummary(null);
                    engine.current = null;
                    setExportConfirm(false);
                    setDeleteConfirm(false);
                    refresh();
                  }}
                >
                  {text("New activity", "نشاط جديد")}
                </button>
                <button
                  disabled={!saved || saving}
                  onClick={() => setDeleteConfirm(!deleteConfirm)}
                >
                  {text("Delete activity", "حذف النشاط")}
                </button>
              </div>
              <small>
                {text(
                  "Share cards contain metrics only, with no route or location.",
                  "تتضمن بطاقات المشاركة المقاييس فقط، دون مسار أو موقع.",
                )}
              </small>
              {exportConfirm && (
                <div className="v21-notice">
                  <p>
                    {text(
                      "GPX contains precise location history. Share it only with people you trust.",
                      "يتضمن GPX سجل مواقع دقيقًا. شاركه فقط مع من تثق بهم.",
                    )}
                  </p>
                  <button
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
                    {text("Export precise route", "تصدير المسار الدقيق")}
                  </button>
                </div>
              )}
              {deleteConfirm && (
                <div className="v21-notice">
                  <p>
                    {text(
                      "Permanently delete this activity from this device?",
                      "هل تريد حذف هذا النشاط نهائيًا من الجهاز؟",
                    )}
                  </p>
                  <button
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
                    {text("Confirm deletion", "تأكيد الحذف")}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      )}
      <p className="track-limit">
        {text(
          "Keep this page visible. Reliable background GPS while the screen is locked is not guaranteed in a Web/PWA. Leaving the app pauses recording; resume explicitly when you return. Drafts save locally every 5 seconds.",
          "أبقِ الصفحة ظاهرة. لا يُضمن استمرار GPS في الخلفية عند قفل الشاشة في تطبيقات الويب. مغادرة التطبيق توقف التسجيل مؤقتًا؛ استأنف عند العودة. يُحفظ النشاط محليًا كل 5 ثوانٍ.",
        )}
      </p>
    </section>
  );
}
