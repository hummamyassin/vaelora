"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  closeStrategy,
  formatRoute,
  homeRoute,
  isHistoryEntry,
  nextRoute,
  parseRoute,
  sameRoute,
  type AppRoute,
  type HistoryEntry,
} from "../lib/app-route";

/**
 * Minimal history integration for the single-page shell. Screens and overlays
 * push entries so Back navigates inside the app; refresh restores the hash.
 * Nothing here mounts or unmounts the recorder, so GPS sessions are unaffected.
 */
/**
 * Keep the framework's own history fields (Next marks its entries and reloads
 * on popstate to an entry it did not mark), and add ours alongside them.
 */
function merged(entry: HistoryEntry) {
  const current: unknown = history.state;
  return current && typeof current === "object" ? { ...current, ...entry } : entry;
}
export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>(homeRoute);
  const current = useRef<AppRoute>(homeRoute);
  const depth = useRef(0);
  const apply = useCallback((next: AppRoute) => {
    current.current = next;
    setRoute(next);
  }, []);
  useEffect(() => {
    const state: unknown = history.state;
    const initial = isHistoryEntry(state)
      ? state.route
      : parseRoute(location.hash);
    depth.current = isHistoryEntry(state) ? state.depth : 0;
    const entry: HistoryEntry = { vaelora: 1, depth: depth.current, route: initial };
    history.replaceState(merged(entry), "", formatRoute(initial));
    queueMicrotask(() => apply(initial));
    const pop = (event: PopStateEvent) => {
      const s: unknown = event.state;
      depth.current = isHistoryEntry(s) ? s.depth : 0;
      apply(isHistoryEntry(s) ? s.route : parseRoute(location.hash));
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [apply]);
  const navigate = useCallback(
    (change: Partial<AppRoute>, options: { replace?: boolean } = {}) => {
      const next = nextRoute(current.current, change);
      if (sameRoute(next, current.current)) return;
      if (!options.replace) depth.current += 1;
      const entry: HistoryEntry = { vaelora: 1, depth: depth.current, route: next };
      if (options.replace) history.replaceState(merged(entry), "", formatRoute(next));
      else history.pushState(merged(entry), "", formatRoute(next));
      apply(next);
    },
    [apply],
  );
  /** Close an overlay: Back when this session pushed it, else replace in place. */
  const close = useCallback(
    (change: Partial<AppRoute>) => {
      if (sameRoute(nextRoute(current.current, change), current.current)) return;
      if (closeStrategy(history.state) === "back") history.back();
      else navigate(change, { replace: true });
    },
    [navigate],
  );
  return { route, navigate, close };
}
