"use client";
import { useEffect, type RefObject } from "react";
import type { Locale } from "../lib/i18n";
export function useMapLabels(
  container: RefObject<HTMLElement | null>,
  locale: Locale,
) {
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const label = () => {
      for (const [selector, en, ar] of [
        [".maplibregl-ctrl-zoom-in", "Zoom in", "تكبير"],
        [".maplibregl-ctrl-zoom-out", "Zoom out", "تصغير"],
        [
          ".maplibregl-ctrl-compass",
          "Reset bearing to north",
          "توجيه الخريطة نحو الشمال",
        ],
      ]) {
        el.querySelectorAll(selector).forEach((button) => {
          button.setAttribute("aria-label", locale === "ar" ? ar : en);
          button.setAttribute("title", locale === "ar" ? ar : en);
        });
      }
      el.querySelector("canvas")?.setAttribute(
        "aria-label",
        locale === "ar" ? "خريطة تفاعلية" : "Interactive map",
      );
    };
    label();
    const observer = new MutationObserver(label);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [container, locale]);
}
