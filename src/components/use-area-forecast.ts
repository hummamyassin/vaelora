"use client";
import { useEffect, useRef, useState } from "react";
import { activityAreas } from "../data/activity-areas";
import { distanceKm, type Coordinates } from "../lib/geography";
import { isRefreshDue } from "../lib/refresh-policy";
import type { DashboardResponse } from "../server/recommendations/dashboard";

/**
 * Area forecast for the secondary planning tools (/api/dashboard). Polls only
 * while Home is visible and a refresh is due; a changed request clears and
 * reloads, a background refresh keeps the current result in place.
 */
export function useAreaForecast({
  ready,
  tracking,
  onHome,
  areaId,
  activity,
  day,
  minutes,
  preferences,
  origin,
  radius,
  onRequestChange,
}: {
  ready: boolean;
  tracking: boolean;
  onHome: boolean;
  areaId: string;
  activity: "walking" | "running";
  day: "today" | "tomorrow";
  minutes: number;
  preferences: string[];
  origin: Coordinates | null;
  radius: number;
  onRequestChange: () => void;
}) {
  const [result, setResult] = useState<DashboardResponse | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0),
    [refreshTick, setRefreshTick] = useState(0);
  const lastRequest = useRef(""),
    lastCompletedAt = useRef<number | null>(null),
    changeRef = useRef(onRequestChange);
  useEffect(() => {
    changeRef.current = onRequestChange;
  }, [onRequestChange]);
  useEffect(() => {
    if (!onHome) return;
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        isRefreshDue(lastCompletedAt.current, Date.now())
      )
        setRefreshTick((n) => n + 1);
    };
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [onHome]);
  useEffect(() => {
    if (!ready || tracking) return;
    const controller = new AbortController();
    const requestKey = JSON.stringify({
      areaId,
      activity,
      day,
      minutes,
      preferences,
      origin,
      radius,
      retry,
    });
    const changed = lastRequest.current !== requestKey;
    lastRequest.current = requestKey;
    const timer = setTimeout(async () => {
      if (changed) setLoading(true);
      setError(false);
      if (changed) {
        setResult(null);
        changeRef.current();
      }
      try {
        const response = await fetch("/api/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            areaId,
            activity,
            day,
            minutes,
            preferences,
            ...(origin
              ? {
                  placeIds: activityAreas
                    .filter(
                      (a) =>
                        a.verificationStatus !== "unverified" &&
                        distanceKm(origin, a) <= radius,
                    )
                    .map((a) => a.id),
                }
              : {}),
          }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!data.area || !data.walking || !data.running)
          throw new Error("Unavailable");
        if (!controller.signal.aborted) setResult(data);
      } catch {
        if (!controller.signal.aborted) {
          setError(true);
          setResult(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          lastCompletedAt.current = Date.now();
          setLoading(false);
        }
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    ready,
    areaId,
    activity,
    day,
    minutes,
    preferences,
    retry,
    origin,
    radius,
    refreshTick,
    tracking,
  ]);
  return { result, loading, error, retry: () => setRetry((n) => n + 1) };
}
