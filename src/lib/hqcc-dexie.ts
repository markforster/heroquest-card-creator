"use client";

import Dexie, { type EntityTable, type Transaction } from "dexie";

import { buildNormalizedCardRecords } from "@/lib/cards-normalized";
import type { AssetRecord } from "@/lib/assets-db";
import type { SettingsRecord } from "@/lib/settings-db";
import type { CardRecord } from "@/types/cards-db";
import type {
  CardBackgroundComponentRecord,
  CardBaseRecord,
  CardBorderComponentRecord,
  CardCopyrightComponentRecord,
  CardHeroStatsComponentRecord,
  CardIconComponentRecord,
  CardImageComponentRecord,
  CardMonsterStatsComponentRecord,
  CardSlotLinkRecord,
  CardTextComponentRecord,
  CardThumbnailRecord,
  CardTitleComponentRecord,
} from "@/types/cards-normalized";
import type { CollectionRecord } from "@/types/collections-db";
import type { DeckEntryRecord, DeckGroupRecord, DeckRecord, DeckSetRecord } from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";
import { APP_VERSION } from "@/version";
import { generateId } from ".";

export const DB_NAME = "hqcc";
export const DB_VERSION = 9;
export const DEXIE_DB_VERSION = 0.9;
export const META_STORE = "meta";
export const META_APP_VERSION_KEY = "appVersion";
export const META_PAIRS_MIGRATED_KEY = "pairsMigrated";
export const META_PAIRS_DEDUPED_KEY = "pairsDeduped";
export const META_CARD_CANVAS_MIGRATED_KEY = "cardCanvasMigrated";
export const META_CARDS_NORMALIZED_TARGET_VERSION_KEY = "cardsNormalizedTargetVersion";
export const META_CARDS_NORMALIZED_STARTED_AT_KEY = "cardsNormalizedStartedAt";
export const META_CARDS_NORMALIZED_COMPLETE_KEY = "cardsNormalizedComplete";

export type MetaRecord = {
  id: string;
  value: boolean | string;
  dbVersion?: number;
  updatedAt: number;
};

type HqccDexieTables = {
  cards: EntityTable<CardRecord, "id">;
  cardsBase: EntityTable<CardBaseRecord, "id">;
  cardThumbnails: EntityTable<CardThumbnailRecord, "id">;
  cardSlotLinks: EntityTable<CardSlotLinkRecord, "id">;
  cardBackgroundComponents: EntityTable<CardBackgroundComponentRecord, "id">;
  cardBorderComponents: EntityTable<CardBorderComponentRecord, "id">;
  cardTitleComponents: EntityTable<CardTitleComponentRecord, "id">;
  cardTextComponents: EntityTable<CardTextComponentRecord, "id">;
  cardCopyrightComponents: EntityTable<CardCopyrightComponentRecord, "id">;
  cardImageComponents: EntityTable<CardImageComponentRecord, "id">;
  cardIconComponents: EntityTable<CardIconComponentRecord, "id">;
  cardHeroStatsComponents: EntityTable<CardHeroStatsComponentRecord, "id">;
  cardMonsterStatsComponents: EntityTable<CardMonsterStatsComponentRecord, "id">;
  pairs: EntityTable<PairRecord, "id">;
  assets: EntityTable<AssetRecord, "id">;
  collections: EntityTable<CollectionRecord, "id">;
  settings: EntityTable<SettingsRecord, "id">;
  decks: EntityTable<DeckRecord, "id">;
  deckGroups: EntityTable<DeckGroupRecord, "id">;
  deckSets: EntityTable<DeckSetRecord, "id">;
  deckEntries: EntityTable<DeckEntryRecord, "id">;
  meta: EntityTable<MetaRecord, "id">;
};

type LegacyPairSourceCard = CardRecord & {
  pairedWith?: string | null;
};

const HQCC_STORES_V4 = {
  cards: "id",
  assets: "id, createdAt",
  collections: "id",
  settings: "id",
  decks: "id",
  deckGroups: "id, deckId",
  deckSets: "id, deckId, groupId, backFaceId",
  deckEntries: "id, deckId, setId, pairId",
  meta: "id",
} as const;

const HQCC_STORES_V5 = {
  ...HQCC_STORES_V4,
  pairs: "id, frontFaceId, backFaceId, nameLower",
} as const;

const HQCC_STORES_V7 = {
  ...HQCC_STORES_V5,
  cardsBase: "id, templateId, status, nameLower, updatedAt",
  cardThumbnails: "id, cardId, updatedAt",
  cardSlotLinks: "id, cardId, slotId, slotType, dataRecordId, order",
  cardBackgroundComponents: "id, cardId, slotId, order",
  cardBorderComponents: "id, cardId, slotId, order",
  cardTitleComponents: "id, cardId, slotId, order",
  cardTextComponents: "id, cardId, slotId, order",
  cardCopyrightComponents: "id, cardId, slotId, order",
  cardImageComponents: "id, cardId, slotId, order",
  cardIconComponents: "id, cardId, slotId, order",
  cardHeroStatsComponents: "id, cardId, slotId, order",
  cardMonsterStatsComponents: "id, cardId, slotId, order",
} as const;

async function writeMetaRecord(
  tx: Transaction,
  record: MetaRecord,
): Promise<string | number | Date | ArrayBuffer | ArrayBufferView> {
  return tx.table(META_STORE).put(record);
}

function createLegacyPairKey(frontFaceId: string, backFaceId: string): string {
  return `${frontFaceId}::${backFaceId}`;
}

async function backfillPairsFromLegacyCards(tx: Transaction): Promise<void> {
  const legacyCards = (await tx.table("cards").toArray()) as LegacyPairSourceCard[];
  if (!legacyCards.length) {
    await writeMetaRecord(tx, {
      id: META_PAIRS_MIGRATED_KEY,
      value: true,
      dbVersion: DB_VERSION,
      updatedAt: Date.now(),
    });
    return;
  }

  const existingPairs = (await tx.table("pairs").toArray()) as PairRecord[];
  const existingKeys = new Set<string>();
  for (let index = 0; index < existingPairs.length; index += 1) {
    const pair = existingPairs[index];
    if (!pair.frontFaceId || !pair.backFaceId) {
      continue;
    }
    existingKeys.add(createLegacyPairKey(pair.frontFaceId, pair.backFaceId));
  }

  const cardById = new Map<string, LegacyPairSourceCard>();
  for (let index = 0; index < legacyCards.length; index += 1) {
    const card = legacyCards[index];
    cardById.set(card.id, card);
  }

  const pairsToCreate: PairRecord[] = [];

  for (let index = 0; index < legacyCards.length; index += 1) {
    const card = legacyCards[index];
    const pairedWith = card.pairedWith ?? null;

    if (card.face === "back" || !pairedWith) {
      continue;
    }

    if (pairedWith === card.id) {
      continue;
    }

    const backCard = cardById.get(pairedWith);
    if (!backCard) {
      continue;
    }

    const key = createLegacyPairKey(card.id, backCard.id);
    if (existingKeys.has(key)) {
      continue;
    }

    const frontName = card.title ?? card.name ?? "Untitled front";
    const backName = backCard.title ?? backCard.name ?? "Untitled back";
    const name = `${frontName} - ${backName}`;
    const now = Date.now();

    pairsToCreate.push({
      id: generateId(),
      name,
      nameLower: name.toLocaleLowerCase(),
      frontFaceId: card.id,
      backFaceId: backCard.id,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    existingKeys.add(key);
  }

  if (pairsToCreate.length > 0) {
    await tx.table("pairs").bulkPut(pairsToCreate);
  }

  await writeMetaRecord(tx, {
    id: META_PAIRS_MIGRATED_KEY,
    value: true,
    dbVersion: DB_VERSION,
    updatedAt: Date.now(),
  });
}

export async function ensureDexieMetaAppVersionRecord(db: HqccDexieDb): Promise<void> {
  const existingRecord = await db.meta.get(META_APP_VERSION_KEY);

  if (existingRecord?.value && existingRecord.dbVersion === DB_VERSION) {
    return;
  }

  await db.meta.put({
    id: META_APP_VERSION_KEY,
    value: APP_VERSION,
    dbVersion: DB_VERSION,
    updatedAt: Date.now(),
  });
}

class HqccDexieDb extends Dexie implements HqccDexieTables {
  cards!: EntityTable<CardRecord, "id">;
  cardsBase!: EntityTable<CardBaseRecord, "id">;
  cardThumbnails!: EntityTable<CardThumbnailRecord, "id">;
  cardSlotLinks!: EntityTable<CardSlotLinkRecord, "id">;
  cardBackgroundComponents!: EntityTable<CardBackgroundComponentRecord, "id">;
  cardBorderComponents!: EntityTable<CardBorderComponentRecord, "id">;
  cardTitleComponents!: EntityTable<CardTitleComponentRecord, "id">;
  cardTextComponents!: EntityTable<CardTextComponentRecord, "id">;
  cardCopyrightComponents!: EntityTable<CardCopyrightComponentRecord, "id">;
  cardImageComponents!: EntityTable<CardImageComponentRecord, "id">;
  cardIconComponents!: EntityTable<CardIconComponentRecord, "id">;
  cardHeroStatsComponents!: EntityTable<CardHeroStatsComponentRecord, "id">;
  cardMonsterStatsComponents!: EntityTable<CardMonsterStatsComponentRecord, "id">;
  pairs!: EntityTable<PairRecord, "id">;
  assets!: EntityTable<AssetRecord, "id">;
  collections!: EntityTable<CollectionRecord, "id">;
  settings!: EntityTable<SettingsRecord, "id">;
  decks!: EntityTable<DeckRecord, "id">;
  deckGroups!: EntityTable<DeckGroupRecord, "id">;
  deckSets!: EntityTable<DeckSetRecord, "id">;
  deckEntries!: EntityTable<DeckEntryRecord, "id">;
  meta!: EntityTable<MetaRecord, "id">;

  constructor() {
    super(DB_NAME);

    this.version(0.4).stores(HQCC_STORES_V4);
    this.version(0.5).stores(HQCC_STORES_V5);
    this.version(0.6)
      .stores(HQCC_STORES_V5)
      .upgrade(async (tx) => {
        await writeMetaRecord(tx, {
          id: META_APP_VERSION_KEY,
          value: APP_VERSION,
          dbVersion: DB_VERSION,
          updatedAt: Date.now(),
        });
      });
    this.version(0.7)
      .stores(HQCC_STORES_V7)
      .upgrade(async (tx) => {
        const migratedAt = Date.now();
        await writeMetaRecord(tx, {
          id: META_CARDS_NORMALIZED_TARGET_VERSION_KEY,
          value: "1",
          dbVersion: DB_VERSION,
          updatedAt: migratedAt,
        });
        await writeMetaRecord(tx, {
          id: META_CARDS_NORMALIZED_STARTED_AT_KEY,
          value: String(migratedAt),
          dbVersion: DB_VERSION,
          updatedAt: migratedAt,
        });

        const legacyCards = (await tx.table("cards").toArray()) as CardRecord[];
        for (const legacyCard of legacyCards) {
          const normalized = buildNormalizedCardRecords(legacyCard);
          if (!normalized) {
            continue;
          }
          await tx.table("cardsBase").put(normalized.baseRecord);
          if (normalized.slotLinks.length > 0) {
            await tx.table("cardSlotLinks").bulkPut(normalized.slotLinks);
          }
          if (normalized.backgrounds.length > 0) {
            await tx.table("cardBackgroundComponents").bulkPut(normalized.backgrounds);
          }
          if (normalized.borders.length > 0) {
            await tx.table("cardBorderComponents").bulkPut(normalized.borders);
          }
          if (normalized.titles.length > 0) {
            await tx.table("cardTitleComponents").bulkPut(normalized.titles);
          }
          if (normalized.texts.length > 0) {
            await tx.table("cardTextComponents").bulkPut(normalized.texts);
          }
          if (normalized.copyrights.length > 0) {
            await tx.table("cardCopyrightComponents").bulkPut(normalized.copyrights);
          }
          if (normalized.images.length > 0) {
            await tx.table("cardImageComponents").bulkPut(normalized.images);
          }
          if (normalized.icons.length > 0) {
            await tx.table("cardIconComponents").bulkPut(normalized.icons);
          }
          if (normalized.heroStats.length > 0) {
            await tx.table("cardHeroStatsComponents").bulkPut(normalized.heroStats);
          }
          if (normalized.monsterStats.length > 0) {
            await tx.table("cardMonsterStatsComponents").bulkPut(normalized.monsterStats);
          }
        }

        await writeMetaRecord(tx, {
          id: META_CARDS_NORMALIZED_COMPLETE_KEY,
          value: true,
          dbVersion: DB_VERSION,
          updatedAt: Date.now(),
        });
      });
    this.version(0.8)
      .stores(HQCC_STORES_V7)
      .upgrade(async (tx) => {
        const legacyCards = (await tx.table("cards").toArray()) as CardRecord[];

        for (let index = 0; index < legacyCards.length; index += 1) {
          const legacyCard = legacyCards[index];
          const thumbnailBlob = legacyCard.thumbnailBlob;
          if (!thumbnailBlob) {
            continue;
          }

          let normalizedBlob = thumbnailBlob;
          if (!normalizedBlob.type) {
            try {
              normalizedBlob = new Blob([normalizedBlob], { type: "image/png" });
            } catch {
              normalizedBlob = thumbnailBlob;
            }
          }

          await tx.table("cardThumbnails").put({
            id: legacyCard.id,
            cardId: legacyCard.id,
            thumbnailBlob: normalizedBlob,
            createdAt: legacyCard.createdAt,
            updatedAt: legacyCard.updatedAt,
            schemaVersion: 1,
          });
        }

        await writeMetaRecord(tx, {
          id: META_APP_VERSION_KEY,
          value: APP_VERSION,
          dbVersion: DB_VERSION,
          updatedAt: Date.now(),
        });
      });
    this.version(DEXIE_DB_VERSION)
      .stores(HQCC_STORES_V7)
      .upgrade(async (tx) => {
        await backfillPairsFromLegacyCards(tx);
        await writeMetaRecord(tx, {
          id: META_APP_VERSION_KEY,
          value: APP_VERSION,
          dbVersion: DB_VERSION,
          updatedAt: Date.now(),
        });
      });
  }
}

let hqccDexieDb: HqccDexieDb | null = null;

export function getHqccDexieDb(): HqccDexieDb {
  if (!hqccDexieDb) {
    hqccDexieDb = new HqccDexieDb();
  }

  return hqccDexieDb;
}

export async function openHqccDexieDb(): Promise<HqccDexieDb> {
  const db = getHqccDexieDb();
  if (!db.isOpen()) {
    await db.open();
  }
  return db;
}
