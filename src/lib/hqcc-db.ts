"use client";

const DB_NAME = "hqcc";
const DB_VERSION = 2;

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
