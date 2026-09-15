"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { weatherAreas } from "../data/weather-areas";
import { distanceKm, type Coordinates } from "../lib/geography";
import type { Locale } from "../lib/i18n";
import type { PlanningResponse } from "../server/recommendations/planning";
import { parseSavedAreas, type SavedArea } from "../lib/saved-areas";
const ScoreMap = dynamic(() => import("./score-map").then((m) => m.ScoreMap), {
  ssr: false,
});
export function PlanningTools({
  mode,
  locale,
  areaId,
  minutes,
  origin,
  onSelect,
}: {
  mode: "compare" | "outlook" | "map" | "saved";
  locale: Locale;
  areaId: string;
  minutes: number;
  origin: Coordinates | null;
  onSelect: (id: string) => void;
}) {
  const ar = locale === "ar",
    text = (e: string, a: string) => (ar ? a : e);
  const [ids, setIds] = useState([
      areaId,
      weatherAreas.find((a) => a.id !== areaId)!.id,
    ]),
    [activity, setActivity] = useState<"walking" | "running">("walking"),
    [data, setData] = useState<PlanningResponse | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0),
    [saved, setSaved] = useState<SavedArea[]>([]),
    [name, setName] = useState(""),
    [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("vaelora:saved-areas");
      const parsed = parseSavedAreas(stored ? JSON.parse(stored) : []);
      queueMicrotask(() => setSaved(parsed));
    } catch {
      queueMicrotask(() => setStorageError(true));
    }
  }, []);
  const key = JSON.stringify(
    mode === "map"
      ? weatherAreas.map((a) => a.id)
      : mode === "outlook"
        ? [areaId]
        : ids,
  );
  useEffect(() => {
    if (mode === "saved") return;
    const controller = new AbortController();
    queueMicrotask(() => {
      setData(null);
      setError(false);
    });
    void fetch("/api/planning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, areaIds: JSON.parse(key), minutes }),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return (await r.json()) as PlanningResponse;
      })
      .then((d) => {
        if (!controller.signal.aborted) setData(d);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [mode, key, minutes, retry]);
  function save(next: SavedArea[]) {
    try {
      const validated = parseSavedAreas(next);
      localStorage.setItem("vaelora:saved-areas", JSON.stringify(validated));
      setSaved(validated);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  const clock = (s: string) =>
    new Date(s).toLocaleTimeString(ar ? "ar-JO" : "en-GB", {
      timeZone: "Asia/Amman",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  return (
    <section className="planning-tools">
      <header>
        <p className="v2-kicker">
          {text("MORE ROOM TO MOVE", "خيارات أوسع للحركة")}
        </p>
        <h1>
          {mode === "compare"
            ? text("Compare areas", "مقارنة المناطق")
            : mode === "map"
              ? text("Scores on the map", "المؤشرات على الخريطة")
              : mode === "outlook"
                ? text("Your next three days", "أيامك الثلاثة المقبلة")
                : text("Your saved areas", "مناطقك المحفوظة")}
        </h1>
      </header>
      {mode === "saved" ? (
        <section className="v21-panel">
          <p>
            {text(
              "Save a supported area, not your exact GPS location.",
              "احفظ منطقة مدعومة، وليس موقع GPS الدقيق.",
            )}
          </p>
          <label>
            {text("Label for selected area", "تسمية المنطقة المختارة")}
            <input
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder={text(
                "Home, work, favorite…",
                "المنزل، العمل، المفضلة…",
              )}
            />
          </label>
          <button
            className="v21-primary"
            onClick={() => {
              save([
                ...saved.filter((s) => s.areaId !== areaId),
                {
                  areaId,
                  label:
                    name.trim() ||
                    weatherAreas.find((a) => a.id === areaId)!.name[locale],
                },
              ]);
              setName("");
            }}
          >
            {text("Save", "حفظ")} ·{" "}
            {weatherAreas.find((a) => a.id === areaId)!.name[locale]}
          </button>
          {storageError && (
            <p role="alert">
              {text(
                "Saved areas could not be read or saved. Existing data was not erased.",
                "تعذرت قراءة المناطق المحفوظة أو حفظها. لم نمسح البيانات الموجودة.",
              )}
            </p>
          )}
          {!saved.length && (
            <p>{text("No saved areas yet.", "لا توجد مناطق محفوظة بعد.")}</p>
          )}
          {saved.map((s) => (
            <div className="saved-area" key={s.areaId}>
              <button onClick={() => onSelect(s.areaId)}>
                <strong>{s.label}</strong>
                <span>
                  {weatherAreas.find((a) => a.id === s.areaId)!.name[locale]}
                </span>
              </button>
              <label>
                <span className="sr-only">{text("Rename", "إعادة تسمية")}</span>
                <input
                  aria-label={text("Rename ", "إعادة تسمية ") + s.label}
                  defaultValue={s.label}
                  maxLength={40}
                  onBlur={(e) => {
                    if (e.target.value.trim())
                      save(
                        saved.map((x) =>
                          x.areaId === s.areaId
                            ? { ...x, label: e.target.value.trim() }
                            : x,
                        ),
                      );
                  }}
                />
              </label>
              <button
                onClick={() => save(saved.filter((x) => x.areaId !== s.areaId))}
              >
                {text("Remove", "إزالة")}
              </button>
            </div>
          ))}
        </section>
      ) : (
        <>
          {mode === "compare" && (
            <fieldset className="compare-select">
              <legend>
                {text(
                  "Choose two or three areas",
                  "اختر منطقتين أو ثلاث مناطق",
                )}
              </legend>
              {ids.map((id, i) => (
                <label key={i}>
                  {text("Area", "المنطقة")} {i + 1}
                  <select
                    value={id}
                    onChange={(e) =>
                      setIds((old) =>
                        old.map((v, j) => (i === j ? e.target.value : v)),
                      )
                    }
                  >
                    {weatherAreas
                      .filter((a) => a.id === id || !ids.includes(a.id))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name[locale]}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
              <button
                onClick={() =>
                  setIds((old) =>
                    old.length === 3
                      ? old.slice(0, 2)
                      : [
                          ...old,
                          weatherAreas.find((a) => !old.includes(a.id))!.id,
                        ],
                  )
                }
              >
                {ids.length === 3
                  ? text("Remove third area", "إزالة المنطقة الثالثة")
                  : text("Add third area", "إضافة منطقة ثالثة")}
              </button>
            </fieldset>
          )}
          <div className="v2-segment">
            {(["walking", "running"] as const).map((a) => (
              <button
                key={a}
                aria-pressed={a === activity}
                onClick={() => setActivity(a)}
              >
                {a === "walking"
                  ? text("Walking", "المشي")
                  : text("Running", "الجري")}
              </button>
            ))}
          </div>
          <p className="v21-muted">
            {text(
              "Current-hour scores today; best-window scores on future days. Hourly forecasts, not a block-level heatmap. Place preferences apply on Home.",
              "مؤشرات الساعة الحالية لليوم، وأفضل فترة للأيام المقبلة. توقعات ساعية وليست خريطة دقيقة لكل شارع. تُطبّق تفضيلات الأماكن في الرئيسية.",
            )}
          </p>
          {!data && !error && (
            <p role="status">
              {text("Checking forecasts…", "جارٍ فحص التوقعات…")}
            </p>
          )}
          {error && (
            <div role="alert">
              <p>
                {text(
                  "Forecasts unavailable. Try again when connected.",
                  "التوقعات غير متاحة. حاول مجددًا عند الاتصال.",
                )}
              </p>
              <button onClick={() => setRetry((n) => n + 1)}>
                {text("Try again", "حاول مجددًا")}
              </button>
            </div>
          )}
          {data && mode === "map" && (
            <ScoreMap
              rows={data.rows}
              activity={activity}
              locale={locale}
              onSelect={onSelect}
            />
          )}
          <div className="compare-grid">
            {data?.rows.flatMap((row) =>
              row.days.map((d, index) => {
                const s = d[activity];
                return (
                  <article key={row.area.id + d.date} className="compare-card">
                    <span className="v2-kicker">
                      {mode === "outlook"
                        ? index === 0
                          ? text("Today", "اليوم")
                          : index === 1
                            ? text("Tomorrow", "غدًا")
                            : new Date(
                                d.date + "T12:00:00+03:00",
                              ).toLocaleDateString(ar ? "ar-JO" : "en-GB", {
                                weekday: "long",
                              })
                        : text("FORECAST AREA", "منطقة التوقعات")}
                    </span>
                    <h2>{row.area.name[locale]}</h2>
                    <strong className="compare-score">
                      {s.score ?? "—"}
                      <small>/100</small>
                    </strong>
                    <div className="compare-both">
                      <span>
                        {text("Walking", "المشي")}{" "}
                        <b>{d.walking.score ?? "—"}</b>
                      </span>
                      <span>
                        {text("Running", "الجري")}{" "}
                        <b>{d.running.score ?? "—"}</b>
                      </span>
                    </div>
                    <p>
                      {s.temperatureC ?? "—"}°C · {text("Wind", "الرياح")}{" "}
                      {s.windKmh ?? "—"} km/h
                      <br />
                      {text("Rain chance", "احتمال الهطول")}{" "}
                      {s.precipitationPercent ?? "—"}%
                    </p>
                    <p>
                      {text("Best Window", "أفضل فترة")}
                      <br />
                      <bdi>
                        {s.bestWindow
                          ? `${clock(s.bestWindow.start)}–${clock(s.bestWindow.end)}`
                          : "—"}
                      </bdi>{" "}
                      · {minutes} {text("min", "دقيقة")}
                    </p>
                    {!row.available && (
                      <p>{text("Weather unavailable", "الطقس غير متاح")}</p>
                    )}
                    {origin && (
                      <p>
                        {distanceKm(origin, row.area).toFixed(1)} km ·{" "}
                        {text("to reference point", "إلى النقطة المرجعية")}
                      </p>
                    )}
                    {mode !== "outlook" && (
                      <button onClick={() => onSelect(row.area.id)}>
                        {text("Plan here", "خطط هنا")} ↗
                      </button>
                    )}
                  </article>
                );
              }),
            )}
          </div>
        </>
      )}
    </section>
  );
}
