"use client";
import { useEffect, useState } from "react";
import { IconNext, IconOpen, IconRun, IconShieldOk, IconWalk } from "./icons";
import { Sheet } from "./app-dialog";
import { PersonalProgress } from "./personal-progress";
import { DataBackup } from "./data-backup";
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
import { onboardingCopy, profileCopy } from "../lib/copy/profile";
import { shown, arabicCount, translator } from "../lib/i18n";
import { BrandMark } from "./brand-mark";
const shownPace = (seconds: number | null) => shown(paceLabel(seconds));

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
    c = translator(onboardingCopy, profile.locale);
  const finish = (skip = false) => {
    try {
      save(parseProfile({ ...profile, name: skip ? "" : name, onboarding: true }));
    } catch {
      setError(true);
    }
  };
  return (
    <Sheet title="VAELORA" close={() => finish(true)} closeLabel={c("guest")} className="onboarding">
      <div className="onboarding-meta">
        <BrandMark size={72} className="onboarding-mark" />
        <button
          className="btn btn-secondary btn-sm onboarding-language"
          lang={ar ? "en" : "ar"}
          onClick={() => save({ ...profile, locale: ar ? "en" : "ar" })}
        >
          {ar ? "English" : "العربية"}
        </button>
      </div>
      <p className="fine">{c("step", { n: step + 1 })}</p>
      <h1 className="onboarding-title">{step === 0 ? c("welcome") : c("nameTitle")}</h1>
      <p className="onboarding-body">{step === 0 ? c("welcomeBody") : c("nameBody")}</p>
      {step === 1 && (
        <label className="field">
          {c("yourName")}
          <input
            autoComplete="given-name"
            maxLength={40}
            value={name}
            autoFocus
            onChange={(e) => {
              setName(e.target.value);
              setError(false);
            }}
          />
          {error && (
            <span className="field-error" role="alert">
              {c("nameError")}
            </span>
          )}
        </label>
      )}
      <button
        className="btn btn-primary btn-lg btn-block"
        onClick={() => (step === 0 ? setStep(1) : finish())}
      >
        {step === 0 ? c("continue") : c("start")}
        <IconOpen aria-hidden className="flip-rtl" />
      </button>
      <button className="btn btn-ghost btn-block product-quiet" onClick={() => finish(true)}>
        {c("skip")}
      </button>
      <p className="privacy-caption">
        <IconShieldOk aria-hidden />
        {c("privacy")}
      </p>
    </Sheet>
  );
}

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}
function InstallButton({ label, help }: { label: string; help: string }) {
  const [install, setInstall] = useState<InstallEvent | null>(null),
    [open, setOpen] = useState(false);
  useEffect(() => {
    const receive = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", receive);
    return () => window.removeEventListener("beforeinstallprompt", receive);
  }, []);
  return (
    <>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => {
          if (install) void install.prompt().then(() => setInstall(null));
          else setOpen(!open);
        }}
      >
        {label}
      </button>
      {open && <p className="fine">{help}</p>}
    </>
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
  onImported,
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
  onImported: () => void;
}) {
  const [draft, setDraft] = useState(profile),
    [message, setMessage] = useState(""),
    [confirm, setConfirm] = useState<"history" | "profile" | "all" | null>(null),
    [deleting, setDeleting] = useState(false);
  const ar = profile.locale === "ar",
    c = translator(profileCopy, profile.locale),
    totals = activityTotals(activities);
  const first = activities.length ? activities[activities.length - 1] : null;
  const date = (ms: number, opts: Intl.DateTimeFormatOptions) =>
    new Date(ms).toLocaleDateString(ar ? "ar-JO-u-nu-latn" : "en-GB", opts);
  return (
    <Sheet title={c("title")} close={close} closeLabel={c("close")} className="profile-panel" wide>
      <header className="profile-identity">
        <span className="avatar avatar-lg">{initials(profile.name)}</span>
        <div>
          <h3 className="profile-name">{profile.name || c("guest")}</h3>
          <p className="row-meta">
            {first ? c("since", { date: date(first.startedAt, { month: "long", year: "numeric" }) }) : c("local")}
          </p>
        </div>
      </header>

      <section className="profile-section" aria-labelledby="lifetime-title">
        <h3 className="mini-title" id="lifetime-title">{c("lifetime")}</h3>
        {storageError ? (
          <p role="alert" className="notice" data-tone="danger">
            {c("storageError")}
          </p>
        ) : totals.count === 0 ? (
          <div className="empty">
            <h3>{c("emptyTitle")}</h3>
            <p>{c("emptyBody")}</p>
          </div>
        ) : (
          <>
            <div className="stats profile-stats">
              <div className="stat">
                <span className="stat-value">{totals.count}</span>
                <span className="stat-label">
                  {ar ? arabicCount(totals.count, ["نشاط", "نشاطان", "أنشطة", "نشاطًا"]) : c("activities")}
                </span>
              </div>
              <div className="stat">
                <span className="stat-value">{(totals.distanceM / 1000).toFixed(1)}</span>
                <span className="stat-label">{c("distance")}</span>
              </div>
              <div className="stat">
                <span className="stat-value">
                  <bdi>{durationLabel(totals.activeMs)}</bdi>
                </span>
                <span className="stat-label">{c("activeTime")}</span>
              </div>
            </div>
            <div className="sport-grid">
              {(["walking", "running"] as const).map((kind) => {
                const s = activityTotals(activities, kind);
                return (
                  <div className="sport-cell" data-kind={kind} key={kind}>
                    <span className="sport-name">
                      <span className="activity-glyph" data-kind={kind} aria-hidden="true">
                        {kind === "walking" ? <IconWalk weight="bold" /> : <IconRun weight="bold" />}
                      </span>
                      {c(kind)}
                    </span>
                    <span className="sport-line num">
                      <bdi>
                        {c("sportLine", {
                          km: (s.distanceM / 1000).toFixed(2),
                          pace: shownPace(s.paceSeconds),
                        })}
                      </bdi>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {!storageError && activities.length > 0 && (
        <PersonalProgress activities={activities} locale={profile.locale} />
      )}

      {!storageError && activities.length > 0 && (
        <section className="profile-section" aria-labelledby="recent-title">
          <h3 className="mini-title" id="recent-title">{c("recent")}</h3>
          <div className="rows">
            {activities.slice(0, 4).map((a) => (
              <button className="row-btn profile-recent" key={a.id} onClick={() => onActivity(a.id)}>
                <span className="activity-glyph" data-kind={a.activity} aria-hidden="true">
                  {a.activity === "walking" ? <IconWalk weight="bold" /> : <IconRun weight="bold" />}
                </span>
                <span className="row-main">
                  <span className="sr-only">{c(a.activity)}</span>
                  <span className="row-title num">
                    <bdi>{(a.distanceM / 1000).toFixed(2)} {ar ? "كم" : "km"}</bdi>
                  </span>
                  <span className="row-meta">
                    {date(a.startedAt, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                    <bdi className="num">{durationLabel(a.activeMs)}</bdi>
                  </span>
                </span>
                <IconNext className="row-chevron flip-rtl" aria-hidden />
              </button>
            ))}
          </div>
          <PersonalProgress activities={activities} locale={profile.locale} mode="bests" />
        </section>
      )}

      <section className="profile-section">
        <div className="rows">
          <button className="row-btn" onClick={onPlaces}>
            <span className="row-main">
              <span className="row-title">{c("savedAreas")}</span>
              <span className="row-meta">{c("savedAreasNote")}</span>
            </span>
            <IconNext className="row-chevron flip-rtl" aria-hidden />
          </button>
        </div>
      </section>

      <section className="profile-section" aria-labelledby="settings-title">
        <h3 className="mini-title" id="settings-title">{c("settings")}</h3>
        <form
          className="settings-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              save(parseProfile(draft));
              setMessage(c("saved"));
            } catch {
              setMessage(c("nameError"));
            }
          }}
        >
          <label className="field">
            {c("name")}
            <input value={draft.name} maxLength={40} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <div className="field-grid">
            <label className="field">
              {c("preferredActivity")}
              <select
                value={draft.activity}
                onChange={(e) => setDraft({ ...draft, activity: e.target.value as GuestProfile["activity"] })}
              >
                <option value="walking">{c("walking")}</option>
                <option value="running">{c("running")}</option>
              </select>
            </label>
            <label className="field">
              {c("preferredDuration")}
              <select
                value={draft.minutes}
                onChange={(e) =>
                  setDraft({ ...draft, minutes: Number(e.target.value) as GuestProfile["minutes"] })
                }
              >
                {[30, 60, 90].map((n) => (
                  <option key={n} value={n}>
                    {c("minutes", { n })}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              {c("language")}
              <select
                value={draft.locale}
                onChange={(e) => setDraft({ ...draft, locale: e.target.value as GuestProfile["locale"] })}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </label>
            <label className="field">
              {c("appearance")}
              <select
                value={draft.theme}
                onChange={(e) => setDraft({ ...draft, theme: e.target.value as GuestProfile["theme"] })}
              >
                <option value="system">{c("system")}</option>
                <option value="light">{c("light")}</option>
                <option value="dark">{c("dark")}</option>
              </select>
            </label>
          </div>
          <p className="fine">{c("units")}</p>
          <button className="btn btn-primary profile-save" type="submit">
            {c("save")}
          </button>
          <p role="status" className="row-meta">
            {message}
          </p>
        </form>
      </section>

      <section className="profile-section" aria-labelledby="data-title">
        <h3 className="mini-title" id="data-title">{c("data")}</h3>
        <DataBackup locale={profile.locale} busy={busy} onImported={onImported} />
        <details className="disclosure profile-privacy">
          <summary>{c("privacy")}</summary>
          <div className="disclosure-body">
            <p>{c("privacyBody")}</p>
            {busy && <p role="status">{c("busyClear")}</p>}
            <div className="privacy-actions">
              {(["history", "profile", "all"] as const).map((k) => (
                <button
                  key={k}
                  className="btn btn-danger btn-sm"
                  disabled={busy || deleting}
                  onClick={() => setConfirm(k)}
                >
                  {k === "history" ? c("clearHistory") : k === "profile" ? c("clearProfile") : c("clearAll")}
                </button>
              ))}
            </div>
            {confirm && (
              <div className="delete-confirm notice" data-tone="danger" role="group" aria-label={c("confirmDelete")}>
                <p>
                  {confirm === "history"
                    ? c("confirmHistory")
                    : confirm === "profile"
                      ? c("confirmProfile")
                      : c("confirmAll")}
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await onClear(confirm);
                      setConfirm(null);
                    } catch {
                      setMessage(c("clearFailed"));
                    } finally {
                      setDeleting(false);
                    }
                  }}
                >
                  {c("confirmDelete")}
                </button>
                <button className="btn btn-ghost btn-sm" disabled={deleting} onClick={() => setConfirm(null)}>
                  {c("cancel")}
                </button>
              </div>
            )}
          </div>
        </details>
        <details className="disclosure">
          <summary>{c("about")}</summary>
          <div className="disclosure-body">
            <p>{c("aboutBody")}</p>
            <InstallButton label={c("install")} help={c("installHelp")} />
          </div>
        </details>
      </section>
    </Sheet>
  );
}
