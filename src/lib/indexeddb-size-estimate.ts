"use client";

import { openHqccDb } from "@/lib/hqcc-db";

export type IndexedDbRecordSizes = Record<string, Record<string, number>>;

export type IndexedDbSizeEstimate = {
  totalBytes: number;
  recordsScanned: number;
  byStore: Record<string, { bytes: number; records: number }>;
  lastUpdated: string;
  recordSizes?: IndexedDbRecordSizes;
};

const DEFAULT_BATCH = 200;

export function estimateRecordBytes(value: unknown): { bytes: number; blobBytes: number } {
  if (!value || typeof value !== "object") {
    const json = JSON.stringify(value);
    return { bytes: json ? json.length : 0, blobBytes: 0 };
  }

  const record = value as Record<string, unknown>;
  const shallow: Record<string, unknown> = {};
  let blobBytes = 0;

  Object.entries(record).forEach(([key, entry]) => {
    if (entry instanceof Blob) {
      blobBytes += entry.size;
      return;
    }
    shallow[key] = entry;
  });

  let jsonBytes = 0;
  try {
    const json = JSON.stringify(shallow);
    jsonBytes = json ? json.length : 0;
  } catch {
    jsonBytes = 0;
  }

  return { bytes: jsonBytes + blobBytes, blobBytes };
}

export async function estimateIndexedDbSize({
  batchSize: _batchSize = DEFAULT_BATCH,
  includeRecordSizes = false,
}: {
  batchSize?: number;
  includeRecordSizes?: boolean;
} = {}): Promise<IndexedDbSizeEstimate> {
  const db = await openHqccDb();
  const storeNames = Array.from(db.objectStoreNames);
  const byStore: Record<string, { bytes: number; records: number }> = {};
  let totalBytes = 0;
  let recordsScanned = 0;
  const recordSizes: IndexedDbRecordSizes | null = includeRecordSizes ? {} : null;

  for (const storeName of storeNames) {
    const storeResult = await new Promise<{ bytes: number; records: number }>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.openCursor();

      let storeBytes = 0;
      let storeRecords = 0;

      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve({ bytes: storeBytes, records: storeRecords });
          return;
        }
        const { bytes } = estimateRecordBytes(cursor.value);
        storeBytes += bytes;
        storeRecords += 1;
        recordsScanned += 1;
        totalBytes += bytes;
        if (recordSizes) {
          const storeMap = (recordSizes[storeName] ??= {});
          const key = cursor.primaryKey ?? cursor.key ?? "";
          storeMap[String(key)] = bytes;
        }
        cursor.continue();
      };

      request.onerror = () => reject(request.error ?? new Error("Failed to scan store"));
    });

    byStore[storeName] = storeResult;
  }

  return {
    totalBytes,
    recordsScanned,
    byStore,
    lastUpdated: new Date().toLocaleString(),
    ...(recordSizes ? { recordSizes } : {}),
  };
}
