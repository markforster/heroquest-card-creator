export type StoragePersistenceState =
  | "protected"
  | "not-protected"
  | "unsupported"
  | "unable-to-check";

export function supportsStoragePersistence(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.persisted === "function" &&
    typeof navigator.storage?.persist === "function"
  );
}

export async function checkStoragePersistence(): Promise<StoragePersistenceState> {
  if (!supportsStoragePersistence()) {
    return "unsupported";
  }

  try {
    return (await navigator.storage.persisted()) ? "protected" : "not-protected";
  } catch {
    return "unable-to-check";
  }
}

export async function requestStoragePersistence(): Promise<StoragePersistenceState> {
  if (!supportsStoragePersistence()) {
    return "unsupported";
  }

  try {
    if (await navigator.storage.persisted()) {
      return "protected";
    }

    return (await navigator.storage.persist()) ? "protected" : "not-protected";
  } catch {
    return "unable-to-check";
  }
}
