"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "../lib/maplibre";
import type { Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import type { MatchView } from "./types";
import { areaName, t, type Locale } from "../lib/i18n";
import { coverage } from "../lib/coverage";

interface AmmanMapProps {
  matches: readonly MatchView[];
  selectedAreaId: string | null;
  onSelect: (areaId: string) => void;
  locale?: Locale;
}

const mapStyle: StyleSpecification = {
  version: 8,
  sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>' } },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};
// Reserve room for overview/navigation controls and the attribution/caption.
const mapPadding = { top: 110, bottom: 90, left: 65, right: 65 };

export function ActivityMap({ matches, selectedAreaId, onSelect, locale = "en" }: AmmanMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const previousSelectedRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center = coverage.cities[0].center;
    const style = structuredClone(mapStyle);
    if (locale === "ar") (style.sources.osm as maplibregl.RasterSourceSpecification).attribution = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">مساهمو OpenStreetMap</a>';
    let map: MapLibreMap;
    try { map = new maplibregl.Map({ container: containerRef.current, style, center: [center.longitude, center.latitude], zoom: 10.7, minZoom: 3, maxZoom: 17, attributionControl: false, locale: { "NavigationControl.ZoomIn": t(locale,"zoomIn"), "NavigationControl.ZoomOut": t(locale,"zoomOut"), "AttributionControl.ToggleAttribution": t(locale,"attribution"), "Map.Title": t(locale,"map") } }); }
    catch { requestAnimationFrame(() => setFailed(true)); return; }
    map.on("error", () => setFailed(true));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [locale]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const marker of markersRef.current.values()) marker.remove();
    markersRef.current.clear();
    const bounds = new maplibregl.LngLatBounds();
    for (const match of matches) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-marker";
      button.setAttribute("aria-label", `${t(locale,"show")} ${areaName(locale,match.area)}`);
      button.title = areaName(locale,match.area);
      button.addEventListener("click", () => onSelectRef.current(match.area.id));
      const marker = new maplibregl.Marker({ element: button, anchor: "bottom" }).setLngLat([match.area.longitude, match.area.latitude]).addTo(map);
      markersRef.current.set(match.area.id, marker);
      bounds.extend([match.area.longitude, match.area.latitude]);
    }
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700;
    if (matches.length > 1) map.fitBounds(bounds, { padding: mapPadding, maxZoom: 12.5, duration });
    if (matches.length === 1) map.easeTo({ center: [matches[0].area.longitude, matches[0].area.latitude], zoom: 13, duration });
  }, [matches, locale]);

  useEffect(() => {
    const map = mapRef.current;
    const match = matches.find(item => item.area.id === selectedAreaId);
    if (!map || !match) return;
    for (const [id, marker] of markersRef.current) {
      marker.getElement().classList.toggle("is-selected", id === selectedAreaId);
      marker.getElement().setAttribute("aria-pressed", String(id === selectedAreaId));
    }
    if (previousSelectedRef.current === null) { previousSelectedRef.current = selectedAreaId; return; }
    previousSelectedRef.current = selectedAreaId;
    map.easeTo({ center: [match.area.longitude, match.area.latitude], zoom: Math.max(map.getZoom(), 12.5), duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700 });
  }, [selectedAreaId, matches]);

  function showAll() {
    if (!mapRef.current || !matches.length) return;
    const bounds = new maplibregl.LngLatBounds();
    for (const match of matches) bounds.extend([match.area.longitude, match.area.latitude]);
    mapRef.current.fitBounds(bounds, { padding: mapPadding, maxZoom: 13, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500 });
  }
  return <div className="map-shell" aria-label={t(locale,"map")}><div ref={containerRef} className="map-canvas" /><button className="map-overview" onClick={showAll}>{t(locale,"showAll")}</button><div className="map-caption">{failed ? t(locale,"mapError") : t(locale,"mapCaption")}</div></div>;
}
export const AmmanMap = ActivityMap;
