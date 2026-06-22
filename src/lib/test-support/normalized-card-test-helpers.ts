import { buildNormalizedCardRecords } from "@/lib/cards-normalized";
import { openHqccDexieDb } from "@/lib/hqcc-dexie";
import type { CardRecord } from "@/types/cards-db";

export async function seedNormalizedCard(record: CardRecord): Promise<void> {
  const db = await openHqccDexieDb();
  const bundle = buildNormalizedCardRecords(record);

  if (!bundle) {
    throw new Error("Failed to build normalized card bundle");
  }

  await db.cardsBase.put(bundle.baseRecord);
  await db.cardSlotLinks.bulkPut(bundle.slotLinks);
  if (bundle.backgrounds.length) await db.cardBackgroundComponents.bulkPut(bundle.backgrounds);
  if (bundle.borders.length) await db.cardBorderComponents.bulkPut(bundle.borders);
  if (bundle.titles.length) await db.cardTitleComponents.bulkPut(bundle.titles);
  if (bundle.texts.length) await db.cardTextComponents.bulkPut(bundle.texts);
  if (bundle.copyrights.length) await db.cardCopyrightComponents.bulkPut(bundle.copyrights);
  if (bundle.images.length) await db.cardImageComponents.bulkPut(bundle.images);
  if (bundle.icons.length) await db.cardIconComponents.bulkPut(bundle.icons);
  if (bundle.heroStats.length) await db.cardHeroStatsComponents.bulkPut(bundle.heroStats);
  if (bundle.monsterStats.length) {
    await db.cardMonsterStatsComponents.bulkPut(bundle.monsterStats);
  }
}

export async function seedNormalizedThumbnail(
  input: {
    cardId: string;
    thumbnailBlob: Blob;
    createdAt?: number;
    updatedAt?: number;
  },
): Promise<void> {
  const db = await openHqccDexieDb();
  await db.cardThumbnails.put({
    id: input.cardId,
    cardId: input.cardId,
    thumbnailBlob: input.thumbnailBlob,
    createdAt: input.createdAt ?? 1,
    updatedAt: input.updatedAt ?? input.createdAt ?? 1,
    schemaVersion: 1,
  });
}
