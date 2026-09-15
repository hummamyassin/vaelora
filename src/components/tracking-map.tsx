"use client";
import { useEffect, useRef, useState } from "react";
import * as ml from "../lib/maplibre";
import type { Feature } from "geojson";
import type { GPSPoint } from "../domain/tracking/activity";
import { routeSegments } from "../domain/tracking/export";
import type { Locale } from "../lib/i18n";
export function TrackingMap({
  points,
  revision,
  finished,
  locale,
}: {
  points: readonly GPSPoint[];
  revision: number;
  finished: boolean;
  locale: Locale;
}) {
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<ml.Map | null>(null),
    followRef = useRef(true);
  const [follow, setFollow] = useState(true),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const ar = locale === "ar";
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
        center: [35.9, 31.97],
        zoom: 12,
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
      map.addSource("route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": "#ca895d", "line-width": 5 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
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
            "#3b8069",
            "finish",
            "#cb7751",
            "#102a3a",
          ],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#fff",
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
    <div
      className="track-map"
      aria-label={ar ? "مسار GPS المسجل" : "Recorded GPS route"}
    >
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
          {ar
            ? follow
              ? "متابعة الموقع"
              : "متابعة موقعي"
            : follow
              ? "Following position"
              : "Follow position"}
        </button>
      )}
      <span className="track-map-key">
        {ar
          ? "● البداية · ● الموقع / النهاية · دون مطابقة للشوارع"
          : "● Start · ● Position / finish · No street snapping"}
      </span>
      {failed && (
        <p className="track-map-error">
          {ar
            ? "خلفية الخريطة غير متاحة. يبقى التسجيل المحلي مستمرًا."
            : "Map background unavailable. Local recording continues."}
        </p>
      )}
    </div>
  );
}
