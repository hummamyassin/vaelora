"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, RefreshCw, Trash2 } from "lucide-react";
import { weatherAreas } from "../data/weather-areas";
import { distanceKm, type Coordinates } from "../lib/geography";
import { numberText, translator, type Locale } from "../lib/i18n";
import { toolsCopy } from "../lib/copy/tools";
import type { PlanningResponse } from "../server/recommendations/planning";
import { parseSavedAreas, type SavedArea } from "../lib/saved-areas";
const ScoreMap = dynamic(() => import("./score-map").then((m) => m.ScoreMap), {
  ssr: false,
});
const tone = (s: number | null | undefined) =>
  s == null ? "unknown" : s >= 80 ? "good" : s >= 60 ? "fair" : "poor";

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
    c = translator(toolsCopy, locale);
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
    new Date(s).toLocaleTimeString(ar ? "ar-JO-u-nu-latn" : "en-GB", {
      timeZone: "Asia/Amman",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  const areaLabel = (id: string) => weatherAreas.find((a) => a.id === id)!.name[locale];
  const title = mode === "compare" ? c("compare") : mode === "map" ? c("map") : mode === "outlook" ? c("outlook") : c("saved");
  const note =
    mode === "compare" ? c("compareNote") : mode === "map" ? c("mapNote") : mode === "outlook" ? c("outlookNote") : c("savedNote");
  return (
    <section className="planning-tools" data-mode={mode} aria-labelledby="tools-title">
      <header className="screen-head tools-head">
        <div>
          <h1 className="screen-title" id="tools-title">
            {title}
          </h1>
          <p className="screen-lede">{note}</p>
        </div>
      </header>
      {mode === "saved" ? (
        <section className="saved-tool">
          <form
            className="saved-form"
            onSubmit={(e) => {
              e.preventDefault();
              save([
                ...saved.filter((s) => s.areaId !== areaId),
                { areaId, label: name.trim() || areaLabel(areaId) },
              ]);
              setName("");
            }}
          >
            <label className="field">
              {c("label", { area: areaLabel(areaId) })}
              <input
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                placeholder={c("labelPlaceholder")}
              />
            </label>
            <button className="btn btn-primary" type="submit">
              {c("save", { area: areaLabel(areaId) })}
            </button>
          </form>
          {storageError && (
            <p role="alert" className="notice" data-tone="danger">
              {c("storageError")}
            </p>
          )}
          {!saved.length ? (
            <p className="empty-line">{c("none")}</p>
          ) : (
            <div className="rows">
              {saved.map((s) => (
                <div className="row saved-area" key={s.areaId}>
                  <button className="row-main saved-open" onClick={() => onSelect(s.areaId)}>
                    <span className="row-title">{s.label}</span>
                    <span className="row-meta">{areaLabel(s.areaId)}</span>
                  </button>
                  <label className="saved-rename">
                    <span className="sr-only">{c("rename", { label: s.label })}</span>
                    <input
                      className="input"
                      aria-label={c("rename", { label: s.label })}
                      defaultValue={s.label}
                      maxLength={40}
                      onBlur={(e) => {
                        if (e.target.value.trim())
                          save(
                            saved.map((x) =>
                              x.areaId === s.areaId ? { ...x, label: e.target.value.trim() } : x,
                            ),
                          );
                      }}
                    />
                  </label>
                  <button
                    className="icon-btn"
                    aria-label={`${c("remove")} ${s.label}`}
                    onClick={() => save(saved.filter((x) => x.areaId !== s.areaId))}
                  >
                    <Trash2 aria-hidden size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="tools-controls">
            {mode === "compare" && (
              <fieldset className="compare-select">
                <legend className="sr-only">{c("chooseAreas")}</legend>
                {ids.map((id, i) => (
                  <label className="field" key={i}>
                    {c("area", { n: i + 1 })}
                    <select
                      value={id}
                      onChange={(e) => setIds((old) => old.map((v, j) => (i === j ? e.target.value : v)))}
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
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setIds((old) =>
                      old.length === 3
                        ? old.slice(0, 2)
                        : [...old, weatherAreas.find((a) => !old.includes(a.id))!.id],
                    )
                  }
                >
                  {ids.length === 3 ? c("removeThird") : c("addThird")}
                </button>
              </fieldset>
            )}
            <div className="seg" role="group" aria-label={c("walking")}>
              {(["walking", "running"] as const).map((a) => (
                <button key={a} aria-pressed={a === activity} onClick={() => setActivity(a)}>
                  {a === "walking" ? c("walking") : c("running")}
                </button>
              ))}
            </div>
          </div>
          {!data && !error && (
            <div className="compare-grid" role="status" aria-label={c("checking")}>
              {[0, 1].map((i) => (
                <span className="skeleton skeleton-card" key={i} />
              ))}
            </div>
          )}
          {error && (
            <div role="alert" className="notice" data-tone="danger">
              <p>{c("failed")}</p>
              <button className="btn btn-secondary btn-sm" onClick={() => setRetry((n) => n + 1)}>
                <RefreshCw aria-hidden />
                {c("tryAgain")}
              </button>
            </div>
          )}
          {data && mode === "map" && (
            <div className="map-stage">
              <ScoreMap
                selectedAreaId={areaId}
                rows={data.rows}
                activity={activity}
                locale={locale}
                onSelect={onSelect}
              />
            </div>
          )}
          <div className="compare-grid">
            {data?.rows.flatMap((row) =>
              row.days.map((d, index) => {
                const s = d[activity];
                return (
                  <article key={row.area.id + d.date} className="compare-card" data-tone={tone(s.score)}>
                    <header className="compare-head">
                      <span className="row-meta">
                        {mode === "outlook"
                          ? index === 0
                            ? c("today")
                            : index === 1
                              ? c("tomorrow")
                              : new Date(d.date + "T12:00:00+03:00").toLocaleDateString(ar ? "ar-JO-u-nu-latn" : "en-GB", {
                                  weekday: "long",
                                })
                          : null}
                      </span>
                      <h2 className="compare-name">{row.area.name[locale]}</h2>
                    </header>
                    <div className="compare-score-row">
                      <strong className="compare-score num">
                        {s.score ?? "–"}
                        <small>/100</small>
                      </strong>
                      <span className="compare-both num">
                        <span>
                          {c("walking")} <b>{d.walking.score ?? "–"}</b>
                        </span>
                        <span>
                          {c("running")} <b>{d.running.score ?? "–"}</b>
                        </span>
                      </span>
                    </div>
                    <p className="row-meta num">
                      {s.temperatureC ?? "–"}°C · {c("wind", { n: s.windKmh ?? "–" })} ·{" "}
                      {c("rain", { n: s.precipitationPercent ?? "–" })}
                    </p>
                    <p className="compare-window">
                      <span className="row-meta">{c("bestWindow")}</span>
                      <bdi className="num">
                        {s.bestWindow ? `${clock(s.bestWindow.start)} - ${clock(s.bestWindow.end)}` : "–"}
                      </bdi>
                      <span className="row-meta">{c("min", { n: minutes })}</span>
                    </p>
                    {!row.available && <p className="tag" data-tone="poor">{c("unavailable")}</p>}
                    {origin && (
                      <p className="fine">
                        {c("toReference", { n: numberText(locale, distanceKm(origin, row.area), 1) })}
                      </p>
                    )}
                    {mode !== "outlook" && (
                      <button className="btn btn-secondary btn-sm" onClick={() => onSelect(row.area.id)}>
                        {c("planHere")}
                        <ArrowUpRight aria-hidden className="flip-rtl" />
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
