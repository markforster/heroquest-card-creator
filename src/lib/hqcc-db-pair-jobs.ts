"use client";

import {
  META_PAIRS_DEDUPED_KEY,
  META_PAIRED_WITH_CLEANED_KEY,
  META_PAIRS_MIGRATED_KEY,
  META_STORE,
} from "@/lib/hqcc-db-native";
import type { CardRecord } from "@/types/cards-db";
import type { PairRecord } from "@/types/pairs-db";

import { generateId } from ".";

export async function backfillPairsFromLegacy(db: IDBDatabase): Promise<void> {
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

export async function dedupePairsFromStore(db: IDBDatabase): Promise<void> {
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
    request.onerror = () => reject(request.error ?? new Error("Failed to read pairsDeduped flag"));
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

export async function cleanupLegacyPairedWith(db: IDBDatabase): Promise<void> {
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
