"use client";
import { useState } from "react";
import { IconPin } from "./icons";
import { searchWeatherAreas } from "../data/weather-areas";
import { translator, type Locale } from "../lib/i18n";
import { shellCopy } from "../lib/copy/shell";

export const preferenceIds = ["flat", "paved", "park", "avoidHeat", "lowWind"] as const;

export function FiltersPanel({
  locale,
  activity,
  setActivity,
  minutes,
  setMinutes,
  preferences,
  setPreferences,
  hasOrigin,
  radius,
  setRadius,
  onReset,
  onDone,
}: {
  locale: Locale;
  activity: "walking" | "running";
  setActivity: (a: "walking" | "running") => void;
  minutes: number;
  setMinutes: (n: number) => void;
  preferences: string[];
  setPreferences: (fn: (old: string[]) => string[]) => void;
  hasOrigin: boolean;
  radius: number;
  setRadius: (n: number) => void;
  onReset: () => void;
  onDone: () => void;
}) {
  const c = translator(shellCopy, locale);
  return (
    <div className="filters v2-filter-content">
      <fieldset className="filter-group">
        <legend className="mini-title">{c("activity")}</legend>
        <div className="seg" role="group">
          {(["walking", "running"] as const).map((a) => (
            <button key={a} aria-pressed={activity === a} data-activity={a} onClick={() => setActivity(a)}>
              {c(a)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="filter-group">
        <legend className="mini-title">{c("duration")}</legend>
        <div className="seg" role="group">
          {[30, 60, 90].map((n) => (
            <button key={n} aria-pressed={minutes === n} onClick={() => setMinutes(n)}>
              {c("minutes", { n })}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="filter-group">
        <legend className="mini-title">{c("preferences")}</legend>
        <div className="chips">
          {preferenceIds.map((p) => (
            <button
              key={p}
              className="chip"
              aria-pressed={preferences.includes(p)}
              onClick={() =>
                setPreferences((old) => (old.includes(p) ? old.filter((x) => x !== p) : [...old, p]))
              }
            >
              {c(p)}
            </button>
          ))}
        </div>
      </fieldset>
      {hasOrigin && (
        <label className="field">
          {c("maxDistance")}
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            {[2, 5, 10].map((n) => (
              <option value={n} key={n}>
                {c("km", { n })}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="fine">{c("filtersNote")}</p>
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={onReset}>
          {c("reset")}
        </button>
        <button className="btn btn-primary" onClick={onDone}>
          {c("done")}
        </button>
      </div>
    </div>
  );
}

export function AreaPanel({
  locale,
  areaId,
  onChoose,
}: {
  locale: Locale;
  areaId: string;
  onChoose: (id: string) => void;
}) {
  const c = translator(shellCopy, locale);
  const [query, setQuery] = useState("");
  const results = searchWeatherAreas(query);
  return (
    <div className="area-panel v2-area-search">
      <label className="field" htmlFor="area-search">
        {c("areaSearch")}
        <input
          id="area-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={100}
          placeholder={c("areaPlaceholder")}
        />
      </label>
      <div className="rows">
        {results.map((a) => (
          <button key={a.id} className="row-btn" aria-pressed={a.id === areaId} onClick={() => onChoose(a.id)}>
            <IconPin aria-hidden className="row-chevron" />
            <span className="row-main">
              <span className="row-title">{a.name[locale]}</span>
              <span className="row-meta">{c("areaKind")}</span>
            </span>
          </button>
        ))}
      </div>
      {!results.length && <p className="empty-line">{c("areaNone")}</p>}
      <p className="fine">{c("areaReview")}</p>
    </div>
  );
}
