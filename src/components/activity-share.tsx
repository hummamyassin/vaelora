"use client";
import { useState } from "react";
import { IconDownload, IconShare } from "./icons";
import type { RecordedActivity } from "../domain/tracking/activity";
import { shareModel, type ShareTemplate } from "../domain/tracking/share";
import {
  createShareImage,
  nativeShareImage,
  saveShareImage,
} from "../lib/share-image";
import { shareCopy } from "../lib/copy/track";
import { translator, type Locale } from "../lib/i18n";
import { BrandMark } from "./brand-mark";

const missing = (v: string) => (v === "—" ? "–" : v);

/** Live preview of the privacy-safe card; exports render the same model locally. */
export function ActivityShare({
  activity,
  locale,
}: {
  activity: RecordedActivity;
  locale: Locale;
}) {
  const [template, setTemplate] = useState<ShareTemplate>("map"),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const c = translator(shareCopy, locale),
    model = shareModel(activity, locale, template);
  async function exportImage(share: boolean) {
    setBusy(true);
    setStatus("");
    try {
      const blob = await createShareImage(model);
      if (share) {
        const result = await nativeShareImage(blob);
        setStatus(result === "shared" ? c("shared") : c("fallback"));
      } else {
        saveShareImage(blob);
        setStatus(c("savedImage"));
      }
    } catch (e) {
      setStatus(e instanceof Error && e.name === "AbortError" ? c("cancelled") : c("failed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="activity-share" aria-labelledby="share-title">
      <h2 className="mini-title" id="share-title">
        {c("title")}
      </h2>
      <div className="seg share-templates" role="group" aria-label={c("title")}>
        {(["map", "performance", "minimal"] as const).map((k) => (
          <button key={k} aria-pressed={template === k} onClick={() => setTemplate(k)}>
            {c(k)}
          </button>
        ))}
      </div>
      <div
        className="share-preview"
        data-template={template}
        data-route={model.routeUseful ? "route" : "metrics"}
      >
        <span className="share-head">
          <span className="share-lockup">
            <BrandMark size={24} className="share-mark" />
            <strong className="share-brand">VAELORA</strong>
          </span>
          <span className="share-activity">
            <b>{model.activity}</b>
            <span>{model.date}</span>
          </span>
        </span>
        {template !== "minimal" &&
          (model.routeUseful ? (
            <svg className="share-route" viewBox="0 0 100 100" role="img" aria-label={c("routeSketch")}>
              {model.route.map((path, i) => (
                <polyline
                  key={i}
                  points={path.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
          ) : (
            <div className="share-hidden" role="img" aria-label={c("routeHidden")}>
              {c("routeHidden")}
            </div>
          ))}
        <div className="share-primary">
          <b dir="ltr">{missing(model.distance)}</b>
          <span>{c("km")}</span>
        </div>
        <div className="share-secondary" dir="ltr">
          <span>
            <b>{model.duration}</b>
            {c("activeTime")}
          </span>
          {model.pace !== "—" && template !== "minimal" && (
            <span>
              <b>{model.pace}</b>
              {c("avgPace")}
            </span>
          )}
        </div>
        {(model.temperature != null || model.score != null) && template !== "minimal" && (
          <span className="share-conditions" dir="ltr">
            {model.temperature != null && <span>{model.temperature}°C</span>}
            {model.score != null && (
              <span
                className="share-score"
                data-tone={model.score >= 80 ? "good" : model.score >= 60 ? "fair" : "poor"}
              >
                VAELORA {model.score}/100
              </span>
            )}
          </span>
        )}
      </div>
      <p className="fine">{c("privacy")}</p>
      <div className="track-actions share-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => void exportImage(false)}>
          <IconDownload aria-hidden />
          {busy ? c("preparing") : c("save")}
        </button>
        <button className="btn btn-secondary" disabled={busy} onClick={() => void exportImage(true)}>
          <IconShare aria-hidden />
          {c("share")}
        </button>
      </div>
      <p role="status" className="row-meta">
        {status}
      </p>
    </section>
  );
}
