import {
  metrics,
  paceLabel,
  durationLabel,
  type RecordedActivity,
} from "./activity.ts";
/** Local deterministic activity Q&A. No location, summary, or route is transmitted to AI. */
export function localActivityAnswer(
  prompt: string,
  activities: RecordedActivity[],
  locale: "en" | "ar",
  now = new Date(),
): string | null {
  if (
    !/my activity today|how far did i (walk|run) today|my average pace today|نشاطي اليوم|كم (مشيت|ركضت) اليوم|متوسط وتيرتي اليوم/i.test(
      prompt,
    )
  )
    return null;
  const date = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Amman",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const kind = /\bwalk\b|مشيت/i.test(prompt)
    ? "walking"
    : /\brun\b|ركضت/i.test(prompt)
      ? "running"
      : null;
  const rows = activities.filter(
    (a) =>
      a.state === "finished" &&
      date(new Date(a.startedAt)) === date(now) &&
      (!kind || a.activity === kind),
  );
  if (!rows.length)
    return locale === "ar"
      ? "لا توجد أنشطة مكتملة مطابقة محفوظة على هذا الجهاز اليوم."
      : "No matching completed activities are saved on this device today.";
  const totals = rows.reduce(
    (v, a) => ({
      distanceM: v.distanceM + a.distanceM,
      activeMs: v.activeMs + a.activeMs,
    }),
    { distanceM: 0, activeMs: 0 },
  );
  return locale === "ar"
    ? `أنشطتك المحفوظة اليوم: ${rows.length}. المسافة ${(totals.distanceM / 1000).toFixed(2)} كم. الوقت النشط ${durationLabel(totals.activeMs)}. متوسط الوتيرة ${paceLabel(metrics(totals).averagePaceSeconds)} /كم. حُسبت الإجابة على جهازك دون إرسال بيانات النشاط.`
    : `Your saved activities today: ${rows.length}. Distance ${(totals.distanceM / 1000).toFixed(2)} km. Active time ${durationLabel(totals.activeMs)}. Average pace ${paceLabel(metrics(totals).averagePaceSeconds)} /km. Calculated on this device; no activity data was sent.`;
}
