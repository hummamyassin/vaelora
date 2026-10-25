"use client";
import { useEffect, useRef } from "react";
import { homeCopy } from "../lib/copy/home";
import { translator, type Locale } from "../lib/i18n";

interface MeteogramHour {
  time: string;
  score: number | null;
  severity: 0 | 1 | 2 | null;
  conditions: { temperatureC?: number | null };
}
const tone = (s: MeteogramHour["severity"]) =>
  s === 0 ? "good" : s === 1 ? "fair" : s === 2 ? "poor" : "unknown";
const hourStart = (time: string) => Date.parse(`${time}:00+03:00`);

/**
 * Forecast strip in the style of a meteogram: one column per remaining hour,
 * temperature above, bar height and colour from the existing scorer's comfort
 * band, and the recommended outing bracketed. Columns are
 * real forecast hours; nothing is interpolated.
 */
export function Meteogram({
  hours,
  window,
  locale,
  activityLabel,
  clock,
}: {
  hours: readonly MeteogramHour[];
  window: { start: string; end: string } | null;
  locale: Locale;
  activityLabel: string;
  clock: (iso: string) => string;
}) {
  const c = translator(homeCopy, locale);
  const scroller = useRef<HTMLDivElement>(null);
  // Bar height is comfort, so the bracketed window is visibly the best stretch.
  const height = (s: MeteogramHour["severity"]) =>
    s === 0 ? 100 : s === 1 ? 64 : s === 2 ? 36 : 22;
  const origin = hours.length ? hourStart(hours[0].time) : 0;
  const span = window
    ? {
        from: Math.max(0, (Date.parse(window.start) - origin) / 3600000),
        to: Math.min(hours.length, (Date.parse(window.end) - origin) / 3600000),
      }
    : null;
  const inWindow = (h: MeteogramHour) =>
    !!window &&
    hourStart(h.time) < Date.parse(window.end) &&
    hourStart(h.time) + 3600000 > Date.parse(window.start);
  useEffect(() => {
    // Bring the bracketed window into view on narrow screens.
    // Only the strip scrolls; the page never moves. RTL scrollLeft runs negative.
    const box = scroller.current,
      el = box?.querySelector<HTMLElement>(".meteo-window");
    if (!box || !el || box.scrollWidth <= box.clientWidth) return;
    const target = el.offsetLeft + el.offsetWidth / 2 - box.clientWidth / 2;
    const rtl = getComputedStyle(box).direction === "rtl";
    box.scrollLeft = rtl ? target - (box.scrollWidth - box.clientWidth) : target;
  }, [window?.start, window?.end, hours.length]);
  if (!hours.length) return null;
  return (
    <figure className="meteogram">
      <figcaption className="sr-only">{c("meteogramLabel", { activity: activityLabel })}</figcaption>
      <div className="meteo-scroll" ref={scroller}>
        <div
          className="meteo-grid"
          style={{ "--cols": hours.length } as React.CSSProperties}
          aria-hidden="true"
        >
          {hours.map((h, i) => (
            <div className="meteo-col" key={h.time} data-tone={tone(h.severity)} data-in={inWindow(h) || undefined}>
              <span className="meteo-temp num">
                {typeof h.conditions.temperatureC === "number"
                  ? `${Math.round(h.conditions.temperatureC)}°`
                  : "–"}
              </span>
              <span className="meteo-track">
                <span
                  className="meteo-bar"
                  style={{ height: `${height(h.severity)}%` }}
                />
              </span>
              <span className="meteo-hour num">
                {i === 0 ? c("now") : clock(`${h.time}:00+03:00`).slice(0, 2)}
              </span>
            </div>
          ))}
          {span && span.to > span.from && (
            <span
              className="meteo-window"
              style={
                {
                  "--from": span.from,
                  "--to": span.to,
                } as React.CSSProperties
              }
            />
          )}
        </div>
      </div>
      <div className="meteo-legend" aria-hidden="true">
        <span data-tone="good">{c("legendGood")}</span>
        <span data-tone="fair">{c("legendFair")}</span>
        <span data-tone="poor">{c("legendPoor")}</span>
        {hours.some((h) => h.severity === null) && <span data-tone="unknown">{c("legendUnknown")}</span>}
      </div>
      <ol className="sr-only">
        {hours.map((h) => (
          <li key={h.time}>
            {clock(`${h.time}:00+03:00`)},{" "}
            {typeof h.conditions.temperatureC === "number" ? `${Math.round(h.conditions.temperatureC)}°C, ` : ""}
            {c(
              h.severity === 0
                ? "hourGood"
                : h.severity === 1
                  ? "hourFair"
                  : h.severity === 2
                    ? "hourPoor"
                    : "hourUnknown",
            )}
            {inWindow(h) ? `, ${c("inWindow")}` : ""}
          </li>
        ))}
      </ol>
    </figure>
  );
}
