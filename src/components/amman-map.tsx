"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import type { MatchView } from "./types";

interface AmmanMapProps {
  matches: readonly MatchView[];
  selectedAreaId: string | null;
  onSelect: (areaId: string) => void;
}

const mapStyle: StyleSpecification = {
  version: 8,
  sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function AmmanMap({ matches, selectedAreaId, onSelect }: AmmanMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const previousSelectedRef = useRef<string | null>(null);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: containerRef.current, style: mapStyle, center: [35.895, 31.945], zoom: 10.7, minZoom: 9, maxZoom: 17, attributionControl: false });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

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
      button.setAttribute("aria-label", `Show ${match.area.name}`);
      button.title = match.area.name;
      button.addEventListener("click", () => onSelectRef.current(match.area.id));
      const marker = new maplibregl.Marker({ element: button, anchor: "bottom" }).setLngLat([match.area.longitude, match.area.latitude]).addTo(map);
      markersRef.current.set(match.area.id, marker);
      bounds.extend([match.area.longitude, match.area.latitude]);
    }
    if (matches.length > 1) map.fitBounds(bounds, { padding: 70, maxZoom: 12.5, duration: 700 });
    if (matches.length === 1) map.easeTo({ center: [matches[0].area.longitude, matches[0].area.latitude], zoom: 13, duration: 700 });
  }, [matches]);

  useEffect(() => {
    const map = mapRef.current;
    const match = matches.find(item => item.area.id === selectedAreaId);
    if (!map || !match) return;
    for (const [id, marker] of markersRef.current) marker.getElement().classList.toggle("is-selected", id === selectedAreaId);
    if (previousSelectedRef.current === null) { previousSelectedRef.current = selectedAreaId; return; }
    previousSelectedRef.current = selectedAreaId;
    map.easeTo({ center: [match.area.longitude, match.area.latitude], zoom: Math.max(map.getZoom(), 12.5), duration: 550 });
  }, [selectedAreaId, matches]);

  return <div className="map-shell" aria-label="Map of recommended activity areas in Greater Amman"><div ref={containerRef} className="map-canvas" /><div className="map-caption"><span className="map-caption-dot" />Real reviewed area coordinates</div></div>;
}
