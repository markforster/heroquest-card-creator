"use client";

import { openHqccDexieDb } from "@/lib/db/hqcc-dexie";
import { enqueueDbEstimateChange } from "@/lib/db/maintenance/indexeddb-size-tracker";

import type { Table } from "dexie";

/**
 * Persisted asset metadata exposed to the UI and local API.
 */
export type AssetRecord = {
  id: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: number;
  assetKind?: "icon" | "artwork";
  assetKindStatus?: "unclassified" | "classifying" | "classified";
  assetKindSource?: "auto" | "manual";
  assetKindConfidence?: number;
  assetKindUpdatedAt?: number;
};

/**
 * Asset record shape used by backup/export flows that need the stored blob.
 */
export type AssetRecordWithBlob = AssetRecord & {
  blob: Blob;
};

type StoredAssetRecord = AssetRecord & {
  blob?: Blob;
};

const STORE_NAME = "assets";
const ASSETS_UPDATED_EVENT = "hqcc-assets-updated";

function getAssetsTable(
  db: Awaited<ReturnType<typeof openHqccDexieDb>>,
): Table<StoredAssetRecord, string> {
  return db.table<StoredAssetRecord, string>(STORE_NAME);
}

function toAssetRecord(record: StoredAssetRecord): AssetRecord {
  const { blob, ...rest } = record;
  void blob;
  return { ...rest };
}

function clearClassificationFields(record: StoredAssetRecord): StoredAssetRecord {
  const next = { ...record };
  delete next.assetKind;
  delete next.assetKindStatus;
  delete next.assetKindSource;
  delete next.assetKindConfidence;
  delete next.assetKindUpdatedAt;
  return next;
}

function dispatchAssetsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ASSETS_UPDATED_EVENT));
  }
}

function throwAssetError(error: unknown, fallback: string): never {
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(fallback);
}

/**
 * Stores a newly uploaded asset with its metadata and binary payload.
 */
export async function addAsset(
  id: string,
  blob: Blob,
  meta: Omit<AssetRecord, "id" | "createdAt">,
): Promise<void> {
  const db = await openHqccDexieDb();
  const assets = getAssetsTable(db);
  const record: AssetRecordWithBlob = {
    id,
    createdAt: Date.now(),
    ...meta,
    blob,
  };

  try {
    await db.transaction("rw", assets, async () => {
      await assets.put(record);
    });
  } catch (error) {
    throwAssetError(error, "Failed to add asset");
  }

  enqueueDbEstimateChange(STORE_NAME, id);
}

/**
 * Replaces or upserts an asset while preserving the existing creation time when supplied.
 *
 * This is used by asset management flows that swap the underlying file without changing the
 * logical asset identity referenced by cards.
 */
export async function replaceAsset(
  id: string,
  blob: Blob,
  meta: Omit<AssetRecord, "id" | "createdAt">,
  createdAt?: number,
): Promise<void> {
  const db = await openHqccDexieDb();
  const assets = getAssetsTable(db);
  const record: AssetRecordWithBlob = {
    id,
    createdAt: createdAt ?? Date.now(),
    ...meta,
    blob,
  };

  try {
    await db.transaction("rw", assets, async () => {
      await assets.put(record);
    });
  } catch (error) {
    throwAssetError(error, "Failed to replace asset");
  }

  enqueueDbEstimateChange(STORE_NAME, id);
}

/**
 * Lists stored asset metadata in creation order without loading the binary payloads.
 */
export async function getAllAssets(): Promise<AssetRecord[]> {
  const db = await openHqccDexieDb();
  const assets = getAssetsTable(db);

  try {
    const results = await assets.orderBy("createdAt").toArray();
    return results.map(toAssetRecord);
  } catch (error) {
    throwAssetError(error, "Failed to load assets");
  }
}

/**
 * Lists stored assets with their blobs for backup, export, and bulk inspection flows.
 */
export async function getAllAssetsWithBlobs(): Promise<AssetRecordWithBlob[]> {
  const db = await openHqccDexieDb();
  const assets = getAssetsTable(db);

  try {
    const results = await assets.orderBy("createdAt").toArray();
    return results.map((record) => ({ ...record })) as AssetRecordWithBlob[];
  } catch (error) {
    throwAssetError(error, "Failed to load asset blobs");
  }
}

/**
 * Creates a temporary object URL for an asset blob so the UI can preview the stored file.
 */
export async function getAssetObjectUrl(id: string): Promise<string | null> {
  const db = await openHqccDexieDb();
  const assets = getAssetsTable(db);

  try {
    const record = await assets.get(id);
    if (!record || !record.blob) {
      return null;
    }
    return URL.createObjectURL(record.blob);
  } catch (error) {
    throwAssetError(error, "Failed to load asset blob");
  }
}

/**
 * Returns the raw blob for a stored asset when the caller needs to render or export it directly.
 */
export async function getAssetBlob(id: string): Promise<Blob | null> {
  const db = await openHqccDexieDb();
  const assets = getAssetsTable(db);

  try {
    const record = await assets.get(id);
    if (!record || !record.blob) {
      return null;
    }
    return record.blob;
  } catch (error) {
    throwAssetError(error, "Failed to load asset blob");
  }
}

/**
 * Removes one or more assets by id.
 *
 * The caller is responsible for any higher-level cleanup of card references before deletion.
 */
export async function deleteAssets(ids: string[]): Promise<void> {
  if (!ids.length) return;

  const db = await openHqccDexieDb();
  const assets = getAssetsTable(db);

  try {
    await db.transaction("rw", assets, async () => {
      await assets.bulkDelete(ids);
    });
  } catch (error) {
    throwAssetError(error, "Failed to delete assets");
  }

  ids.forEach((id) => enqueueDbEstimateChange(STORE_NAME, id));
}

/**
 * Applies a metadata-only patch to an existing asset record and emits the asset update event.
 */
export async function updateAssetMeta(id: string, patch: Partial<AssetRecord>): Promise<void> {
  const db = await openHqccDexieDb();
  const assets = getAssetsTable(db);
  let updated = false;

  try {
    await db.transaction("rw", assets, async () => {
      const record = await assets.get(id);
      if (!record) {
        return;
      }
      const nextRecord: StoredAssetRecord = {
        ...record,
        ...patch,
        id,
      };
      await assets.put(nextRecord);
      updated = true;
    });
  } catch (error) {
    throwAssetError(error, "Failed to update asset");
  }

  if (!updated) {
    return;
  }

  dispatchAssetsUpdated();
  enqueueDbEstimateChange(STORE_NAME, id);
}

/**
 * Clears all classifier-derived asset kind fields so classification can be recomputed from scratch.
 *
 * Returns the number of updated asset records.
 */
export async function clearAssetClassification(): Promise<number> {
  const db = await openHqccDexieDb();
  const assets = getAssetsTable(db);
  let records: StoredAssetRecord[] = [];

  try {
    await db.transaction("rw", assets, async () => {
      records = await assets.toArray();
      if (!records.length) {
        return;
      }
      await assets.bulkPut(records.map(clearClassificationFields));
    });
  } catch (error) {
    throwAssetError(error, "Failed to clear asset classification");
  }

  dispatchAssetsUpdated();
  records.forEach((record) => enqueueDbEstimateChange(STORE_NAME, record.id));
  return records.length;
}

/**
 * Clears classifier-derived metadata for a single asset.
 */
export async function resetAssetClassificationForId(id: string): Promise<void> {
  const db = await openHqccDexieDb();
  const assets = getAssetsTable(db);
  let updated = false;

  try {
    await db.transaction("rw", assets, async () => {
      const record = await assets.get(id);
      if (!record) {
        return;
      }
      await assets.put(clearClassificationFields(record));
      updated = true;
    });
  } catch (error) {
    throwAssetError(error, "Failed to reset asset classification");
  }

  if (!updated) {
    return;
  }

  dispatchAssetsUpdated();
  enqueueDbEstimateChange(STORE_NAME, id);
}
