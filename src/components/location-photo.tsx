import { LocationArt } from "./location-art";
import type { Locale } from "../lib/i18n";
// Keep existing call sites compatible; location photographs are no longer rendered.
export const LocationPhoto = LocationArt;
export function PhotoCredit({ locale }: { areaId: string; locale: Locale }) {
  return (
    <small className="photo-credit">
      {locale === "ar"
        ? "رسم توضيحي أصلي من VAELORA، لا يمثّل المظهر الحقيقي للمكان."
        : "Original VAELORA illustration, not a depiction of the actual place."}
    </small>
  );
}
export function HeroPhoto({ locale }: { locale: Locale }) {
  return (
    <div className="hero-photography">
      <LocationArt areaId="featured" locale={locale} hero environment="park" />
    </div>
  );
}
