import {
  MapPin,
  Trees,
  Building2,
  Footprints,
  Activity,
  Navigation,
} from "lucide-react";
import { label, t, type Locale } from "../lib/i18n";
export function LocationArt({
  areaId,
  locale,
  hero = false,
  name,
  environment,
}: {
  areaId: string;
  locale: Locale;
  hero?: boolean;
  name?: string;
  environment?: string;
}) {
  const theme =
    environment === "park"
      ? "park"
      : environment === "woodland"
        ? "nature"
        : environment === "urban"
          ? "urban"
          : environment === "running"
            ? "running"
            : environment === "walking"
              ? "walking"
              : "featured";
  const Icon =
    theme === "park" || theme === "nature"
      ? Trees
      : theme === "urban"
        ? Building2
        : theme === "running"
          ? Activity
          : theme === "walking"
            ? Footprints
            : MapPin;
  return (
    <span
      className={`location-photo location-art ${hero ? "hero-photo" : ""}`}
      data-theme-art={theme}
      data-area={areaId}
      data-state="fallback"
    >
      <span className="photo-fallback area-identity">
        <svg
          className="location-artwork"
          viewBox="0 0 600 240"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g fill="none" stroke="currentColor" strokeWidth="2">
            {theme === "park" ? (
              <><path d="M-30 220Q120 70 280 210T650 60M-30 195Q120 45 280 185T650 35" /><circle cx="190" cy="85" r="42" /><path d="M190 127v78M145 205h100" /></>
            ) : theme === "nature" ? (
              <><path d="M-20 220L120 72l75 78 82-118 98 120 86-96 170 164" /><path d="M0 236L145 105l64 68 70-102 95 110 90-91 140 135" /></>
            ) : theme === "urban" ? (
              <><path d="M-30 210H650M-30 180H650" /><path d="M330 130V60H385V130M400 145V20H460V145M480 165V85H520V165" /></>
            ) : theme === "running" ? (
              <><ellipse cx="420" cy="118" rx="160" ry="82" /><ellipse cx="420" cy="118" rx="118" ry="54" /><path strokeWidth="7" d="M240 180C350 35 500 35 590 120" /></>
            ) : theme === "walking" ? (
              <><path d="M-30 220Q140 25 330 210T670 40" /><path d="M320 40l28 38-22 34M390 92l28 38-22 34M465 35l28 38-22 34" /></>
            ) : (
              <><path d="M-30 240Q140 35 340 230T670 60M-30 210Q140 5 340 200T670 30" /><path d="M380 130V70M352 98L380 50L408 98ZM470 110V30M438 70L470 10L502 70Z" /></>
            )}
            <path strokeWidth="5" d="M250 240C520 100 280 100 600 30" />
            {Array.from({ length: 9 }, (_, i) => (
              <path key={i} d={`M${270 + i * 34} 183l9 9-9 9-9-9Z`} />
            ))}
          </g>
        </svg>
        <span className="identity-category">
          <Icon size={19} />
          {["park", "urban", "woodland"].includes(environment ?? "")
            ? label(locale, environment!)
            : t(locale, "areaProfile")}
          <Navigation size={14} />
        </span>
        <strong>{name ?? "VAELORA"}</strong>
        <small>{t(locale, "photoNeutral")}</small>
      </span>
    </span>
  );
}
