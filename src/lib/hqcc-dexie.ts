"use client";

import Dexie, { type EntityTable, type Transaction } from "dexie";

import type { AssetRecord } from "@/lib/assets-db";
import type { SettingsRecord } from "@/lib/settings-db";
import type { CardRecord } from "@/types/cards-db";
import type { CollectionRecord } from "@/types/collections-db";
import type { DeckEntryRecord, DeckGroupRecord, DeckRecord, DeckSetRecord } from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";
import { APP_VERSION } from "@/version";

export const DB_NAME = "hqcc";
export const DB_VERSION = 6;
export const DEXIE_DB_VERSION = 0.6;
export const META_STORE = "meta";
export const META_APP_VERSION_KEY = "appVersion";
export const META_PAIRS_MIGRATED_KEY = "pairsMigrated";

type MetaRecord = {
  id: string;
  value: boolean | string;
  dbVersion?: number;
  updatedAt: number;
};

type HqccDexieTables = {
  cards: EntityTable<CardRecord, "id">;
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

async function writeMetaRecord(
  tx: Transaction,
  record: MetaRecord,
): Promise<string | number | Date | ArrayBuffer | ArrayBufferView> {
  return tx.table(META_STORE).put(record);
}

class HqccDexieDb extends Dexie implements HqccDexieTables {
  cards!: EntityTable<CardRecord, "id">;
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
    this.version(DEXIE_DB_VERSION)
      .stores(HQCC_STORES_V5)
      .upgrade(async (tx) => {
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
