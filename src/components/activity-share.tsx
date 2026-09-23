"use client";
import { useState } from "react";
import type { RecordedActivity } from "../domain/tracking/activity";
import { shareModel, type ShareTemplate } from "../domain/tracking/share";
import {
  createShareImage,
  nativeShareImage,
  saveShareImage,
} from "../lib/share-image";
export function ActivityShare({
  activity,
  locale,
}: {
  activity: RecordedActivity;
  locale: "en" | "ar";
}) {
  const [template, setTemplate] = useState<ShareTemplate>("map"),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const ar = locale === "ar",
    t = (en: string, a: string) => (ar ? a : en),
    model = shareModel(activity, locale, template);
  async function exportImage(share: boolean) {
    setBusy(true);
    setStatus("");
    try {
      const blob = await createShareImage(model);
      if (share) {
        const result = await nativeShareImage(blob);
        setStatus(
          result === "shared"
            ? t("Shared", "تمت المشاركة")
            : t(
                "Sharing is unavailable here. Image downloaded instead.",
                "المشاركة غير متاحة هنا. تم تنزيل الصورة بدلًا منها.",
              ),
        );
      } else {
        saveShareImage(blob);
        setStatus(t("Image saved", "تم حفظ الصورة"));
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError")
        setStatus(t("Sharing cancelled", "أُلغيت المشاركة"));
      else
        setStatus(
          t(
            "Could not create or share the image. Try Save Image.",
            "تعذّر إنشاء الصورة أو مشاركتها. جرّب حفظ الصورة.",
          ),
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="activity-share">
      <h2>{t("Your activity, your story.", "نشاطك، قصتك.")}</h2>
      <p>
        {t(
          "The image hides a 300 m zone around both ends, including later visits. The remaining shape may still be recognizable. Your full route stays on this device.",
          "تخفي الصورة نطاق ٣٠٠ م حول البداية والنهاية، بما في ذلك المرور بهما لاحقًا. قد يبقى شكل المسار قابلًا للتعرّف. يبقى المسار الكامل على جهازك.",
        )}
      </p>
      <div className="v2-segment">
        {(["map", "performance", "minimal"] as const).map((k) => (
          <button
            key={k}
            aria-pressed={template === k}
            onClick={() => setTemplate(k)}
          >
            {k === "map"
              ? t("Map focus", "المسار")
              : k === "performance"
                ? t("Performance", "الأداء")
                : t("Minimal", "بسيط")}
          </button>
        ))}
      </div>
      <div className="share-preview" data-template={template}>
        <strong>VAELORA</strong>
        <span>{model.activity}</span>
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label={t(
            "Privacy-protected route sketch",
            "رسم المسار بعد حماية الخصوصية",
          )}
        >
          {model.route.map((path, i) => (
            <polyline
              key={i}
              points={path.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        {!model.route.length && (
          <small>
            {t("Route hidden for privacy", "المسار مخفي لحماية الخصوصية")}
          </small>
        )}
        <b dir="ltr">
          {model.distance} {t("km", "كم")}
        </b>
        {template !== "minimal" && (
          <span dir="ltr">
            {model.duration} · {model.pace} /{t("km", "كم")}
          </span>
        )}
      </div>
      <div className="track-actions">
        <button disabled={busy} onClick={() => void exportImage(false)}>
          {busy
            ? t("Preparing…", "جارٍ التجهيز…")
            : t("Save Image", "حفظ الصورة")}
        </button>
        <button disabled={busy} onClick={() => void exportImage(true)}>
          {t("Share", "مشاركة")}
        </button>
      </div>
      <p role="status">{status}</p>
    </section>
  );
}
