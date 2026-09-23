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
            <path d="M-30 240Q140 35 340 230T670 60M-30 220Q140 15 340 210T670 40M-30 200Q140-5 340 190T670 20" />
            {theme === "urban" ? (
              <path d="M330 130V60H385V130M400 145V20H460V145M480 165V85H520V165" />
            ) : (
              <path d="M380 130V70M352 98L380 50L408 98ZM470 110V30M438 70L470 10L502 70Z" />
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
