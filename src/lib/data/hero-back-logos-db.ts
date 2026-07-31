"use client";

import { openHqccDexieDb } from "@/lib/db/hqcc-dexie";
import { enqueueDbEstimateChange } from "@/lib/db/maintenance/indexeddb-size-tracker";
import type { HeroBackLogoMode } from "@/types/card-data";

import type { Table } from "dexie";

/**
 * Persisted metadata for a custom hero-back logo asset.
 */
export type HeroBackLogoRecord = {
  id: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
};

/**
 * Hero-back logo record including the stored binary payload.
 */
export type HeroBackLogoRecordWithBlob = HeroBackLogoRecord & {
  blob: Blob;
};

type StoredHeroBackLogoRecord = HeroBackLogoRecord & {
  blob?: Blob;
};

/**
 * Strategy used to rewrite dependent cards before removing a custom hero-back logo.
 */
export type DeleteHeroBackLogoRemediation =
  | { mode: "default" }
  | { mode: "none" }
  | { mode: "custom"; logoId: string; logoName?: string; width?: number; height?: number };

/**
 * Describes a card currently using a specific custom hero-back logo.
 */
export type HeroBackLogoUsageRecord = {
  cardId: string;
  name: string;
  logoMode: HeroBackLogoMode;
};

const STORE_NAME = "heroBackLogos";

function getLogosTable(
  db: Awaited<ReturnType<typeof openHqccDexieDb>>,
): Table<StoredHeroBackLogoRecord, string> {
  return db.table<StoredHeroBackLogoRecord, string>(STORE_NAME);
}

function toLogoRecord(record: StoredHeroBackLogoRecord): HeroBackLogoRecord {
  const { blob, ...rest } = record;
  void blob;
  return { ...rest };
}

function throwLogoError(error: unknown, fallback: string): never {
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(fallback);
}

/**
 * Lists custom hero-back logo metadata without loading the stored blobs.
 */
export async function listHeroBackLogos(): Promise<HeroBackLogoRecord[]> {
  const db = await openHqccDexieDb();
  const table = getLogosTable(db);

  try {
    const records = await table.orderBy("createdAt").toArray();
    return records.map(toLogoRecord);
  } catch (error) {
    throwLogoError(error, "Failed to load Hero Back logos");
  }
}

/**
 * Lists custom hero-back logos with their blobs for backup and migration flows.
 */
export async function listHeroBackLogosWithBlobs(): Promise<HeroBackLogoRecordWithBlob[]> {
  const db = await openHqccDexieDb();
  const table = getLogosTable(db);

  try {
    const records = await table.orderBy("createdAt").toArray();
    return records
      .filter((record): record is HeroBackLogoRecordWithBlob => record.blob instanceof Blob)
      .map((record) => ({ ...record }));
  } catch (error) {
    throwLogoError(error, "Failed to load Hero Back logo blobs");
  }
}

/**
 * Returns the stored blob for a custom hero-back logo.
 */
export async function getHeroBackLogoBlob(id: string): Promise<Blob | null> {
  const db = await openHqccDexieDb();
  const table = getLogosTable(db);

  try {
    const record = await table.get(id);
    return record?.blob ?? null;
  } catch (error) {
    throwLogoError(error, "Failed to load Hero Back logo blob");
  }
}

/**
 * Creates a temporary object URL for previewing a stored custom hero-back logo.
 */
export async function getHeroBackLogoObjectUrl(id: string): Promise<string | null> {
  const blob = await getHeroBackLogoBlob(id);
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * Adds or replaces a custom hero-back logo asset.
 */
export async function addHeroBackLogo(
  id: string,
  blob: Blob,
  meta: Omit<HeroBackLogoRecord, "id" | "createdAt" | "updatedAt"> & {
    createdAt?: number;
    updatedAt?: number;
  },
): Promise<void> {
  const db = await openHqccDexieDb();
  const table = getLogosTable(db);
  const now = Date.now();

  try {
    await db.transaction("rw", table, async () => {
      await table.put({
        id,
        blob,
        createdAt: meta.createdAt ?? now,
        updatedAt: meta.updatedAt ?? now,
        ...meta,
      });
    });
  } catch (error) {
    throwLogoError(error, "Failed to add Hero Back logo");
  }

  enqueueDbEstimateChange(STORE_NAME, id);
}

/**
 * Deletes a custom hero-back logo and rewrites dependent card logo settings using the chosen remediation.
 *
 * Returns the ids of cards that were updated during remediation.
 */
export async function deleteHeroBackLogo(
  logoId: string,
  remediation: DeleteHeroBackLogoRemediation,
): Promise<string[]> {
  const db = await openHqccDexieDb();
  let affectedCardIds: string[] = [];

  try {
    await db.transaction("rw", db.heroBackLogos, db.cardHeroBackLogoComponents, async () => {
      const dependents = await db.cardHeroBackLogoComponents
        .where("logoId")
        .equals(logoId)
        .toArray();
      affectedCardIds = dependents.map((record) => record.cardId);

      if (dependents.length > 0) {
        const updated = dependents.map((record) => {
          if (remediation.mode === "custom") {
            return {
              ...record,
              mode: "custom" as const,
              logoId: remediation.logoId,
              logoName: remediation.logoName,
              originalWidth: remediation.width,
              originalHeight: remediation.height,
              updatedAt: Date.now(),
            };
          }

          return {
            ...record,
            mode: remediation.mode,
            logoId: undefined,
            logoName: undefined,
            originalWidth: undefined,
            originalHeight: undefined,
            updatedAt: Date.now(),
          };
        });
        await db.cardHeroBackLogoComponents.bulkPut(updated);
      }

      await db.heroBackLogos.delete(logoId);
    });
  } catch (error) {
    throwLogoError(error, "Failed to delete Hero Back logo");
  }

  enqueueDbEstimateChange(STORE_NAME, logoId);
  return affectedCardIds;
}

/**
 * Lists cards currently referencing a custom hero-back logo.
 */
export async function getHeroBackLogoUsage(logoId: string): Promise<HeroBackLogoUsageRecord[]> {
  const db = await openHqccDexieDb();

  try {
    const records = await db.cardHeroBackLogoComponents.where("logoId").equals(logoId).toArray();
    if (!records.length) {
      return [];
    }

    const cardsById = new Map(
      (await db.cardsBase.bulkGet(records.map((record) => record.cardId)))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .map((entry) => [entry.id, entry]),
    );

    return records.map((record) => ({
      cardId: record.cardId,
      name: cardsById.get(record.cardId)?.name ?? "Untitled",
      logoMode: record.mode,
    }));
  } catch (error) {
    throwLogoError(error, "Failed to load Hero Back logo usage");
  }
}
