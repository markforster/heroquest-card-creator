"use client";

import { SCALE_X, SCALE_Y } from "@/config/card-canvas";
import {
  META_CARD_CANVAS_MIGRATED_KEY,
  openHqccDexieDb,
} from "@/lib/hqcc-dexie";
import type { CardRecord } from "@/types/cards-db";

type HqccDexieDb = Awaited<ReturnType<typeof openHqccDexieDb>>;

export async function migrateCardCanvas(db?: HqccDexieDb): Promise<void> {
  const dexieDb = db ?? (await openHqccDexieDb());

  const alreadyMigrated = await dexieDb.meta.get(META_CARD_CANVAS_MIGRATED_KEY);
  if (Boolean(alreadyMigrated?.value)) {
    return;
  }

  await dexieDb.transaction("rw", dexieDb.cards, dexieDb.meta, async () => {
    const cards = await dexieDb.cards.toArray();

    for (const card of cards) {
      if (card.schemaVersion !== 1) {
        continue;
      }

      const next: CardRecord = {
        ...card,
        schemaVersion: 2,
        imageOffsetX:
          typeof card.imageOffsetX === "number" ? card.imageOffsetX * SCALE_X : card.imageOffsetX,
        imageOffsetY:
          typeof card.imageOffsetY === "number" ? card.imageOffsetY * SCALE_Y : card.imageOffsetY,
      };

      await dexieDb.cards.put(next);
    }

    await dexieDb.meta.put({
      id: META_CARD_CANVAS_MIGRATED_KEY,
      value: true,
      updatedAt: Date.now(),
    });
  });
}
