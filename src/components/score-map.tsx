"use client";
import { useEffect, useRef, useState } from "react";
import * as ml from "../lib/maplibre";
import type { PlanningResponse } from "../server/recommendations/planning";
import type { Locale } from "../lib/i18n";
export function ScoreMap({
  rows,
  activity,
  locale,
  onSelect,
}: {
  rows: PlanningResponse["rows"];
  activity: "walking" | "running";
  locale: Locale;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<ml.Map | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let map: ml.Map;
    try {
      map = new ml.Map({
        container: container.current!,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [35.89, 31.98],
        zoom: 10,
        attributionControl: { compact: false },
      });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    mapRef.current = map;
    map.addControl(new ml.NavigationControl({ showCompass: false }));
    map.on("error", () => setFailed(true));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = rows.map((r) => {
      const el = document.createElement("button");
      el.className = "area-score-marker";
      el.type = "button";
      el.textContent = `${r.area.name[locale]} ${r.days[0][activity].score ?? "—"}`;
      el.onclick = () => onSelect(r.area.id);
      return new ml.Marker({ element: el })
        .setLngLat([r.area.longitude, r.area.latitude])
        .addTo(map);
    });
    const bounds = new ml.LngLatBounds();
    rows.forEach((r) => bounds.extend([r.area.longitude, r.area.latitude]));
    if (rows.length)
      map.fitBounds(bounds, { padding: 55, maxZoom: 12, duration: 0 });
    return () => markers.forEach((m) => m.remove());
  }, [rows, activity, locale, onSelect]);
  return (
    <div className="score-map">
      <div ref={container} />
      {failed && (
        <p>
          {locale === "ar"
            ? "خلفية الخريطة غير متاحة. قارن بطاقات المناطق أدناه."
            : "Map background unavailable. Compare area cards below."}
        </p>
      )}
    </div>
  );
}
