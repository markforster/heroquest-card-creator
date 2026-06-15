"use client";

import { SCALE_X, SCALE_Y } from "@/config/card-canvas";
import { META_CARD_CANVAS_MIGRATED_KEY, META_STORE } from "@/lib/hqcc-db-native";
import type { CardRecord } from "@/types/cards-db";

export async function migrateCardCanvas(db: IDBDatabase): Promise<void> {
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
