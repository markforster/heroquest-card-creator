"use client";

import { APP_VERSION } from "@/version";

export const DB_NAME = "hqcc";
export const DB_VERSION = 3;
const META_STORE = "meta";
const META_APP_VERSION_KEY = "appVersion";

export type HqccDb = IDBDatabase;

export async function openHqccDb(): Promise<HqccDb> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // Cards store for drafts and saved cards. The concrete CardRecord
      // shape and indexes are defined in docs/card-stockpile.v1.md and
      // will be wired in a later iteration.
      if (!db.objectStoreNames.contains("cards")) {
        db.createObjectStore("cards", { keyPath: "id" });
      }

      // Assets store placeholder so we can later consolidate the existing
      // assets DB into this shared "hqcc" database. For now, the app still
      // uses src/lib/assets-db.ts with its own DB; this store is unused.
      if (!db.objectStoreNames.contains("assets")) {
        const assetsStore = db.createObjectStore("assets", { keyPath: "id" });
        if (!assetsStore.indexNames.contains("createdAt")) {
          assetsStore.createIndex("createdAt", "createdAt", { unique: false });
        }
      }

      if (!db.objectStoreNames.contains("collections")) {
        db.createObjectStore("collections", { keyPath: "id" });
      }

      const metaStore = db.objectStoreNames.contains(META_STORE)
        ? request.transaction?.objectStore(META_STORE)
        : db.createObjectStore(META_STORE, { keyPath: "id" });

      metaStore?.put({
        id: META_APP_VERSION_KEY,
        value: APP_VERSION,
        dbVersion: DB_VERSION,
        updatedAt: Date.now(),
      });
    };

    request.onsuccess = () => {
      // eslint-disable-next-line no-console
      console.debug("[hqcc-db] openHqccDb success");
      resolve(request.result);
    };

    request.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[hqcc-db] openHqccDb error", request.error);
      reject(request.error ?? new Error("Failed to open hqcc DB"));
    };
  });
}

export async function readExistingHqccDbVersion(): Promise<number | null> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME);

    request.onsuccess = () => {
      const db = request.result;
      const version = Number.isFinite(db.version) ? db.version : null;
      db.close();
      resolve(version);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open hqcc DB"));
    };
  });
}

export async function readExistingHqccDbAppVersion(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME);

    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.close();
        resolve(null);
        return;
      }

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
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open hqcc DB"));
    };
  });
}
