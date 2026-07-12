"use client";

import { openHqccDexieDb } from "@/lib/hqcc-dexie";
import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";
import type { HeroBackLogoMode } from "@/types/card-data";

import type { Table } from "dexie";

export type HeroBackLogoRecord = {
  id: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
};

export type HeroBackLogoRecordWithBlob = HeroBackLogoRecord & {
  blob: Blob;
};

type StoredHeroBackLogoRecord = HeroBackLogoRecord & {
  blob?: Blob;
};

export type DeleteHeroBackLogoRemediation =
  | { mode: "default" }
  | { mode: "none" }
  | { mode: "custom"; logoId: string; logoName?: string; width?: number; height?: number };

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

export async function getHeroBackLogoObjectUrl(id: string): Promise<string | null> {
  const blob = await getHeroBackLogoBlob(id);
  return blob ? URL.createObjectURL(blob) : null;
}

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

export async function deleteHeroBackLogo(
  logoId: string,
  remediation: DeleteHeroBackLogoRemediation,
): Promise<void> {
  const db = await openHqccDexieDb();

  try {
    await db.transaction("rw", db.heroBackLogos, db.cardHeroBackLogoComponents, async () => {
      const dependents = await db.cardHeroBackLogoComponents
        .where("logoId")
        .equals(logoId)
        .toArray();

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
}

export async function getHeroBackLogoUsage(
  logoId: string,
): Promise<HeroBackLogoUsageRecord[]> {
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
