"use client";

import {
  META_CARD_CANVAS_MIGRATED_KEY,
  openHqccDexieDb,
} from "@/lib/hqcc-dexie";

type HqccDexieDb = Awaited<ReturnType<typeof openHqccDexieDb>>;

export async function migrateCardCanvas(db?: HqccDexieDb): Promise<void> {
  const dexieDb = db ?? (await openHqccDexieDb());

  const alreadyMigrated = await dexieDb.meta.get(META_CARD_CANVAS_MIGRATED_KEY);
  if (Boolean(alreadyMigrated?.value)) {
    return;
  }

  await dexieDb.transaction("rw", dexieDb.meta, async () => {
    await dexieDb.meta.put({
      id: META_CARD_CANVAS_MIGRATED_KEY,
      value: true,
      updatedAt: Date.now(),
    });
  });
}
