"use client";

import {
  DB_NAME,
  DB_VERSION,
  META_APP_VERSION_KEY,
  META_CARD_CANVAS_MIGRATED_KEY,
  META_PAIRS_DEDUPED_KEY,
  META_PAIRED_WITH_CLEANED_KEY,
  META_PAIRS_MIGRATED_KEY,
  META_STORE,
} from "@/lib/hqcc-dexie";

export { META_STORE };
export {
  META_CARD_CANVAS_MIGRATED_KEY,
  META_PAIRS_DEDUPED_KEY,
  META_PAIRED_WITH_CLEANED_KEY,
  META_PAIRS_MIGRATED_KEY,
};

export function ensureIndexedDbAvailable(): void {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    throw new Error("IndexedDB not available");
  }
}

async function readExistingDatabaseInfo(name: string): Promise<IDBDatabaseInfo | null> {
  ensureIndexedDbAvailable();

  if (typeof window.indexedDB.databases !== "function") {
    return null;
  }

  const databases = await window.indexedDB.databases();
  return databases.find((database) => database.name === name) ?? null;
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

export async function probeHqccDbVersion(): Promise<number | null> {
  const info = await readExistingDatabaseInfo(DB_NAME);
  if (!info) {
    return null;
  }

  const db = await openNativeHqccDb(DB_VERSION);
  try {
    return Number.isFinite(db.version) ? db.version : null;
  } finally {
    db.close();
  }
}

export async function readExistingHqccDbVersion(): Promise<number | null> {
  const info = await readExistingDatabaseInfo(DB_NAME);
  if (!info) {
    return null;
  }

  const db = await openNativeHqccDb();
  try {
    return Number.isFinite(db.version) ? db.version : null;
  } finally {
    db.close();
  }
}

export async function readExistingHqccDbAppVersion(): Promise<string | null> {
  const info = await readExistingDatabaseInfo(DB_NAME);
  if (!info) {
    return null;
  }

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
