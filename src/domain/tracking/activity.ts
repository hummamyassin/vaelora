import { distanceKm, validCoordinates } from "../../lib/geography.ts";

export type ActivityKind = "walking" | "running";
export type RecordingState = "idle" | "recording" | "paused" | "finished";
export interface GPSPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed: number | null;
  segment: number;
}
export interface ConditionsSnapshot {
  areaId: string;
  areaName: string;
  timestamp: number;
  temperatureC: number | null;
  windKmh: number | null;
  score: number | null;
}
export interface RecordedActivity {
  version: 1;
  id: string;
  activity: ActivityKind;
  state: RecordingState;
  startedAt: number;
  endedAt: number | null;
  updatedAt: number;
  activeMs: number;
  distanceM: number;
  points: GPSPoint[];
  segment: number;
  conditions: ConditionsSnapshot | null;
}
// Conservative consumer GPS policy, not survey accuracy. Never interpolate or snap.
export const gpsPolicy = {
  maxAccuracyM: 40,
  maxAgeMs: 15000,
  futureToleranceMs: 2000,
  gapMs: 30000,
  minStepM: 3,
  minPaceDistanceM: 50,
  maxPoints: 30000,
  maxActiveMs: 86400000,
  maxSpeedMps: { walking: 7, running: 12 },
} as const;
export function metrics(a: Pick<RecordedActivity, "activeMs" | "distanceM">) {
  const averageSpeedKmh =
    a.activeMs > 0 && a.distanceM >= gpsPolicy.minPaceDistanceM
      ? (a.distanceM / a.activeMs) * 3600
      : null;
  return {
    averageSpeedKmh,
    averagePaceSeconds:
      averageSpeedKmh && averageSpeedKmh > 0 ? 3600 / averageSpeedKmh : null,
  };
}
export function durationLabel(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
export function paceLabel(seconds: number | null) {
  if (
    seconds === null ||
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    seconds > 5999
  )
    return "—";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Mutable engine lives in a ref; the UI reads metrics once per second, without copying route history. */
export class ActivityRecorder {
  data: RecordedActivity;
  currentSpeedMps: number | null = null;
  accuracy: number | null = null;
  quality = "waiting";
  private lastSeen = 0;
  private recordingStart = 0;
  private lastAcceptedAt = 0;
  private anchor: GPSPoint | null = null;
  constructor(
    activity: ActivityKind,
    id: string,
    now: number,
    restored?: RecordedActivity,
  ) {
    this.data = restored
      ? structuredClone(restored)
      : {
          version: 1,
          id,
          activity,
          state: "idle",
          startedAt: now,
          endedAt: null,
          updatedAt: now,
          activeMs: 0,
          distanceM: 0,
          points: [],
          segment: 0,
          conditions: null,
        };
    if (restored && restored.state !== "finished") {
      this.data.state = "paused";
      this.data.segment++;
      this.data.updatedAt = now;
      this.quality = "interrupted";
    }
  }
  start(now: number, conditions: ConditionsSnapshot | null = null) {
    if (this.data.state !== "idle") return false;
    this.data.startedAt = now;
    this.recordingStart = now;
    this.data.updatedAt = now;
    this.data.conditions = conditions;
    this.data.state = "recording";
    return true;
  }
  tick(now: number) {
    if (!Number.isFinite(now) || now < this.data.updatedAt) return;
    if (this.data.state === "recording") {
      const delta = now - this.data.updatedAt;
      if (
        delta > gpsPolicy.gapMs ||
        this.data.activeMs + delta > gpsPolicy.maxActiveMs
      ) {
        this.data.state = "paused";
        this.data.segment++;
        this.anchor = null;
        this.quality = "interrupted";
      } else this.data.activeMs += delta;
      if (now - this.lastAcceptedAt > 10000) this.currentSpeedMps = null;
    }
    this.data.updatedAt = now;
  }
  pause(now: number) {
    if (this.data.state !== "recording") return false;
    this.tick(now);
    this.data.state = "paused";
    this.data.segment++;
    this.anchor = null;
    this.currentSpeedMps = null;
    return true;
  }
  resume(now: number) {
    if (
      this.data.state !== "paused" ||
      this.data.points.length >= gpsPolicy.maxPoints ||
      this.data.activeMs >= gpsPolicy.maxActiveMs
    )
      return false;
    this.data.updatedAt = now;
    this.recordingStart = now;
    this.data.state = "recording";
    this.quality = "waiting";
    return true;
  }
  finish(now: number) {
    if (this.data.state !== "recording" && this.data.state !== "paused")
      return false;
    this.tick(now);
    this.data.state = "finished";
    this.data.endedAt = now;
    this.currentSpeedMps = null;
    return true;
  }
  point(input: Omit<GPSPoint, "segment">, now: number): boolean {
    if (this.data.state !== "recording") return false;
    this.tick(now);
    if (this.data.state !== "recording") return false;
    const reject = (reason: string) => {
      this.quality = reason;
      return false;
    };
    if (
      !validCoordinates(input) ||
      !Number.isFinite(input.accuracy) ||
      input.accuracy < 0 ||
      !Number.isFinite(input.timestamp)
    )
      return reject("invalid");
    this.accuracy = input.accuracy;
    if (input.accuracy > gpsPolicy.maxAccuracyM) return reject("poor");
    if (
      input.timestamp <= this.lastSeen ||
      input.timestamp < this.recordingStart ||
      now - input.timestamp > gpsPolicy.maxAgeMs ||
      input.timestamp - now > gpsPolicy.futureToleranceMs
    )
      return reject("stale");
    this.lastSeen = input.timestamp;
    if (this.data.points.length >= gpsPolicy.maxPoints) {
      this.pause(now);
      return reject("limit");
    }
    if (
      this.anchor &&
      input.timestamp - this.anchor.timestamp > gpsPolicy.gapMs
    ) {
      this.anchor = null;
      this.data.segment++;
    }
    const p: GPSPoint = { ...input, speed: null, segment: this.data.segment };
    if (this.anchor) {
      const distance = distanceKm(this.anchor, p) * 1000,
        dt = (p.timestamp - this.anchor.timestamp) / 1000;
      const speed = distance / dt,
        max = gpsPolicy.maxSpeedMps[this.data.activity];
      if (!Number.isFinite(speed) || speed > max) return reject("jump");
      const threshold = Math.max(
        gpsPolicy.minStepM,
        Math.min(15, (this.anchor.accuracy + p.accuracy) / 4),
      );
      if (distance < threshold) {
        this.currentSpeedMps = null;
        return reject("stationary");
      }
      const measured =
        input.speed !== null &&
        Number.isFinite(input.speed) &&
        input.speed >= 0 &&
        input.speed <= max &&
        Math.abs(input.speed - speed) <= 2
          ? input.speed
          : speed;
      this.currentSpeedMps =
        this.currentSpeedMps === null
          ? measured
          : this.currentSpeedMps * 0.5 + measured * 0.5;
      p.speed = this.currentSpeedMps;
      this.data.distanceM += distance;
    } else this.currentSpeedMps = null;
    this.data.points.push(p);
    this.anchor = p;
    this.lastAcceptedAt = now;
    this.quality = "good";
    return true;
  }
}

/** Reject unknown/corrupt local schemas instead of silently treating them as valid activities. */
export function validateActivity(value: unknown): RecordedActivity {
  const a = value as RecordedActivity;
  if (
    !a ||
    a.version !== 1 ||
    typeof a.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(a.id) ||
    !["walking", "running"].includes(a.activity) ||
    !["recording", "paused", "finished"].includes(a.state) ||
    !Number.isFinite(a.startedAt) ||
    a.startedAt < 0 ||
    !Number.isFinite(a.updatedAt) ||
    a.updatedAt < a.startedAt ||
    !Number.isFinite(a.activeMs) ||
    a.activeMs < 0 ||
    a.activeMs > gpsPolicy.maxActiveMs ||
    a.activeMs > a.updatedAt - a.startedAt + 1 ||
    !Number.isFinite(a.distanceM) ||
    a.distanceM < 0 ||
    !Number.isInteger(a.segment) ||
    a.segment < 0 ||
    !Array.isArray(a.points) ||
    a.points.length > gpsPolicy.maxPoints ||
    (a.state === "finished" &&
      (a.endedAt !== a.updatedAt || !Number.isFinite(a.endedAt))) ||
    (a.state !== "finished" && a.endedAt !== null)
  )
    throw new Error("Unsupported or damaged activity");
  let total = 0;
  let previous: GPSPoint | undefined;
  for (const p of a.points) {
    if (
      !p ||
      !validCoordinates(p) ||
      !Number.isFinite(p.accuracy) ||
      p.accuracy < 0 ||
      p.accuracy > gpsPolicy.maxAccuracyM ||
      !Number.isFinite(p.timestamp) ||
      p.timestamp < a.startedAt ||
      p.timestamp > a.updatedAt + gpsPolicy.futureToleranceMs ||
      !Number.isInteger(p.segment) ||
      p.segment < 0 ||
      p.segment > a.segment ||
      (p.speed !== null &&
        (!Number.isFinite(p.speed) ||
          p.speed < 0 ||
          p.speed > gpsPolicy.maxSpeedMps[a.activity]))
    )
      throw new Error("Invalid route point");
    if (previous) {
      if (p.timestamp <= previous.timestamp || p.segment < previous.segment)
        throw new Error("Unordered route");
      if (p.segment === previous.segment) {
        const d = distanceKm(previous, p) * 1000,
          dt = (p.timestamp - previous.timestamp) / 1000;
        if (
          dt > gpsPolicy.gapMs / 1000 ||
          d / dt > gpsPolicy.maxSpeedMps[a.activity]
        )
          throw new Error("Invalid movement");
        total += d;
      }
    }
    previous = p;
  }
  if (Math.abs(total - a.distanceM) > 0.01) throw new Error("Corrupt distance");
  if (a.conditions !== null) {
    const c = a.conditions;
    if (
      !c ||
      typeof c.areaId !== "string" ||
      c.areaId.length > 80 ||
      typeof c.areaName !== "string" ||
      c.areaName.length > 100 ||
      !Number.isFinite(c.timestamp) ||
      c.timestamp > a.startedAt ||
      a.startedAt - c.timestamp > 3600000 ||
      [c.temperatureC, c.windKmh, c.score].some(
        (v) => v !== null && !Number.isFinite(v),
      ) ||
      (c.score !== null && (c.score < 0 || c.score > 100))
    )
      throw new Error("Invalid condition snapshot");
  }
  return structuredClone(a);
}
