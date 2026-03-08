"use client";

import { SCALE_X, SCALE_Y } from "@/config/card-canvas";
import type { CardRecord } from "@/types/cards-db";
import type { PairRecord } from "@/types/pairs-db";
import { APP_VERSION } from "@/version";

import { generateId } from ".";

export const DB_NAME = "hqcc";
export const DB_VERSION = 5;
const META_STORE = "meta";
const META_APP_VERSION_KEY = "appVersion";
const META_PAIRS_MIGRATED_KEY = "pairsMigrated";
const META_PAIRS_DEDUPED_KEY = "pairsDeduped";
const META_PAIRED_WITH_CLEANED_KEY = "pairedWithCleaned";
const META_CARD_CANVAS_MIGRATED_KEY = "cardCanvasMigrated";
let pairMaintenanceInFlight: Promise<void> | null = null;
let cardCanvasMigrationInFlight: Promise<void> | null = null;

export type HqccDb = IDBDatabase;

async function backfillPairsFromLegacy(db: HqccDb): Promise<void> {
  if (!db.objectStoreNames.contains("cards") || !db.objectStoreNames.contains("pairs")) {
    return;
  }

  const countPairs = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction("pairs", "readonly");
    const store = tx.objectStore("pairs");
    const request = store.count();
    request.onsuccess = () => resolve(request.result ?? 0);
    request.onerror = () => reject(request.error ?? new Error("Failed to count pairs"));
  });

  if (countPairs > 0) {
    return;
  }

  const cards = await new Promise<CardRecord[]>((resolve, reject) => {
    const tx = db.transaction("cards", "readonly");
    const store = tx.objectStore("cards");
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as CardRecord[] | undefined) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Failed to read cards"));
  });

  if (!cards.length) return;

  const cardById = new Map<string, CardRecord>();
  cards.forEach((card) => {
    cardById.set(card.id, card);
  });

  const existingKeys = new Set<string>();
  const existingPairs = await new Promise<PairRecord[]>((resolve, reject) => {
    const tx = db.transaction("pairs", "readonly");
    const store = tx.objectStore("pairs");
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as PairRecord[] | undefined) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Failed to read existing pairs"));
  });
  existingPairs.forEach((pair) => {
    const key = `${pair.frontFaceId ?? ""}::${pair.backFaceId ?? ""}`;
    existingKeys.add(key);
  });

  let createdCount = 0;
  let skippedDuplicate = 0;
  let skippedMissingBack = 0;
  let skippedInvalid = 0;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["pairs"], "readwrite");
    const pairsStore = tx.objectStore("pairs");

    cards.forEach((card) => {
      const pairedWith = (card as CardRecord & { pairedWith?: string | null }).pairedWith ?? null;
      if (card.face === "back" || !pairedWith) return;
      if (pairedWith === card.id) {
        skippedInvalid += 1;
        return;
      }
      const backCard = cardById.get(pairedWith);
      if (!backCard) {
        skippedMissingBack += 1;
        return;
      }

      const key = `${card.id}::${backCard.id}`;
      if (existingKeys.has(key)) {
        skippedDuplicate += 1;
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
        existingKeys.add(key);
      };
      addRequest.onerror = () => {
        // eslint-disable-next-line no-console
        console.debug("[hqcc-db] pair backfill add failed", addRequest.error);
      };
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to backfill pairs"));
  });

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readwrite");
    const store = tx.objectStore(META_STORE);
    const request = store.put({
      id: META_PAIRS_MIGRATED_KEY,
      value: true,
      updatedAt: Date.now(),
    });
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to store pairsMigrated flag"));
  });

  // eslint-disable-next-line no-console
  console.debug("[hqcc-db] pair backfill", {
    cardsScanned: cards.length,
    pairsCreated: createdCount,
    skippedDuplicate,
    skippedMissingBack,
    skippedInvalid,
  });
}

async function dedupePairsFromStore(db: HqccDb): Promise<void> {
  if (!db.objectStoreNames.contains("pairs") || !db.objectStoreNames.contains(META_STORE)) {
    return;
  }

  const alreadyDeduped = await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    const request = store.get(META_PAIRS_DEDUPED_KEY);
    request.onsuccess = () => {
      resolve(Boolean((request.result as { value?: boolean } | undefined)?.value));
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read pairsDeduped flag"));
  });
  if (alreadyDeduped) return;

  const pairs = await new Promise<PairRecord[]>((resolve, reject) => {
    const tx = db.transaction("pairs", "readonly");
    const store = tx.objectStore("pairs");
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as PairRecord[] | undefined) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Failed to read pairs"));
  });
  if (!pairs.length) return;

  const seen = new Set<string>();
  const duplicates: string[] = [];
  pairs.forEach((pair) => {
    const key = `${pair.frontFaceId ?? ""}::${pair.backFaceId ?? ""}`;
    if (seen.has(key)) {
      duplicates.push(pair.id);
      return;
    }
    seen.add(key);
  });

  if (duplicates.length === 0) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, "readwrite");
      const store = tx.objectStore(META_STORE);
      const request = store.put({
        id: META_PAIRS_DEDUPED_KEY,
        value: true,
        updatedAt: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to store pairsDeduped flag"));
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["pairs", META_STORE], "readwrite");
    const pairsStore = tx.objectStore("pairs");
    const metaStore = tx.objectStore(META_STORE);
    duplicates.forEach((id) => {
      pairsStore.delete(id);
    });
    metaStore.put({
      id: META_PAIRS_DEDUPED_KEY,
      value: true,
      updatedAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to dedupe pairs"));
  });

  // eslint-disable-next-line no-console
  console.debug("[hqcc-db] pair dedupe", { removed: duplicates.length });
}

async function cleanupLegacyPairedWith(db: HqccDb): Promise<void> {
  if (!db.objectStoreNames.contains("cards") || !db.objectStoreNames.contains(META_STORE)) {
    return;
  }

  const alreadyCleaned = await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    const request = store.get(META_PAIRED_WITH_CLEANED_KEY);
    request.onsuccess = () => {
      resolve(Boolean((request.result as { value?: boolean } | undefined)?.value));
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read pairedWithCleaned flag"));
  });
  if (alreadyCleaned) return;

  const cards = await new Promise<CardRecord[]>((resolve, reject) => {
    const tx = db.transaction("cards", "readonly");
    const store = tx.objectStore("cards");
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as CardRecord[] | undefined) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Failed to read cards"));
  });

  if (!cards.length) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, "readwrite");
      const store = tx.objectStore(META_STORE);
      const request = store.put({
        id: META_PAIRED_WITH_CLEANED_KEY,
        value: true,
        updatedAt: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to store pairedWithCleaned flag"));
    });
    return;
  }

  const toUpdate = cards.filter((card) => "pairedWith" in card);
  if (!toUpdate.length) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, "readwrite");
      const store = tx.objectStore(META_STORE);
      const request = store.put({
        id: META_PAIRED_WITH_CLEANED_KEY,
        value: true,
        updatedAt: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to store pairedWithCleaned flag"));
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["cards", META_STORE], "readwrite");
    const cardsStore = tx.objectStore("cards");
    const metaStore = tx.objectStore(META_STORE);
    toUpdate.forEach((card) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pairedWith, ...rest } = card as CardRecord & { pairedWith?: string | null };
      cardsStore.put(rest);
    });
    metaStore.put({
      id: META_PAIRED_WITH_CLEANED_KEY,
      value: true,
      updatedAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to clean pairedWith"));
  });

  // eslint-disable-next-line no-console
  console.debug("[hqcc-db] pairedWith cleanup", { updated: toUpdate.length });
}

async function migrateCardCanvas(db: HqccDb): Promise<void> {
  if (!db.objectStoreNames.contains("cards") || !db.objectStoreNames.contains(META_STORE)) {
    return;
  }

  const alreadyMigrated = await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    const request = store.get(META_CARD_CANVAS_MIGRATED_KEY);
    request.onsuccess = () => {
      resolve(Boolean((request.result as { value?: boolean } | undefined)?.value));
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read cardCanvasMigrated flag"));
  });
  if (alreadyMigrated) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["cards", META_STORE], "readwrite");
    const cardsStore = tx.objectStore("cards");
    const metaStore = tx.objectStore(META_STORE);
    const getAllRequest = cardsStore.getAll();

    getAllRequest.onsuccess = () => {
      const cards = (getAllRequest.result as CardRecord[] | undefined) ?? [];
      cards.forEach((card) => {
        if (card.schemaVersion !== 1) return;
        const next: CardRecord = {
          ...card,
          schemaVersion: 2,
          imageOffsetX:
            typeof card.imageOffsetX === "number" ? card.imageOffsetX * SCALE_X : card.imageOffsetX,
          imageOffsetY:
            typeof card.imageOffsetY === "number" ? card.imageOffsetY * SCALE_Y : card.imageOffsetY,
        };
        cardsStore.put(next);
      });

      metaStore.put({
        id: META_CARD_CANVAS_MIGRATED_KEY,
        value: true,
        updatedAt: Date.now(),
      });
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to migrate card canvas data"));
  });
}

export async function openHqccDb(): Promise<HqccDb> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const { oldVersion } = event;

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
              const pairedWith =
                (card as CardRecord & { pairedWith?: string | null }).pairedWith ?? null;
              if (card.face === "back" || !pairedWith) return;
              if (pairedWith === card.id) {
                skippedInvalid += 1;
                return;
              }
              const backCard = cardById.get(pairedWith);
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

            const metaStore = request.transaction?.objectStore(META_STORE);
            metaStore?.put({
              id: META_PAIRS_MIGRATED_KEY,
              value: true,
              updatedAt: Date.now(),
            });
            // eslint-disable-next-line no-console
            console.debug("[hqcc-db] pair migration", {
              cardsScanned: cards.length,
              pairsCreated: createdCount,
              skippedMissingBack,
              skippedInvalid,
            });
          };
        }
      }
    };

    request.onsuccess = () => {
      // eslint-disable-next-line no-console
      console.debug("[hqcc-db] openHqccDb success");
      const db = request.result;
      if (!pairMaintenanceInFlight) {
        pairMaintenanceInFlight = dedupePairsFromStore(db)
          .then(() => backfillPairsFromLegacy(db))
          .then(() => cleanupLegacyPairedWith(db))
          .catch(() => {
            // Ignore dedupe/backfill failures.
          })
          .finally(() => {
            pairMaintenanceInFlight = null;
          });
      }
      if (!cardCanvasMigrationInFlight) {
        cardCanvasMigrationInFlight = migrateCardCanvas(db)
          .catch(() => {
            // Ignore migration failures.
          })
          .finally(() => {
            cardCanvasMigrationInFlight = null;
          });
      }
      resolve(db);
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
