"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconClock, IconDownload, IconElevation, IconPace, IconPhoto, IconRun, IconShare, IconWalk } from "./icons";
import type { RecordedActivity } from "../domain/tracking/activity";
import { STORY, storyModel, storyPositions, type StoryPosition } from "../domain/tracking/share-story";
import { drawStory, exportStory, loadImage, svgImage, type StoryAssets } from "../lib/share-story";
import { studioCopy } from "../lib/copy/explore";
import { translator, type Locale } from "../lib/i18n";

type Img = NonNullable<StoryAssets["mark"]>;
const PREVIEW_WIDTH = 270;

function deliver(blob: Blob, share: boolean) {
  const file = new File([blob], "vaelora-story.png", { type: "image/png" });
  if (share && navigator.share && navigator.canShare?.({ files: [file] }))
    return navigator.share({ files: [file] }).then(() => "shared" as const);
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "vaelora-story.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return Promise.resolve(share ? ("fallback" as const) : ("saved" as const));
}

/**
 * Share Studio: a 9:16 story with the route, the numbers and the V over a
 * photo the user picks. Everything happens in this browser; the photo is
 * never uploaded, sent to AI or stored.
 */
export function ShareStudio({ activity, locale }: { activity: RecordedActivity; locale: Locale }) {
  const c = translator(studioCopy, locale);
  const model = useMemo(() => storyModel(activity), [activity]);
  const [photo, setPhoto] = useState<Img | null>(null),
    [photoError, setPhotoError] = useState(false),
    [position, setPosition] = useState<StoryPosition>("upper-left"),
    [scale, setScale] = useState(1),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [assets, setAssets] = useState<Omit<StoryAssets, "photo"> | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null),
    glyphs = useRef<HTMLSpanElement>(null),
    file = useRef<HTMLInputElement>(null);

  // Glyphs come from the app's own icon set, recoloured for the story.
  useEffect(() => {
    let live = true;
    const holder = glyphs.current;
    const svg = (name: string) => holder?.querySelector<SVGSVGElement>(`[data-glyph="${name}"] svg`) ?? null;
    void Promise.all([
      loadImage("/brand/v-mark.png").catch(() => null),
      svgImage(svg("activity"), model.palette.icon),
      svgImage(svg("duration"), "#f2f4f6"),
      svgImage(svg("pace"), "#f2f4f6"),
      svgImage(svg("elevation"), "#f2f4f6"),
    ]).then(([mark, activityIcon, duration, pace, elevation]) => {
      if (live) setAssets({ mark, icons: { activity: activityIcon, duration, pace, elevation } });
    });
    return () => {
      live = false;
    };
  }, [model.palette.icon]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !assets) return;
    let live = true;
    void document.fonts.ready.then(() => {
      if (!live) return;
      const ratio = Math.min(3, window.devicePixelRatio || 1);
      el.width = Math.round(PREVIEW_WIDTH * ratio);
      el.height = Math.round(((PREVIEW_WIDTH * STORY.height) / STORY.width) * ratio);
      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(el.width / STORY.width, 0, 0, el.width / STORY.width, 0, 0);
      ctx.clearRect(0, 0, STORY.width, STORY.height);
      drawStory(ctx, model, { ...assets, photo }, position, scale);
    });
    return () => {
      live = false;
    };
  }, [assets, model, photo, position, scale]);

  async function choosePhoto(f: File | undefined) {
    if (!f) return;
    setPhotoError(false);
    const url = URL.createObjectURL(f);
    try {
      setPhoto(await loadImage(url));
    } catch {
      setPhotoError(true);
    } finally {
      URL.revokeObjectURL(url);
      if (file.current) file.current.value = "";
    }
  }
  async function exportImage(share: boolean) {
    if (!assets) return;
    setBusy(true);
    setStatus("");
    try {
      const result = await deliver(await exportStory(model, { ...assets, photo }, position, scale), share);
      setStatus(result === "shared" ? c("shared") : result === "fallback" ? c("fallback") : c("saved"));
    } catch (e) {
      setStatus(e instanceof Error && e.name === "AbortError" ? c("cancelled") : c("failed"));
    } finally {
      setBusy(false);
    }
  }
  const alt = c("previewAlt", {
    distance: model.distance,
    duration: model.duration,
    pace: model.pace ? c("paceSuffix", { pace: model.pace }) : "",
    elevation: model.elevationM !== null ? c("elevationSuffix", { m: model.elevationM }) : "",
  });

  return (
    <section className="share-studio" aria-labelledby="studio-title">
      <h2 className="mini-title" id="studio-title">
        {c("title")}
      </h2>
      <p className="section-note">{c("intro")}</p>
      <span ref={glyphs} className="studio-glyphs" aria-hidden="true">
        <span data-glyph="activity">{activity.activity === "walking" ? <IconWalk weight="fill" /> : <IconRun weight="fill" />}</span>
        <span data-glyph="duration">
          <IconClock weight="bold" />
        </span>
        <span data-glyph="pace">
          <IconPace weight="fill" />
        </span>
        <span data-glyph="elevation">
          <IconElevation weight="fill" />
        </span>
      </span>
      <div className="studio-body">
        <canvas
          ref={canvas}
          className="studio-preview"
          role="img"
          aria-label={alt}
          style={{ width: PREVIEW_WIDTH, aspectRatio: `${STORY.width} / ${STORY.height}` }}
          data-activity={activity.activity}
          data-position={position}
          data-photo={photo ? "user" : "none"}
        />
        <div className="studio-controls">
          <div className="studio-photo">
            <input
              ref={file}
              id={`studio-file-${activity.id}`}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(e) => void choosePhoto(e.target.files?.[0])}
            />
            <label htmlFor={`studio-file-${activity.id}`} className="btn btn-secondary">
              <IconPhoto aria-hidden />
              {photo ? c("change") : c("choose")}
            </label>
            {photo && (
              <button className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}>
                {c("remove")}
              </button>
            )}
          </div>
          <p className="fine">{c("photoLocal")}</p>
          {photoError && (
            <p role="alert" className="notice" data-tone="danger">
              {c("photoError")}
            </p>
          )}
          <fieldset className="filter-group">
            <legend>{c("position")}</legend>
            <div className="studio-positions" dir="ltr">
              {storyPositions.map((p) => (
                <button key={p} className="chip" data-pos={p} aria-pressed={position === p} aria-label={c(p)} title={c(p)} onClick={() => setPosition(p)}>
                  <span className="studio-pos-dot" aria-hidden="true" />
                </button>
              ))}
            </div>
          </fieldset>
          <label className="filter-group">
            <span className="filter-label">{c("size")}</span>
            <input type="range" min={0.75} max={1.25} step={0.05} value={scale} onChange={(e) => setScale(+e.target.value)} />
          </label>
          {model.elevationM === null && <p className="fine">{c("noElevation")}</p>}
          {!model.route && <p className="fine">{c("noRoute")}</p>}
          <div className="share-actions">
            <button className="btn btn-secondary" disabled={busy || !assets} onClick={() => void exportImage(false)}>
              <IconDownload aria-hidden />
              {busy ? c("preparing") : c("save")}
            </button>
            <button className="btn btn-primary" disabled={busy || !assets} onClick={() => void exportImage(true)}>
              <IconShare aria-hidden />
              {c("share")}
            </button>
          </div>
          <p className="fine">{c("privacy")}</p>
          {status && (
            <p role="status" className="share-status">
              {status}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
