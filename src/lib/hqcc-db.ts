"use client";

import { APP_VERSION } from "@/version";
import type { CardRecord } from "@/types/cards-db";
import type { PairRecord } from "@/types/pairs-db";

import { generateId } from ".";

export const DB_NAME = "hqcc";
export const DB_VERSION = 5;
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
      const { oldVersion } = request;

      // Cards store for drafts and saved cards. The concrete CardRecord
      // shape and indexes are defined in docs/card-stockpile.v1.md and
      // will be wired in a later iteration.
      if (!db.objectStoreNames.contains("cards")) {
        db.createObjectStore("cards", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("pairs")) {
        const pairsStore = db.createObjectStore("pairs", { keyPath: "id" });
        if (!pairsStore.indexNames.contains("frontFaceId")) {
          pairsStore.createIndex("frontFaceId", "frontFaceId", { unique: false });
        }
        if (!pairsStore.indexNames.contains("backFaceId")) {
          pairsStore.createIndex("backFaceId", "backFaceId", { unique: false });
        }
        if (!pairsStore.indexNames.contains("nameLower")) {
          pairsStore.createIndex("nameLower", "nameLower", { unique: false });
        }
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

      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
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

      if (oldVersion < 5) {
        const tx = request.transaction;
        const cardsStore = tx?.objectStore("cards");
        const pairsStore = tx?.objectStore("pairs");
        if (cardsStore && pairsStore) {
          const getAllRequest = cardsStore.getAll();
          getAllRequest.onsuccess = () => {
            const cards = (getAllRequest.result as CardRecord[] | undefined) ?? [];
            if (!cards.length) return;

            const cardById = new Map<string, CardRecord>();
            cards.forEach((card) => {
              cardById.set(card.id, card);
            });

            let createdCount = 0;
            let skippedMissingBack = 0;
            let skippedInvalid = 0;

            cards.forEach((card) => {
              if (card.face === "back" || !card.pairedWith) return;
              if (card.pairedWith === card.id) {
                skippedInvalid += 1;
                return;
              }
              const backCard = cardById.get(card.pairedWith);
              if (!backCard) {
                skippedMissingBack += 1;
                return;
              }

              const frontName = card.title ?? card.name ?? "Untitled front";
              const backName = backCard.title ?? backCard.name ?? "Untitled back";
              const name = `${frontName} - ${backName}`;

              const now = Date.now();
              const pair: PairRecord = {
                id: generateId(),
                name,
                nameLower: name.toLocaleLowerCase(),
                frontFaceId: card.id,
                backFaceId: backCard.id,
                createdAt: now,
                updatedAt: now,
                schemaVersion: 1,
              };

              const addRequest = pairsStore.add(pair);
              addRequest.onsuccess = () => {
                createdCount += 1;
              };
            });

            const txRef = cardsStore.transaction;
            txRef.oncomplete = () => {
              // eslint-disable-next-line no-console
              console.debug("[hqcc-db] pair migration", {
                cardsScanned: cards.length,
                pairsCreated: createdCount,
                skippedMissingBack,
                skippedInvalid,
              });
            };
          };
        }
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
