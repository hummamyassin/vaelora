"use client";
import { useEffect, useRef, useState } from "react";
import * as ml from "../lib/maplibre";
import type { Coordinates } from "../lib/geography";
import type { Locale } from "../lib/i18n";
import { useMapLabels } from "./use-map-labels";
export function ScoreMap({
  rows,
  activity,
  locale,
  selectedAreaId,
  onSelect,
  origin,
}: {
  rows: {
    area: Coordinates & { id: string; name: { en: string; ar: string } };
    days: {
      walking: { score: number | null };
      running: { score: number | null };
    }[];
  }[];
  activity: "walking" | "running";
  locale: Locale;
  selectedAreaId: string;
  onSelect: (id: string) => void;
  origin?: Coordinates | null;
}) {
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<ml.Map | null>(null),
    [failed, setFailed] = useState(false);
  useMapLabels(container, locale);
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
        renderWorldCopies: false,
        attributionControl: { compact: false },
      });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    mapRef.current = map;
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current!);
    map.addControl(new ml.NavigationControl({ showCompass: false }));
    map.on("error", () => setFailed(true));
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin) return;
    const el = document.createElement("span");
    el.className = "dynamic-origin";
    el.title = locale === "ar" ? "الموقع المحدد" : "Selected location";
    const marker = new ml.Marker({ element: el })
      .setLngLat([origin.longitude, origin.latitude])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [origin, locale]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let disposed = false;
    const markers = new Map<string, ml.Marker>();
    const sourceId = "activity-area-clusters";
    const update = () => {
      if (disposed || !map.getSource(sourceId) || !map.isSourceLoaded(sourceId))
        return;
      const visible = new Set<string>();
      for (const feature of map.querySourceFeatures(sourceId)) {
        if (feature.geometry.type !== "Point") continue;
        const props = feature.properties;
        const cluster = Boolean(props.cluster);
        const key = cluster
          ? `cluster-${props.cluster_id}`
          : String(props.areaId);
        if (visible.has(key)) continue;
        visible.add(key);
        if (markers.has(key)) continue;
        const r = rows.find((row) => row.area.id === props.areaId);
        if (!cluster && !r) continue;
        const el = document.createElement("button");
        el.className = cluster ? "area-cluster-marker" : "area-score-marker";
        el.type = "button";
        const score = r?.days[0][activity].score;
        el.dataset.score =
          score == null
            ? "unknown"
            : score >= 90
              ? "excellent"
              : score >= 70
                ? "good"
                : score >= 60
                  ? "fair"
                  : "poor";
        el.textContent = cluster ? `${props.point_count} +` : `${score ?? "—"}`;
        el.dataset.area = r?.area.name[locale] ?? "";
        el.dataset.selected = String(r?.area.id === selectedAreaId);
        el.title = cluster
          ? locale === "ar"
            ? `${props.point_count} مناطق · قرّب للاستكشاف`
            : `${props.point_count} areas · zoom to explore`
          : `${r!.area.name[locale]} · ${score ?? "—"}/100`;
        el.setAttribute("aria-label", el.title);
        el.onclick = () => {
          if (!cluster) {
            onSelect(r!.area.id);
            return;
          }
          const source = map.getSource(sourceId) as ml.GeoJSONSource;
          void source
            .getClusterExpansionZoom(Number(props.cluster_id))
            .then((zoom) => {
              if (!disposed)
                map.easeTo({
                  center:
                    feature.geometry.type === "Point"
                      ? (feature.geometry.coordinates as [number, number])
                      : map.getCenter(),
                  zoom,
                  duration: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? 0
                    : 350,
                });
            })
            .catch(() => {
              if (!disposed) setFailed(true);
            });
        };
        markers.set(
          key,
          new ml.Marker({ element: el })
            .setLngLat(feature.geometry.coordinates as [number, number])
            .addTo(map),
        );
      }
      for (const [key, marker] of markers)
        if (!visible.has(key)) {
          marker.remove();
          markers.delete(key);
        }
    };
    const install = () => {
      if (disposed) return;
      map.addSource(sourceId, {
        type: "geojson",
        cluster: true,
        clusterRadius: 96,
        clusterMaxZoom: 16,
        data: {
          type: "FeatureCollection",
          features: rows.map((r) => ({
            type: "Feature",
            properties: { areaId: r.area.id },
            geometry: {
              type: "Point",
              coordinates: [r.area.longitude, r.area.latitude],
            },
          })),
        },
      });
      // A source-backed layer keeps worker clustering active; accessible HTML buttons
      // display the actual per-area scores or cluster counts, never averaged scores.
      map.addLayer({
        id: sourceId,
        type: "circle",
        source: sourceId,
        paint: { "circle-radius": 0, "circle-opacity": 0 },
      });
      map.on("sourcedata", update);
      map.on("moveend", update);
      map.on("zoomend", update);
      update();
    };
    if (map.isStyleLoaded()) install();
    else map.once("load", install);
    const bounds = new ml.LngLatBounds();
    if (origin) bounds.extend([origin.longitude, origin.latitude]);
    rows.forEach((r) => bounds.extend([r.area.longitude, r.area.latitude]));
    if (rows.length || origin)
      map.fitBounds(bounds, { padding: 55, maxZoom: 12, duration: 0 });
    return () => {
      disposed = true;
      map.off("load", install);
      map.off("sourcedata", update);
      map.off("moveend", update);
      map.off("zoomend", update);
      markers.forEach((m) => m.remove());
      if (mapRef.current === map) {
        if (map.getLayer(sourceId)) map.removeLayer(sourceId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [rows, activity, locale, onSelect, selectedAreaId, origin]);
  return (
    <div className="score-map">
      <div
        ref={container}
        aria-label={locale === "ar" ? "خريطة مؤشرات المناطق" : "Area score map"}
      />
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
