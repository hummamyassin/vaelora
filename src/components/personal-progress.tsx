import { personalProgress } from "../domain/tracking/progress";
import {
  durationLabel,
  paceLabel,
  type RecordedActivity,
} from "../domain/tracking/activity";
export function PersonalProgress({
  activities,
  locale,
  onOpen,
}: {
  activities: RecordedActivity[];
  locale: "en" | "ar";
  onOpen?: (id: string) => void;
}) {
  const p = personalProgress(activities),
    ar = locale === "ar",
    t = (en: string, a: string) => (ar ? a : en);
  return (
    <section className="personal-progress">
      <p className="v2-kicker">{t("KEEP YOUR RHYTHM", "حافظ على إيقاعك")}</p>
      <h2>{t("This week", "هذا الأسبوع")}</h2>
      {!activities.length ? (
        <p>
          {t(
            "Your first walk is a fresh start. Finish an activity to see your progress here — only on this device.",
            "خطوتك الأولى بداية جديدة. أكمل نشاطًا لتظهر هنا إحصاءات تقدمك، على هذا الجهاز فقط.",
          )}
        </p>
      ) : (
        <>
          <div className="progress-metrics">
            <div>
              <b>{p.week.count}</b>
              <span>{t("Activities", "أنشطة")}</span>
            </div>
            <div>
              <b>{(p.week.distanceM / 1000).toFixed(2)}</b>
              <span>{t("Kilometres", "كيلومترات")}</span>
            </div>
            <div>
              <b>{durationLabel(p.week.activeMs)}</b>
              <span>{t("Active time", "وقت نشط")}</span>
            </div>
          </div>
          {p.previous && (
            <p>
              {t("Previous full week", "الأسبوع السابق كاملًا")}:{" "}
              {p.previous.count} {t("activities", "أنشطة")} ·{" "}
              {(p.previous.distanceM / 1000).toFixed(2)} {t("km", "كم")} ·{" "}
              {durationLabel(p.previous.activeMs)}
            </p>
          )}
          <div className="progress-sports">
            {(["walking", "running"] as const).map((kind) => (
              <div key={kind}>
                <h3>
                  {kind === "walking"
                    ? t("Walking", "المشي")
                    : t("Running", "الجري")}
                </h3>
                {p[kind].paceSeconds !== null && (
                  <p>
                    {t("Weekly average pace", "متوسط الوتيرة الأسبوعي")}:{" "}
                    <bdi>
                      {paceLabel(p[kind].paceSeconds)} /{t("km", "كم")}
                    </bdi>
                  </p>
                )}
                {p[kind].longest ? (
                  <p>
                    {t("Longest this month", "الأطول هذا الشهر")}:{" "}
                    {(p[kind].longest!.distanceM / 1000).toFixed(2)}{" "}
                    {t("km", "كم")}
                  </p>
                ) : (
                  <small>
                    {t(
                      "No eligible distance recorded this month.",
                      "لا توجد مسافة مؤهلة مسجلة هذا الشهر.",
                    )}
                  </small>
                )}
              </div>
            ))}
          </div>
          {p.recent && onOpen && (
            <button onClick={() => onOpen(p.recent!.id)}>
              {t("Revisit your latest activity", "راجع نشاطك الأخير")} ↗
            </button>
          )}
        </>
      )}
    </section>
  );
}
