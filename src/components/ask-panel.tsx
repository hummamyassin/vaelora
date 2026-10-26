"use client";
import { useRef, useState, type FormEvent } from "react";
import { IconAsk, IconCheck, IconDevice, IconLock, IconSend } from "./icons";
import { ScoreRing } from "./score-ring";
import { activityAreas } from "../data/activity-areas";
import { nearestWeatherArea, weatherAreas } from "../data/weather-areas";
import { localActivityAnswer } from "../domain/tracking/summary";
import { loadActivities } from "../lib/activity-store";
import { distanceKm, type Coordinates } from "../lib/geography";
import { label, t, translator, type Locale } from "../lib/i18n";
import { askCopy, shellCopy } from "../lib/copy/shell";
import type { AgentView } from "./types";
import type { PlanSummary } from "./discovery-home";
import { Meteogram } from "./meteogram";
import { BrandMark } from "./brand-mark";

/**
 * Ask VAELORA: the single grounded agent. The model only extracts intent; the
 * engine and reviewed places answer. GPS cells and routes never reach the model.
 */
export function AskPanel({
  locale,
  areaId,
  setAreaId,
  activity,
  day,
  minutes,
  preferences,
  origin,
  radius,
  locate,
  onClearOrigin,
  onAdjust,
  plan = null,
}: {
  locale: Locale;
  areaId: string;
  setAreaId: (id: string) => void;
  activity: "walking" | "running";
  day: "today" | "tomorrow";
  minutes: number;
  preferences: string[];
  origin: Coordinates | null;
  radius: number;
  locate: () => Promise<Coordinates | null>;
  onClearOrigin: () => void;
  onAdjust: () => void;
  plan?: PlanSummary | null;
}) {
  const c = translator(askCopy, locale),
    s = translator(shellCopy, locale);
  const [prompt, setPrompt] = useState(""),
    [asked, setAsked] = useState(""),
    [answer, setAnswer] = useState<AgentView | null>(null),
    [asking, setAsking] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const area = weatherAreas.find((a) => a.id === areaId)!;
  const clock = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", {
      timeZone: "Asia/Amman",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  async function ask(e?: FormEvent) {
    e?.preventDefault();
    const question = prompt.trim();
    if (!question || asking) return;
    setAsking(true);
    setAnswer(null);
    setAsked(question);
    try {
      if (localActivityAnswer(question, [], locale) !== null) {
        setAnswer({
          status: "conditions",
          text: localActivityAnswer(question, await loadActivities(), locale)!,
          trace: [],
        });
        return;
      }
      const nearRequested = /near me|قريب(?:ًا|ا|ة)? مني|بالقرب مني/i.test(question);
      const point = nearRequested && !origin ? await locate() : origin;
      if (nearRequested && !point) return;
      const context = {
        areaId: point ? nearestWeatherArea(point)!.id : areaId,
        activity,
        day,
        minutes,
        preferences,
        ...(point
          ? {
              placeIds: activityAreas
                .filter((a) => a.verificationStatus !== "unverified" && distanceKm(point, a) <= radius)
                .map((a) => a.id),
            }
          : {}),
      };
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question, locale, context }),
      });
      const data = await response.json();
      setAnswer(data.status ? data : { status: "service-error", text: c("serviceError"), trace: [] });
    } catch {
      setAnswer({ status: "service-error", text: c("serviceError"), trace: [] });
    } finally {
      setAsking(false);
    }
  }
  const use = (text: string) => {
    setPrompt(text);
    input.current?.focus();
  };
  const failed = answer?.status.endsWith("error");
  const suggestions = [
    c("suggestWalk"),
    c("suggestRun", { area: area.name[locale] }),
    c("suggestCompare"),
  ];
  return (
    <div className="ask v2-ai">
      <p className="ask-intro">{c("intro")}</p>
      <section className="ask-plan" aria-labelledby="ask-plan-title">
        <h3 className="mini-title" id="ask-plan-title">{c("currentPlan")}</h3>
        {plan ? (
          <>
            <div className="ask-plan-head">
              <ScoreRing score={plan.score} label={c("scoreShort", { n: plan.score ?? "–" })} />
              <p className="ask-plan-line">
                <span className="ask-plan-place">{plan.place}</span>
                <strong>{plan.headline}</strong>
                {plan.window && (
                  <bdi className="num ask-plan-window">
                    {clock(plan.window.start)}–{clock(plan.window.end)}
                  </bdi>
                )}
              </p>
            </div>
            <Meteogram
              hours={plan.hours}
              window={plan.window}
              locale={locale}
              activityLabel={label(locale, activity)}
              clock={clock}
            />
          </>
        ) : (
          <p className="section-note">{c("noPlan")}</p>
        )}
      </section>
      <section className="ask-context" aria-labelledby="ask-context-title">
        <h3 className="mini-title" id="ask-context-title">{c("context")}</h3>
        <div className="ask-context-row">
          <label className="field ask-area" htmlFor="ai-reference-area">
            {c("referenceArea")}
            <select
              id="ai-reference-area"
              value={areaId}
              onChange={(e) => {
                setAreaId(e.target.value);
                onClearOrigin();
                setAnswer(null);
              }}
            >
              {weatherAreas.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name[locale]}
                </option>
              ))}
            </select>
          </label>
          <span className="ask-facts">
            <span className="tag" data-tone={activity}>{label(locale, activity)}</span>
            <span className="tag">{s("minutes", { n: minutes })}</span>
            <span className="tag">{day === "today" ? c("today") : c("tomorrowDay")}</span>
            {preferences.map((p) => (
              <span className="tag" key={p}>
                {t(locale, p as "flat")}
              </span>
            ))}
          </span>
        </div>
        <p className="ask-privacy">
          <IconLock aria-hidden />
          {c("privacy")}
        </p>
      </section>
      <form className="ask-form" onSubmit={ask} aria-busy={asking}>
        <label className="sr-only" htmlFor="v2-prompt">
          {c("yourQuestion")}
        </label>
        <textarea
          id="v2-prompt"
          ref={input}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void ask();
            }
          }}
          maxLength={2000}
          rows={2}
          placeholder={c("placeholder")}
        />
        <button className="btn btn-primary ask-send ai-send" disabled={asking || !prompt.trim()} aria-label={c("send")}>
          <IconSend aria-hidden weight="bold" />
          <span className="ask-send-label">{asking ? c("checking") : c("send")}</span>
        </button>
      </form>
      {!answer && !asking && (
        <section className="ask-suggestions" aria-labelledby="ask-suggest-title">
          <h3 className="mini-title" id="ask-suggest-title">{c("suggestions")}</h3>
          <div className="ask-chips v2-suggestions">
            {suggestions.map((p) => (
              <button key={p} className="prompt-chip" onClick={() => use(p)}>
                <IconAsk aria-hidden weight="fill" />
                {p}
              </button>
            ))}
            <button className="prompt-chip ai-local-action" onClick={() => use(c("localPrompt"))}>
              <IconDevice aria-hidden className="ask-local-icon" />
              <span>
                {c("suggestLocal")}
                <small>{c("localNote")}</small>
              </span>
            </button>
          </div>
        </section>
      )}
      {asking && (
        <div className="ask-progress ai-progress" role="status">
          <span className="ask-stitches" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          {c("progress")}
        </div>
      )}
      {answer && (
        <article
          className="ask-answer v2-ai-answer"
          data-status={answer.status}
          role={failed ? "alert" : "status"}
        >
          {asked && <p className="ask-question">{asked}</p>}
          <h3 className="ask-answer-title">
            <BrandMark size={22} className="ask-answer-mark" />
            {failed ? c("failed") : answer.status === "clarification" ? c("clarify") : c("answer")}
          </h3>
          <p className="ask-answer-text">{answer.text || c("serviceError")}</p>
          {!failed && !!answer.matches?.length && (
            <div className="ask-places">
              <span className="row-meta">{c("places")}</span>
              <span className="chips">
                {answer.matches.map((m) => (
                  <span className="tag" key={m.areaId}>
                    {m.name}
                  </span>
                ))}
              </span>
            </div>
          )}
          {answer.trace?.length > 0 && (
            <details className="disclosure ask-trace">
              <summary>{c("checked")}</summary>
              <ol className="trace-list">
                {answer.trace.map((item, i) => (
                  <li key={i}>
                    <IconCheck aria-hidden weight="bold" />
                    <span>{label(locale, item.action)}</span>
                    {"count" in item && typeof item.count === "number" && <span className="num trace-count">{item.count}</span>}
                  </li>
                ))}
              </ol>
            </details>
          )}
          {!failed && (
            <div className="ask-next ai-recovery" aria-label={c("nextSteps")}>
              <button className="chip" onClick={() => use(c("tomorrowPrompt", { area: area.name[locale] }))}>
                {c("tomorrow")}
              </button>
              <button className="chip" onClick={() => document.getElementById("ai-reference-area")?.focus()}>
                {c("otherArea")}
              </button>
              <button className="chip" onClick={onAdjust}>
                {c("adjust")}
              </button>
            </div>
          )}
        </article>
      )}
      <p className="fine">{c("rule")}</p>
    </div>
  );
}
