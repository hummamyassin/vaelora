import { ChevronRight } from "lucide-react";
import { personalProgress } from "../domain/tracking/progress";
import {
  durationLabel,
  paceLabel,
  type RecordedActivity,
} from "../domain/tracking/activity";
import { shown, arabicCount, translator, type Locale } from "../lib/i18n";
import { progressCopy } from "../lib/copy/profile";
const shownPace = (seconds: number | null) => shown(paceLabel(seconds));

const km = (m: number) => (m / 1000).toFixed(2);
const dayMs = 86400000;
const ammanDay = (ms: number) => Math.floor((ms + 10800000) / dayMs);
/** Monday-to-Sunday days of the current Amman week with the activities finished on each. */
function weekDays(activities: readonly RecordedActivity[], now = Date.now()) {
  const today = ammanDay(now),
    start = today - ((new Date(today * dayMs).getUTCDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = start + i;
    return {
      day,
      future: day > today,
      kinds: activities
        .filter((a) => a.state === "finished" && ammanDay(a.startedAt) === day)
        .map((a) => a.activity),
    };
  });
}
const activityCount = (locale: Locale, n: number) =>
  locale === "ar"
    ? `${n} ${arabicCount(n, ["نشاط", "نشاطان", "أنشطة", "نشاطًا"])}`
    : `${n} ${n === 1 ? "activity" : "activities"}`;

/** Weekly progress from finished local activities only. No streaks or badges. */
export function PersonalProgress({
  activities,
  locale,
  onOpen,
  mode = "full",
}: {
  activities: RecordedActivity[];
  locale: Locale;
  onOpen?: (id: string) => void;
  mode?: "full" | "bests";
}) {
  const p = personalProgress(activities),
    c = translator(progressCopy, locale),
    ar = locale === "ar";
  const sports = (["walking", "running"] as const).map((kind) => ({
    kind,
    ...p[kind],
  }));
  if (mode === "bests")
    return (
      <section className="progress-bests" aria-labelledby="bests-title">
        <h3 className="mini-title" id="bests-title">{c("bests")}</h3>
        <div className="sport-grid">
          {sports.map((s) => (
            <div className="sport-cell" data-kind={s.kind} key={s.kind}>
              <span className="sport-name">{c(s.kind)}</span>
              <span className="sport-line">
                {s.longest ? c("longest", { km: km(s.longest.distanceM) }) : c("noLongest")}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  const maxDistance = Math.max(1, p.walking.distanceM, p.running.distanceM);
  return (
    <section className="section progress personal-progress" aria-labelledby="progress-title">
      <div className="section-head">
        <h2 className="section-title" id="progress-title">{c("thisWeek")}</h2>
        <span className="section-note">{c("weekNote")}</span>
      </div>
      {!activities.length ? (
        <div className="empty">
          <h3>{c("emptyTitle")}</h3>
          <p>{c("emptyBody")}</p>
        </div>
      ) : (
        <>
          <div className="stats progress-metrics">
            <div className="stat">
              <span className="stat-value">{p.week.count}</span>
              <span className="stat-label">{c("activities")}</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {km(p.week.distanceM)}
                <span className="stat-unit">{c("km")}</span>
              </span>
              <span className="stat-label">{c("distance")}</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                <bdi>{durationLabel(p.week.activeMs)}</bdi>
              </span>
              <span className="stat-label">{c("activeTime")}</span>
            </div>
          </div>
          <ol className="week-stitches" aria-label={c("thisWeek")}>
            {weekDays(activities).map((d) => {
              const name = new Date(d.day * dayMs + 43200000).toLocaleDateString(ar ? "ar-JO-u-nu-latn" : "en-GB", {
                weekday: "short",
                timeZone: "UTC",
              });
              return (
                <li key={d.day} data-future={d.future || undefined} aria-label={c("weekStitch", { day: name, n: d.kinds.length })}>
                  <span className="week-stitch-marks" aria-hidden="true">
                    {d.kinds.length ? (
                      d.kinds.slice(0, 3).map((k, i) => <i key={i} data-kind={k} />)
                    ) : (
                      <i data-empty />
                    )}
                  </span>
                  <span className="week-stitch-day">{name}</span>
                </li>
              );
            })}
          </ol>
          <div className="sport-bars">
            {sports.map((s) => (
              <div className="sport-bar" data-kind={s.kind} key={s.kind}>
                <div className="sport-bar-head">
                  <span className="sport-name">{c(s.kind)}</span>
                  <span className="num">
                    <bdi>{c("weekDistance", { km: km(s.distanceM) })}</bdi>
                  </span>
                </div>
                <span className="sport-bar-track" aria-hidden="true">
                  <span style={{ width: s.distanceM > 0 ? `max(6px, ${(s.distanceM / maxDistance) * 100}%)` : 0 }} />
                </span>
                <span className="sport-line">
                  {s.paceSeconds !== null && (
                    <bdi>{c("avgPace", { pace: shownPace(s.paceSeconds) })}</bdi>
                  )}
                  {s.paceSeconds !== null && " · "}
                  {s.longest ? c("longest", { km: km(s.longest.distanceM) }) : c("noLongest")}
                </span>
              </div>
            ))}
          </div>
          {p.previous && (
            <p className="section-note">
              {c("previous", {
                count: activityCount(locale, p.previous.count),
                km: km(p.previous.distanceM),
                time: durationLabel(p.previous.activeMs),
              })}
            </p>
          )}
          {p.recent && onOpen && (
            <div className="rows progress-recent">
              <button className="row-btn" onClick={() => onOpen(p.recent!.id)}>
                <span className="row-main">
                  <span className="row-meta">{c("latest")}</span>
                  <span className="row-title">
                    {c(p.recent.activity)} ·{" "}
                    {new Date(p.recent.startedAt).toLocaleDateString(ar ? "ar-JO-u-nu-latn" : "en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </span>
                <span className="row-end num">
                  <bdi>
                    {km(p.recent.distanceM)} {c("km")}
                  </bdi>
                </span>
                <ChevronRight className="row-chevron flip-rtl" aria-hidden />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
