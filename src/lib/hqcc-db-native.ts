"use client";

import { DB_NAME, DB_VERSION, META_APP_VERSION_KEY, META_STORE } from "@/lib/hqcc-dexie";
import { APP_VERSION } from "@/version";

export { META_STORE };
export const META_PAIRS_MIGRATED_KEY = "pairsMigrated";
export const META_PAIRS_DEDUPED_KEY = "pairsDeduped";
export const META_PAIRED_WITH_CLEANED_KEY = "pairedWithCleaned";
export const META_CARD_CANVAS_MIGRATED_KEY = "cardCanvasMigrated";

export function ensureIndexedDbAvailable(): void {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    throw new Error("IndexedDB not available");
  }
}

export async function openNativeHqccDb(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      ensureIndexedDbAvailable();
    } catch (error) {
      reject(error);
      return;
    }

    const request =
      typeof version === "number"
        ? window.indexedDB.open(DB_NAME, version)
        : window.indexedDB.open(DB_NAME);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open hqcc DB"));
    };
  });
}

export async function ensureMetaAppVersionRecord(db: IDBDatabase): Promise<void> {
  if (!db.objectStoreNames.contains(META_STORE)) {
    return;
  }

  const existingRecord = await new Promise<{ value?: string; dbVersion?: number } | undefined>(
    (resolve, reject) => {
      const tx = db.transaction(META_STORE, "readonly");
      const store = tx.objectStore(META_STORE);
      const request = store.get(META_APP_VERSION_KEY);
      request.onsuccess = () =>
        resolve(
          (request.result as { value?: string; dbVersion?: number } | undefined) ?? undefined,
        );
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to read appVersion metadata"));
    },
  );

  if (existingRecord?.value && existingRecord.dbVersion === DB_VERSION) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readwrite");
    const store = tx.objectStore(META_STORE);
    const request = store.put({
      id: META_APP_VERSION_KEY,
      value: APP_VERSION,
      dbVersion: DB_VERSION,
      updatedAt: Date.now(),
    });
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to store appVersion metadata"));
  });
}

export async function probeHqccDbVersion(): Promise<number | null> {
  const db = await openNativeHqccDb(DB_VERSION);
  try {
    return Number.isFinite(db.version) ? db.version : null;
  } finally {
    db.close();
  }
}

export async function readExistingHqccDbVersion(): Promise<number | null> {
  const db = await openNativeHqccDb();
  try {
    return Number.isFinite(db.version) ? db.version : null;
  } finally {
    db.close();
  }
}

export async function readExistingHqccDbAppVersion(): Promise<string | null> {
  const db = await openNativeHqccDb();
  if (!db.objectStoreNames.contains(META_STORE)) {
    db.close();
    return null;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    const getRequest = store.get(META_APP_VERSION_KEY);

    getRequest.onsuccess = () => {
      const record = getRequest.result as { value?: string } | undefined;
      db.close();
      resolve(record?.value ?? null);
    };

    getRequest.onerror = () => {
      db.close();
      reject(getRequest.error ?? new Error("Failed to read hqcc meta store"));
    };
  });
}
