"use client";
import Image from "next/image";
import { useState } from "react";
import { MapPin, ImageOff } from "lucide-react";
import { locationPhotos } from "../lib/location-photos";
import { t, type Locale } from "../lib/i18n";

/** Key by area ID at call sites so loading/failure state cannot leak between places. */
export function LocationPhoto({ areaId, locale, hero = false }: { areaId: string; locale: Locale; hero?: boolean }) {
  const photo = locationPhotos[areaId];
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const available = !!photo && state !== "failed";
  return <span className={`location-photo ${hero ? "hero-photo" : ""}`} data-state={available ? state : "fallback"}>
    {available ? <>
      <Image src={photo.src} alt={photo.alt[locale]} fill sizes={hero ? "100vw" : "(max-width: 1000px) calc(100vw - 64px), 600px"} loading={hero ? "eager" : "lazy"} fetchPriority={hero ? "high" : "auto"} style={{ objectFit: "cover", objectPosition: photo.position }} onLoad={() => setState("loaded")} onError={() => setState("failed")} />
      {state === "loading" && <span className="photo-loading">{t(locale, "photoLoading")}</span>}
    </> : <span className="photo-fallback"><ImageOff size={24} aria-hidden="true"/><strong>{t(locale, photo ? "photoFailed" : "photoMissing")}</strong><small>{t(locale, "photoNeutral")}</small></span>}
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
