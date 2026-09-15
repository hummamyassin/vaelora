"use client";
import { getVersion, setWorkerUrl } from "maplibre-gl";

// Keep the worker and its relative shared-module import together. Emitting just
// the worker as a Webpack URL asset leaves that import unresolved in MapLibre 6.
// prepare-maplibre.mjs copies the installed version; the PWA caches both files.
setWorkerUrl(`/maplibre/${getVersion()}/maplibre-gl-worker.mjs`);

export * from "maplibre-gl";
