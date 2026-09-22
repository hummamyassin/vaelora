"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Navigation,
  ShieldCheck,
  Footprints,
  Activity,
} from "lucide-react";
import { AppDialog } from "./app-dialog";
import {
  activityTotals,
  initials,
  parseProfile,
  type GuestProfile,
} from "../lib/guest-profile";
import {
  durationLabel,
  paceLabel,
  type RecordedActivity,
} from "../domain/tracking/activity";
export function Onboarding({
  profile,
  save,
}: {
  profile: GuestProfile;
  save: (p: GuestProfile) => void;
}) {
  const [step, setStep] = useState(0),
    [name, setName] = useState(""),
    [error, setError] = useState(false);
  const ar = profile.locale === "ar",
    t = (en: string, arabic: string) => (ar ? arabic : en);
  const finish = (skip = false) => {
    try {
      save(
        parseProfile({ ...profile, name: skip ? "" : name, onboarding: true }),
      );
    } catch {
      setError(true);
    }
  };
  return (
    <AppDialog
      title="VAELORA"
      close={() => finish(true)}
      closeLabel={t("Continue as guest", "المتابعة كضيف")}
      className="onboarding"
    >
      <button
        className="onboarding-language"
        onClick={() => save({ ...profile, locale: ar ? "en" : "ar" })}
      >
        {ar ? "English" : "العربية"}
      </button>
      <div className="onboarding-mark">
        <Navigation size={42} />
      </div>
      <p className="eyebrow">
        {t("Your outdoors. Your rhythm.", "وقتك في الخارج. بإيقاعك.")}
      </p>
      <h1>
        {step === 0
          ? t(
              "Plan it. Track it. Make it yours.",
              "خطّط لنشاطك. تتبّع حركتك. انطلق بطريقتك.",
            )
          : t("What should we call you?", "بماذا تود أن نناديك؟")}
      </h1>
      <p>
        {step === 0
          ? t(
              "Find your moment outside. Record every walk and run, with weather intelligence on your side.",
              "اختر الوقت المناسب للخروج وسجّل مشيك وجريك بمساعدة توقعات الطقس.",
            )
          : t(
              "Just a name, saved on this device. No account needed.",
              "اسم محفوظ على هذا الجهاز فقط. لا تحتاج إلى حساب.",
            )}
      </p>
      {step === 1 && (
        <label className="profile-field">
          {t("Your name", "اسمك")}
          <input
            autoComplete="given-name"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      )}
      {error && (
        <p role="alert">
          {t(
            "Use up to 40 visible characters.",
            "استخدم اسمًا واضحًا لا يتجاوز 40 حرفًا.",
          )}
        </p>
      )}
      <button
        className="product-primary"
        onClick={() => (step === 0 ? setStep(1) : finish())}
      >
        {t("Continue", "متابعة")}
        <ArrowUpRight size={20} />
      </button>
      <button className="product-quiet" onClick={() => finish(true)}>
        {t("Skip for now", "تخطي الآن")}
      </button>
      <p className="privacy-caption">
        <ShieldCheck size={16} />
        {t(
          "Your routes stay on this device.",
          "تبقى مساراتك محفوظة على هذا الجهاز.",
        )}
      </p>
    </AppDialog>
  );
}
export function ProfilePanel({
  profile,
  save,
  close,
  activities,
  storageError,
  busy,
  onPlaces,
  onActivity,
  onClear,
}: {
  profile: GuestProfile;
  save: (p: GuestProfile) => void;
  close: () => void;
  activities: RecordedActivity[];
  storageError: boolean;
  busy: boolean;
  onPlaces: () => void;
  onActivity: (id: string) => void;
  onClear: (kind: "history" | "profile" | "all") => Promise<void>;
}) {
  const [draft, setDraft] = useState(profile),
    [message, setMessage] = useState(""),
    [confirm, setConfirm] = useState<"history" | "profile" | "all" | null>(
      null,
    ),
    [deleting, setDeleting] = useState(false);
  const ar = profile.locale === "ar",
    t = (en: string, arabic: string) => (ar ? arabic : en),
    totals = activityTotals(activities);
  return (
    <AppDialog
      title={t("Your space", "مساحتك")}
      close={close}
      closeLabel={t("Close profile", "إغلاق الملف الشخصي")}
      className="profile-panel"
    >
      <div className="profile-identity">
        <span className="profile-avatar">{initials(profile.name)}</span>
        <div>
          <h3>{profile.name || t("Guest", "ضيف")}</h3>
          <p>
            {t(
              "Local profile · This device only",
              "ملف محلي · على هذا الجهاز فقط",
            )}
          </p>
        </div>
      </div>
      <section className="profile-section">
        <h3>{t("Your movement", "نشاطك بالأرقام")}</h3>
        {storageError ? (
          <p role="alert">
            {t(
              "Activity storage unavailable. Stats cannot be loaded.",
              "تعذّر الوصول إلى الأنشطة. الإحصاءات غير متاحة.",
            )}
          </p>
        ) : totals.count === 0 ? (
          <div className="profile-empty">
            <Footprints size={28} />
            <h4>
              {t(
                "Your next chapter starts outside.",
                "خطوتك المقبلة تبدأ في الخارج.",
              )}
            </h4>
            <p>
              {t(
                "Record a walk or run. Your distance, time and progress will appear here.",
                "سجّل مشيًا أو جريًا لتجد هنا مسافتك ووقتك وتقدّمك.",
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="profile-stats">
              <div>
                <strong>{totals.count}</strong>
                <span>{t("Activities", "أنشطة")}</span>
              </div>
              <div>
                <strong>{(totals.distanceM / 1000).toFixed(1)}</strong>
                <span>{t("Kilometres", "كيلومتر")}</span>
              </div>
              <div>
                <strong>
                  <bdi>{durationLabel(totals.activeMs)}</bdi>
                </strong>
                <span>{t("Active time", "الوقت النشط")}</span>
              </div>
            </div>
            {(["walking", "running"] as const).map((kind) => {
              const s = activityTotals(activities, kind);
              return (
                <div className="profile-sport" key={kind}>
                  {kind === "walking" ? (
                    <Footprints size={20} />
                  ) : (
                    <Activity size={20} />
                  )}
                  <span>
                    {kind === "walking"
                      ? t("Walking", "المشي")
                      : t("Running", "الجري")}
                  </span>
                  <bdi>
                    {(s.distanceM / 1000).toFixed(2)} {t("km", "كم")}
                  </bdi>
                  <span>
                    <bdi>{paceLabel(s.paceSeconds)}</bdi>{" "}
                    {t("min/km", "دقيقة/كم")}
                  </span>
                </div>
              );
            })}
            <h4>{t("Recent activities", "الأنشطة الأخيرة")}</h4>
            {activities.length === 0 ? (
              <p>
                {t(
                  "Your first activity starts a new story.",
                  "ابدأ نشاطك الأول وسجّل خطواتك.",
                )}
              </p>
            ) : (
              activities.slice(0, 3).map((a) => (
                <button
                  className="profile-recent"
                  key={a.id}
                  onClick={() => onActivity(a.id)}
                >
                  <span>
                    {a.activity === "walking"
                      ? t("Walking", "المشي")
                      : t("Running", "الجري")}{" "}
                    ·{" "}
                    {new Date(a.startedAt).toLocaleDateString(
                      ar ? "ar-JO" : "en-GB",
                    )}
                  </span>
                  <strong>
                    {(a.distanceM / 1000).toFixed(2)} {t("km", "كم")}
                  </strong>
                  <ArrowUpRight size={18} />
                </button>
              ))
            )}
          </>
        )}
      </section>
      <button className="profile-recent" onClick={onPlaces}>
        {t("Saved Areas", "المناطق المحفوظة")}
        <ArrowUpRight size={18} />
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            save(parseProfile(draft));
            setMessage(
              t(
                "Preferences saved on this device.",
                "حُفظت التفضيلات على هذا الجهاز.",
              ),
            );
          } catch {
            setMessage(
              t(
                "Enter a valid name (up to 40 characters).",
                "أدخل اسمًا صالحًا لا يتجاوز 40 حرفًا.",
              ),
            );
          }
        }}
      >
        <details className="profile-preference">
          <summary>
            {t("Profile & activity preferences", "الملف وتفضيلات النشاط")}
          </summary>
          <label className="profile-field">
            {t("Display name", "الاسم")}
            <input
              value={draft.name}
              maxLength={40}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <div className="profile-grid">
            <label className="profile-field">
              {t("Preferred activity", "النشاط المفضّل")}
              <select
                aria-label={t("Preferred activity", "النشاط المفضّل")}
                value={draft.activity}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    activity: e.target.value as GuestProfile["activity"],
                  })
                }
              >
                <option value="walking">{t("Walking", "المشي")}</option>
                <option value="running">{t("Running", "الجري")}</option>
              </select>
            </label>
            <label className="profile-field">
              {t("Preferred duration", "المدة المفضّلة")}
              <select
                aria-label={t("Preferred duration", "المدة المفضّلة")}
                value={draft.minutes}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    minutes: Number(e.target.value) as GuestProfile["minutes"],
                  })
                }
              >
                {[30, 60, 90].map((n) => (
                  <option key={n} value={n}>
                    {n} {t("min", "دقيقة")}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
        <details className="profile-preference">
          <summary>{t("Language & units", "اللغة والوحدات")}</summary>
          <label className="profile-field">
            {t("Language", "اللغة")}
            <select
              aria-label={t("Language", "اللغة")}
              value={draft.locale}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  locale: e.target.value as GuestProfile["locale"],
                })
              }
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          <p className="profile-muted">
            {t(
              "Metric units · kilometres, minutes and kilometres/hour",
              "الوحدات المترية · كيلومتر، دقيقة، كيلومتر/ساعة",
            )}
          </p>
        </details>
        <details className="profile-preference">
          <summary>{t("Appearance", "المظهر")}</summary>{" "}
          <label className="profile-field">
            {t("Appearance", "المظهر")}
            <select
              aria-label={t("Appearance", "المظهر")}
              value={draft.theme}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  theme: e.target.value as GuestProfile["theme"],
                })
              }
            >
              <option value="system">{t("System", "النظام")}</option>
              <option value="light">{t("Light", "فاتح")}</option>
              <option value="dark">{t("Dark", "داكن")}</option>
            </select>
          </label>
        </details>
        <button className="profile-save" type="submit">
          {t("Save preferences", "حفظ التفضيلات")}
        </button>
        <p role="status">{message}</p>
      </form>
      <details className="profile-preference profile-privacy">
        <summary>{t("Privacy & data", "الخصوصية والبيانات")}</summary>
        <p>
          {t(
            "Your profile and activities are stored in this browser, without cloud sync. Routes are not sent to AI. Exporting GPX reveals precise location history. Clearing browser storage removes your data.",
            "يُحفظ ملفك وأنشطتك في هذا المتصفح دون مزامنة سحابية. لا تُرسل المسارات إلى الذكاء الاصطناعي. يكشف تصدير GPX سجل موقعك الدقيق. يؤدي مسح تخزين المتصفح إلى حذف بياناتك.",
          )}
        </p>
        {busy && (
          <p role="status">
            {t(
              "Finish your current activity before clearing data.",
              "أنه نشاطك الحالي قبل مسح البيانات.",
            )}
          </p>
        )}
        <div className="privacy-actions">
          {(["history", "profile", "all"] as const).map((k) => (
            <button
              key={k}
              disabled={busy || deleting}
              onClick={() => setConfirm(k)}
            >
              {k === "history"
                ? t("Clear activity history", "مسح سجل الأنشطة")
                : k === "profile"
                  ? t("Clear profile & preferences", "مسح الملف والتفضيلات")
                  : t(
                      "Reset VAELORA local data",
                      "مسح جميع بيانات VAELORA المحلية",
                    )}
            </button>
          ))}
        </div>
        {confirm && (
          <div
            className="delete-confirm"
            role="group"
            aria-label={t("Confirm deletion", "تأكيد الحذف")}
          >
            <p>
              {confirm === "history"
                ? t(
                    "Delete all completed and unfinished activities? This cannot be undone.",
                    "حذف جميع الأنشطة المكتملة وغير المكتملة؟ لا يمكن التراجع.",
                  )
                : confirm === "profile"
                  ? t(
                      "Reset your profile and preferences? Activities and saved areas will remain.",
                      "مسح ملفك وتفضيلاتك؟ ستبقى الأنشطة والمناطق المحفوظة.",
                    )
                  : t(
                      "Delete your profile, preferences, saved areas and all activities? This cannot be undone.",
                      "حذف ملفك وتفضيلاتك ومناطقك المحفوظة وجميع الأنشطة؟ لا يمكن التراجع.",
                    )}
            </p>
            <button
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await onClear(confirm);
                  setConfirm(null);
                } catch {
                  setMessage(
                    t(
                      "Data could not be cleared. Please retry.",
                      "تعذّر مسح البيانات. حاول مجددًا.",
                    ),
                  );
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {t("Confirm deletion", "تأكيد الحذف")}
            </button>
            <button disabled={deleting} onClick={() => setConfirm(null)}>
              {t("Cancel", "إلغاء")}
            </button>
          </div>
        )}
      </details>
      <details className="profile-preference">
        <summary>{t("About VAELORA", "عن VAELORA")}</summary>
        <p className="profile-muted">
          {t(
            "Weather-aware walking and running. Made for your time outside in Greater Amman.",
            "مشي وجري تراعي خططهما الطقس، لوقتك في الخارج ضمن عمّان الكبرى.",
          )}
        </p>
        <p className="profile-muted">
          VAELORA 2.2.1 · {t("Plan · Track · Analyze", "خطّط · تتبّع · حلّل")}
        </p>
      </details>
    </AppDialog>
  );
}
