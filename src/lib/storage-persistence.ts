/** Browser storage durability for local activity history. */
export type PersistenceStatus = "persisted" | "best-effort" | "unsupported";
type StorageManagerLike = Pick<StorageManager, "persisted" | "persist">;
function manager(): StorageManagerLike | null {
  const storage =
    typeof navigator !== "undefined" ? navigator.storage : undefined;
  return storage &&
    typeof storage.persisted === "function" &&
    typeof storage.persist === "function"
    ? storage
    : null;
}
export async function persistenceStatus(
  storage: StorageManagerLike | null = manager(),
): Promise<PersistenceStatus> {
  if (!storage) return "unsupported";
  try {
    return (await storage.persisted()) ? "persisted" : "best-effort";
  } catch {
    return "unsupported";
  }
}
/** Some browsers grant silently, some ask, some always decline; never throws. */
export async function requestPersistence(
  storage: StorageManagerLike | null = manager(),
): Promise<PersistenceStatus> {
  if (!storage) return "unsupported";
  try {
    if (await storage.persisted()) return "persisted";
    return (await storage.persist()) ? "persisted" : "best-effort";
  } catch {
    return "unsupported";
  }
}
