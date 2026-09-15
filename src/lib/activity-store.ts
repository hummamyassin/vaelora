import {
  validateActivity,
  type RecordedActivity,
} from "../domain/tracking/activity.ts";
const databaseName = "vaelora-activities";
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("activities", { keyPath: "id" });
      db.createObjectStore("draft", { keyPath: "id" });
    };
    request.onerror = () => reject(new Error("Local storage unavailable"));
    request.onblocked = () =>
      reject(new Error("Close other VAELORA tabs to update storage"));
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}
async function transact<T>(
  store: string,
  mode: IDBTransactionMode,
  work: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = work(tx.objectStore(store));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () =>
        reject(new Error("Local activity storage failed"));
    });
  } finally {
    db.close();
  }
}
export async function saveActivity(value: RecordedActivity) {
  const a = validateActivity(value);
  if (a.state !== "finished") throw new Error("Activity is not finished");
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["activities", "draft"], "readwrite");
      tx.objectStore("activities").put(a);
      tx.objectStore("draft").delete(a.id);
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () =>
        reject(new Error("Activity could not be saved"));
    });
  } finally {
    db.close();
  }
}
export async function saveDraft(a: RecordedActivity) {
  if (a.state === "finished" || a.state === "idle") return;
  await transact("draft", "readwrite", (s) => s.put(validateActivity(a)));
}
export async function loadActivities() {
  const data = await transact<unknown[]>("activities", "readonly", (s) =>
    s.getAll(),
  );
  return data.map(validateActivity).sort((a, b) => b.startedAt - a.startedAt);
}
export async function loadDrafts() {
  const data = await transact<unknown[]>("draft", "readonly", (s) =>
    s.getAll(),
  );
  return data.map(validateActivity).sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function deleteActivity(id: string) {
  await transact("activities", "readwrite", (s) => s.delete(id));
}
export async function deleteDraft(id: string) {
  await transact("draft", "readwrite", (s) => s.delete(id));
}
