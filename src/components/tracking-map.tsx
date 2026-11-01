"use client";
import { useEffect, useRef, useState } from "react";
import * as ml from "../lib/maplibre";
import type { Feature } from "geojson";
import type { GPSPoint } from "../domain/tracking/activity";
import { routeSegments } from "../domain/tracking/export";
import { translator, type Locale } from "../lib/i18n";
import { trackCopy } from "../lib/copy/track";
import {useMapLabels} from "./use-map-labels";
import { JORDAN_DEFAULT_VIEW } from "../lib/jordan";
export function TrackingMap({
  points,
  revision,
  finished,
  locale,
  planned = null,
  plannedLabel,
}: {
  points: readonly GPSPoint[];
  revision: number;
  finished: boolean;
  locale: Locale;
  /** A followed route's planned line, drawn under the recorded route. */
  planned?: readonly (readonly [number, number])[] | null;
  plannedLabel?: string;
}) {
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<ml.Map | null>(null),
    followRef = useRef(true);
  const [follow, setFollow] = useState(true),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const c = translator(trackCopy, locale);
  useMapLabels(container,locale);
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
        center: [JORDAN_DEFAULT_VIEW.center.longitude, JORDAN_DEFAULT_VIEW.center.latitude],
        zoom: JORDAN_DEFAULT_VIEW.zoom,
        attributionControl: { compact: false },
      });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    mapRef.current = map;
    map.addControl(new ml.NavigationControl({ showCompass: false }));
    // Route layers must be available even when remote basemap tiles never load.
    map.on("style.load", () => {
      const tokens = getComputedStyle(document.documentElement);
      const color = (name: string) => tokens.getPropertyValue(name).trim();
      map.addSource("planned", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      // The followed route: a dashed guide on a white casing, beneath the live line.
      map.addLayer({
        id: "planned-casing",
        type: "line",
        source: "planned",
        paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.85 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addLayer({
        id: "planned-line",
        type: "line",
        source: "planned",
        paint: { "line-color": color("--route-planned") || "#2f343c", "line-width": 4, "line-opacity": 0.95, "line-dasharray": [2, 1.4] },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      map.addSource("route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      // The live route: an ember line on a field-coloured outline.
      const strands = [
        ["route-outline", "--route-outline", 10, 1],
        ["route-line", "--route", 5.5, 1],
      ] as const;
      for (const [id, token, width, opacity] of strands) {
        map.addLayer({
          id,
          type: "line",
          source: "route",
          filter: ["==", ["geometry-type"], "LineString"],
          paint: { "line-color": color(token), "line-width": width, "line-opacity": opacity },
          layout: { "line-cap": "round", "line-join": "round" },
        });
      }
      map.addLayer({
        id: "route-points",
        type: "circle",
        source: "route",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 7,
          "circle-color": [
            "match",
            ["get", "role"],
            "start",
            color("--route-start"),
            "finish",
            color("--route-finish"),
            color("--route"),
          ],
          "circle-stroke-width": 3,
          "circle-stroke-color": color("--route-outline"),
        },
      });
      setReady(true);
    });
    map.on("dragstart", () => {
      followRef.current = false;
      setFollow(false);
    });
    map.on("error", () => setFailed(true));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    container.current?.parentElement?.setAttribute("data-planned", String(planned?.length ?? 0));
    (map.getSource("planned") as ml.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: planned && planned.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: planned.map((q) => [q[0], q[1]]) } }] : [],
    });
    // Before the first fix, frame the planned route.
    if (planned && planned.length > 1 && !points.length) {
      const bounds = new ml.LngLatBounds();
      planned.forEach((q) => bounds.extend([q[0], q[1]]));
      map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 0 });
    }
  }, [planned, ready, points.length]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const features: Feature[] = routeSegments(points)
      .filter((g) => g.length > 1)
      .map((g) => ({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: g.map((p) => [p.longitude, p.latitude]),
        },
      }));
    if (points.length) {
      const first = points[0],
        last = points[points.length - 1];
      features.push(
        {
          type: "Feature",
          properties: { role: "start" },
          geometry: {
            type: "Point",
            coordinates: [first.longitude, first.latitude],
          },
        },
        {
          type: "Feature",
          properties: { role: finished ? "finish" : "current" },
          geometry: {
            type: "Point",
            coordinates: [last.longitude, last.latitude],
          },
        },
      );
      if (finished) {
        const bounds = new ml.LngLatBounds();
        points.forEach((p) => bounds.extend([p.longitude, p.latitude]));
        map.fitBounds(bounds, { padding: 50, maxZoom: 16, duration: 0 });
      } else if (followRef.current)
        map.jumpTo({ center: [last.longitude, last.latitude], zoom: 16 });
    }
    (map.getSource("route") as ml.GeoJSONSource).setData({
      type: "FeatureCollection",
      features,
    });
  }, [points, revision, finished, ready, follow]);
  return (
    <div className="track-map" role="group" aria-label={c("routeLabel")}>
      <div ref={container} className="track-map-canvas" />
      {!finished && (
        <button
          className="track-follow"
          aria-pressed={follow}
          onClick={() => {
            followRef.current = !follow;
            setFollow(!follow);
          }}
        >
          <span className="track-follow-dot" aria-hidden="true" />
          {follow ? c("following") : c("follow")}
        </button>
      )}
      <span className="track-map-key">
        <span><i data-kind="start" />{c("mapStart")}</span>
        <span><i data-kind="end" />{c("mapPosition")}</span>
        {planned && plannedLabel && <span><i data-kind="planned" />{plannedLabel}</span>}
        <span className="track-map-key-text">{c("mapNoSnap")}</span>
      </span>
      {failed && <p className="track-map-error">{c("mapError")}</p>}
    </div>
  );
}
