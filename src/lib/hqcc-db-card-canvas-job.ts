"use client";

import {
  META_CARD_CANVAS_ROLLBACK_MIGRATED_KEY,
  openHqccDexieDb,
} from "@/lib/hqcc-dexie";

type HqccDexieDb = Awaited<ReturnType<typeof openHqccDexieDb>>;

const PREVIOUS_CARD_WIDTH = 756;
const PREVIOUS_CARD_HEIGHT = 1056;
const NEXT_CARD_WIDTH = 750;
const NEXT_CARD_HEIGHT = 1050;
const OFFSET_SCALE_X = NEXT_CARD_WIDTH / PREVIOUS_CARD_WIDTH;
const OFFSET_SCALE_Y = NEXT_CARD_HEIGHT / PREVIOUS_CARD_HEIGHT;

function scaleIfNumber(value: number | undefined, scale: number): number | undefined {
  return typeof value === "number" ? value * scale : value;
}

export async function migrateCardCanvas(db?: HqccDexieDb): Promise<void> {
  const dexieDb = db ?? (await openHqccDexieDb());

  const alreadyMigrated = await dexieDb.meta.get(META_CARD_CANVAS_ROLLBACK_MIGRATED_KEY);
  if (Boolean(alreadyMigrated?.value)) {
    return;
  }

  await dexieDb.transaction(
    "rw",
    dexieDb.meta,
    dexieDb.cardImageComponents,
    dexieDb.cardIconComponents,
    async () => {
      const [imageComponents, iconComponents] = await Promise.all([
        dexieDb.cardImageComponents.toArray(),
        dexieDb.cardIconComponents.toArray(),
      ]);

      await Promise.all([
        ...imageComponents.map((component) =>
          dexieDb.cardImageComponents.put({
            ...component,
            offsetX: scaleIfNumber(component.offsetX, OFFSET_SCALE_X),
            offsetY: scaleIfNumber(component.offsetY, OFFSET_SCALE_Y),
            updatedAt: Date.now(),
          }),
        ),
        ...iconComponents.map((component) =>
          dexieDb.cardIconComponents.put({
            ...component,
            offsetX: scaleIfNumber(component.offsetX, OFFSET_SCALE_X),
            offsetY: scaleIfNumber(component.offsetY, OFFSET_SCALE_Y),
            updatedAt: Date.now(),
          }),
        ),
      ]);

      await dexieDb.meta.put({
        id: META_CARD_CANVAS_ROLLBACK_MIGRATED_KEY,
        value: true,
        updatedAt: Date.now(),
      });
    },
  );
}
