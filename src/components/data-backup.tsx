"use client";
import { useEffect, useRef, useState } from "react";
import { Download, ShieldCheck, ShieldAlert, Upload } from "lucide-react";
import {
  BackupError,
  backupFileName,
  createBackup,
  parseBackup,
  serializeBackup,
} from "../domain/tracking/backup";
import type { RecordedActivity } from "../domain/tracking/activity";
import { importActivities, loadActivities } from "../lib/activity-store";
import {
  persistenceStatus,
  requestPersistence,
  type PersistenceStatus,
} from "../lib/storage-persistence";
import { profileCopy } from "../lib/copy/profile";
import { translator, type Locale } from "../lib/i18n";

const errorKey = {
  "too-large": "errTooLarge",
  "not-json": "errNotJson",
  "wrong-format": "errFormat",
  "unsupported-version": "errVersion",
  "too-many": "errTooMany",
  "invalid-activity": "errInvalid",
  "duplicate-id": "errDuplicate",
} as const;

/** Local backup and restore. Files are read and written on the device only. */
export function DataBackup({
  locale,
  busy,
  onImported,
}: {
  locale: Locale;
  busy: boolean;
  onImported: () => void;
}) {
  const c = translator(profileCopy, locale);
  const [status, setStatus] = useState<PersistenceStatus | null>(null),
    [message, setMessage] = useState<{ tone: "good" | "danger" | "caution"; text: string } | null>(null),
    [working, setWorking] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    void persistenceStatus().then((s) => live && setStatus(s));
    return () => {
      live = false;
    };
  }, []);
  async function protect() {
    const next = await requestPersistence();
    setStatus(next);
    if (next !== "persisted") setMessage({ tone: "caution", text: c("protectDeclined") });
  }
  async function exportBackup() {
    setWorking(true);
    setMessage(null);
    try {
      const rows: RecordedActivity[] = await loadActivities();
      const backup = createBackup(rows);
      const blob = new Blob([serializeBackup(backup)], { type: "application/json" });
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = backupFileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage({ tone: "good", text: c("exported", { count: backup.activities.length }) });
    } catch {
      setMessage({ tone: "danger", text: c("exportFailed") });
    } finally {
      setWorking(false);
    }
  }
  async function importBackup(selected: File | undefined) {
    if (!selected) return;
    if (busy) {
      setMessage({ tone: "caution", text: c("importBusy") });
      return;
    }
    setWorking(true);
    setMessage(null);
    try {
      const incoming = parseBackup(await selected.text());
      if (!incoming.length) {
        setMessage({ tone: "caution", text: c("importedNone") });
        return;
      }
      const result = await importActivities(incoming);
      if (!result.added) setMessage({ tone: "caution", text: c("importedNone") });
      else {
        setMessage({ tone: "good", text: c("imported", result) });
        onImported();
      }
    } catch (e) {
      setMessage({
        tone: "danger",
        text: e instanceof BackupError ? c(errorKey[e.code]) : c("errStorage"),
      });
    } finally {
      setWorking(false);
      if (file.current) file.current.value = "";
    }
  }
  const protectedOn = status === "persisted";
  return (
    <div className="backup">
      <p className="section-note">{c("dataIntro")}</p>
      {status && (
        <div className="storage-status" data-state={status}>
          {protectedOn ? <ShieldCheck aria-hidden /> : <ShieldAlert aria-hidden />}
          <span className="row-main">
            <span className="row-title">
              {protectedOn
                ? c("storagePersisted")
                : status === "best-effort"
                  ? c("storageBestEffort")
                  : c("storageUnsupported")}
            </span>
            <span className="row-meta">
              {protectedOn
                ? c("storagePersistedNote")
                : status === "best-effort"
                  ? c("storageBestEffortNote")
                  : c("storageUnsupportedNote")}
            </span>
          </span>
          {status === "best-effort" && (
            <button className="btn btn-secondary btn-sm" onClick={() => void protect()}>
              {c("protect")}
            </button>
          )}
        </div>
      )}
      <div className="backup-actions">
        <button className="btn btn-secondary" disabled={working} onClick={() => void exportBackup()}>
          <Download aria-hidden />
          {c("exportBackup")}
        </button>
        <button className="btn btn-secondary" disabled={working} onClick={() => file.current?.click()}>
          <Upload aria-hidden />
          {c("importBackup")}
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void importBackup(e.target.files?.[0])}
        />
      </div>
      <p className="fine">{c("backupNote")}</p>
      {message && (
        <p className="notice" data-tone={message.tone} role={message.tone === "danger" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
