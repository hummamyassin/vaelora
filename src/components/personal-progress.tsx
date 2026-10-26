import { IconNext, IconRun, IconWalk } from "./icons";
import { ProgressRing } from "./score-ring";
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
/** Monday-to-Sunday days of the current Amman week with the distance finished on each, by activity. */
function weekDays(activities: readonly RecordedActivity[], now = Date.now()) {
  const today = ammanDay(now),
    start = today - ((new Date(today * dayMs).getUTCDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = start + i,
      rows = activities.filter((a) => a.state === "finished" && ammanDay(a.startedAt) === day),
      sum = (kind: "walking" | "running") =>
        rows.filter((a) => a.activity === kind).reduce((s, a) => s + a.distanceM, 0);
    return { day, today: day === today, future: day > today, count: rows.length, walking: sum("walking"), running: sum("running") };
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
  const days = weekDays(activities),
    activeDays = days.filter((d) => d.count > 0).length,
    dayMax = Math.max(1, ...days.map((d) => d.walking + d.running)),
    weekTotal = p.walking.distanceM + p.running.distanceM;
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
          <div className="progress-overview">
            <ProgressRing className="week-ring" value={activeDays / 7} label={c("activeDays", { n: activeDays })}>
              <span className="week-ring-value" aria-hidden="true">
                <b className="num">{activeDays}</b>
                <small className="num">/7</small>
              </span>
            </ProgressRing>
            <ol className="week-chart" aria-label={c("thisWeek")}>
              {days.map((d) => {
                const name = new Date(d.day * dayMs + 43200000).toLocaleDateString(ar ? "ar-JO-u-nu-latn" : "en-GB", {
                  weekday: "narrow",
                  timeZone: "UTC",
                });
                const total = d.walking + d.running;
                return (
                  <li
                    key={d.day}
                    data-today={d.today || undefined}
                    data-future={d.future || undefined}
                    aria-label={c("dayDistance", { day: name, km: km(total) })}
                  >
                    <span className="week-bar" aria-hidden="true">
                      {total > 0 ? (
                        <span className="week-bar-fill" style={{ height: `max(8%, ${(total / dayMax) * 100}%)` }}>
                          {d.running > 0 && <i data-kind="running" style={{ flexGrow: d.running }} />}
                          {d.walking > 0 && <i data-kind="walking" style={{ flexGrow: d.walking }} />}
                        </span>
                      ) : (
                        <span className="week-bar-empty" />
                      )}
                    </span>
                    <span className="week-day" aria-hidden="true">{name}</span>
                  </li>
                );
              })}
            </ol>
          </div>
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
          <div className="sport-split" aria-label={c("split")} role="group">
            {weekTotal > 0 && (
              <span className="sport-split-bar" aria-hidden="true">
                {sports.map((s) =>
                  s.distanceM > 0 ? <i key={s.kind} data-kind={s.kind} style={{ flexGrow: s.distanceM }} /> : null,
                )}
              </span>
            )}
          </div>
          <div className="sport-bars">
            {sports.map((s) => (
              <div className="sport-bar" data-kind={s.kind} key={s.kind}>
                <div className="sport-bar-head">
                  <span className="sport-name">
                    <span className="activity-glyph" data-kind={s.kind} aria-hidden="true">
                      {s.kind === "walking" ? <IconWalk weight="bold" /> : <IconRun weight="bold" />}
                    </span>
                    {c(s.kind)}
                  </span>
                  <span className="num">
                    <bdi>{c("weekDistance", { km: km(s.distanceM) })}</bdi>
                  </span>
                </div>
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
                <IconNext className="row-chevron flip-rtl" aria-hidden />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
