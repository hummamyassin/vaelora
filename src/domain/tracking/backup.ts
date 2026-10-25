import { validateActivity, type RecordedActivity } from "./activity.ts";

/** Local, user-held backup of finished activities. Never uploaded anywhere. */
export const backupFormat = "vaelora-activity-backup";
export const backupVersion = 1;
/** Generous for ~30k-point routes, small enough to refuse unrelated large files. */
export const maxBackupBytes = 64 * 1024 * 1024;
export const maxBackupActivities = 5000;

export interface ActivityBackup {
  format: typeof backupFormat;
  version: typeof backupVersion;
  exportedAt: string;
  activities: RecordedActivity[];
}
export type BackupErrorCode =
  | "too-large"
  | "not-json"
  | "wrong-format"
  | "unsupported-version"
  | "too-many"
  | "invalid-activity"
  | "duplicate-id";
export class BackupError extends Error {
  readonly code: BackupErrorCode;
  constructor(code: BackupErrorCode) {
    super(`Backup rejected: ${code}`);
    this.name = "BackupError";
    this.code = code;
  }
}

export function createBackup(
  activities: readonly RecordedActivity[],
  now = new Date(),
): ActivityBackup {
  const finished = activities
    .map(validateActivity)
    .filter((a) => a.state === "finished")
    .sort((a, b) => a.startedAt - b.startedAt);
  return {
    format: backupFormat,
    version: backupVersion,
    exportedAt: now.toISOString(),
    activities: finished,
  };
}
export function serializeBackup(backup: ActivityBackup) {
  return JSON.stringify(backup);
}
export function backupFileName(now = new Date()) {
  return `vaelora-backup-${now.toISOString().slice(0, 10)}.json`;
}

/**
 * Strict parse: every activity must pass the same validation used for IndexedDB
 * reads, must be finished, and IDs must be unique within the file. Any failure
 * rejects the whole file so a damaged backup never imports partially.
 */
export function parseBackup(text: string): RecordedActivity[] {
  if (text.length > maxBackupBytes) throw new BackupError("too-large");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError("not-json");
  }
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    (data as ActivityBackup).format !== backupFormat ||
    !Array.isArray((data as ActivityBackup).activities)
  )
    throw new BackupError("wrong-format");
  const backup = data as ActivityBackup;
  if (backup.version !== backupVersion)
    throw new BackupError("unsupported-version");
  if (backup.activities.length > maxBackupActivities)
    throw new BackupError("too-many");
  const ids = new Set<string>();
  return backup.activities.map((value) => {
    let activity: RecordedActivity;
    try {
      activity = validateActivity(value);
    } catch {
      throw new BackupError("invalid-activity");
    }
    if (activity.state !== "finished") throw new BackupError("invalid-activity");
    if (ids.has(activity.id)) throw new BackupError("duplicate-id");
    ids.add(activity.id);
    return activity;
  });
}

/** Existing local activities always win; an imported ID already present is skipped. */
export function planImport(
  incoming: readonly RecordedActivity[],
  existingIds: Iterable<string>,
) {
  const existing = new Set(existingIds);
  const add = incoming.filter((a) => !existing.has(a.id));
  return { add, skipped: incoming.length - add.length };
}
