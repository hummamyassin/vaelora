"use client";
import Image from "next/image";
import { useState } from "react";
import { MapPin, Trees, Building2, Navigation } from "lucide-react";
import { locationPhotos } from "../lib/location-photos";
import { label, t, type Locale } from "../lib/i18n";

/** Key by area ID at call sites so loading/failure state cannot leak between places. */
export function LocationPhoto({ areaId, locale, hero = false, name, environment }: { areaId: string; locale: Locale; hero?: boolean; name?: string; environment?: string }) {
  const photo = locationPhotos[areaId];
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const available = !!photo && state !== "failed";
  const AreaIcon = environment === "park" || environment === "woodland" ? Trees : environment === "urban" ? Building2 : MapPin;
  return <span className={`location-photo ${hero ? "hero-photo" : ""}`} data-state={available ? state : "fallback"}>
    {available ? <>
      <Image src={photo.src} alt={photo.alt[locale]} fill sizes={hero ? "100vw" : "(max-width: 1000px) calc(100vw - 64px), 600px"} loading={hero ? "eager" : "lazy"} fetchPriority={hero ? "high" : "auto"} style={{ objectFit: "cover", objectPosition: photo.position }} onLoad={() => setState("loaded")} onError={() => setState("failed")} />
      {state === "loading" && <span className="photo-loading">{t(locale, "photoLoading")}</span>}
    </> : <span className="photo-fallback area-identity">
      <svg className="identity-contours" viewBox="0 0 600 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="currentColor"><path d="M230-60C90 75 475 40 350 280M260-60C120 75 505 40 380 280M290-60C150 75 535 40 410 280M320-60C180 75 565 40 440 280M350-60C210 75 595 40 470 280M380-60C240 75 625 40 500 280M410-60C270 75 655 40 530 280M440-60C300 75 685 40 560 280"/></g></svg>
      <span className="identity-category"><AreaIcon size={19} aria-hidden="true"/>{environment && environment !== "unknown" ? label(locale, environment) : t(locale,"areaProfile")}<Navigation size={14} aria-hidden="true"/></span>
      <strong>{name ?? t(locale,"brand")}</strong>
      <small>{t(locale,"photoNeutral")}</small>
      {photo && <span className="identity-error">{t(locale,"photoFailed")}</span>}
    </span>}
  </span>;
}

export function PhotoCredit({ areaId, locale }: { areaId: string; locale: Locale }) {
  const photo = locationPhotos[areaId];
  if (!photo) return null;
  return <details className="photo-credit"><summary>{t(locale, "photoCredit")}</summary><p><a href={photo.source} target="_blank" rel="noreferrer">{t(locale, "photoSource")}</a> · <bdi>{photo.author}</bdi> · <a href={photo.licenseUrl} target="_blank" rel="noreferrer"><bdi>{photo.license}</bdi></a></p><p>{t(locale, "photoChanges")}</p><p>{t(locale, "photoHistorical")}</p></details>;
}

export function HeroPhoto({ locale }: { locale: Locale }) {
  return <div className="hero-photography"><LocationPhoto areaId="king-hussein-park" locale={locale} hero/><div className="hero-photo-caption"><span className="hero-photo-place"><MapPin size={14} aria-hidden="true"/>{locale === "ar" ? "حدائق الحسين · عمّان" : "King Hussein Park · Amman"}</span><span className="hero-photo-failed">{t(locale,"photoFailed")}</span><span className="hero-photo-pending">{t(locale,"photoLoading")}</span><PhotoCredit areaId="king-hussein-park" locale={locale}/></div></div>;
}
