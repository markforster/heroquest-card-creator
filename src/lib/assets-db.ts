"use client";

import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";
import { openHqccDb } from "./hqcc-db";

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

export type AssetRecordWithBlob = AssetRecord & {
  blob: Blob;
};

const STORE_NAME = "assets";

export async function addAsset(
  id: string,
  blob: Blob,
  meta: Omit<AssetRecord, "id" | "createdAt">,
): Promise<void> {
  const db = await openHqccDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: AssetRecord & { blob: Blob } = {
      id,
      createdAt: Date.now(),
      ...meta,
      blob,
    };

    const req = store.put(record);

    req.onsuccess = () => {
      // noop
    };

    tx.oncomplete = () => {
      // eslint-disable-next-line no-console
      console.debug("[assets-db] addAsset complete", id);
      enqueueDbEstimateChange(STORE_NAME, id);
      resolve();
    };
    tx.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[assets-db] addAsset tx error", tx.error);
      reject(tx.error ?? new Error("Failed to add asset"));
    };
  });
}

export async function replaceAsset(
  id: string,
  blob: Blob,
  meta: Omit<AssetRecord, "id" | "createdAt">,
  createdAt?: number,
): Promise<void> {
  const db = await openHqccDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: AssetRecord & { blob: Blob } = {
      id,
      createdAt: createdAt ?? Date.now(),
      ...meta,
      blob,
    };

    const req = store.put(record);

    req.onsuccess = () => {
      // noop
    };

    tx.oncomplete = () => {
      // eslint-disable-next-line no-console
      console.debug("[assets-db] replaceAsset complete", id);
      enqueueDbEstimateChange(STORE_NAME, id);
      resolve();
    };
    tx.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[assets-db] replaceAsset tx error", tx.error);
      reject(tx.error ?? new Error("Failed to replace asset"));
    };
  });
}

export async function getAllAssets(): Promise<AssetRecord[]> {
  const db = await openHqccDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    let request: IDBRequest;

    if (store.indexNames.contains("createdAt")) {
      const index = store.index("createdAt");
      request = index.getAll();
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      const results = (request.result as AssetRecord[]) ?? [];
      // eslint-disable-next-line no-console
      console.debug("[assets-db] getAllAssets success", results.length);
      resolve(
        results.map((record) => ({
          ...record,
        })),
      );
    };

    request.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[assets-db] getAllAssets error", request.error);
      reject(request.error ?? new Error("Failed to load assets"));
    };
  });
}

export async function getAllAssetsWithBlobs(): Promise<AssetRecordWithBlob[]> {
  const db = await openHqccDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    let request: IDBRequest;

    if (store.indexNames.contains("createdAt")) {
      const index = store.index("createdAt");
      request = index.getAll();
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      const results = (request.result as AssetRecordWithBlob[]) ?? [];
      // eslint-disable-next-line no-console
      console.debug("[assets-db] getAllAssetsWithBlobs success", results.length);
      resolve(
        results.map((record) => ({
          ...record,
        })),
      );
    };

    request.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[assets-db] getAllAssetsWithBlobs error", request.error);
      reject(request.error ?? new Error("Failed to load asset blobs"));
    };
  });
}

export async function getAssetObjectUrl(id: string): Promise<string | null> {
  const db = await openHqccDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result as (AssetRecord & { blob?: Blob }) | undefined;
      if (!record || !record.blob) {
        resolve(null);
        return;
      }
      const url = URL.createObjectURL(record.blob);
      resolve(url);
    };

    request.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[assets-db] getAssetObjectUrl error", request.error);
      reject(request.error ?? new Error("Failed to load asset blob"));
    };
  });
}

export async function getAssetBlob(id: string): Promise<Blob | null> {
  const db = await openHqccDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result as (AssetRecord & { blob?: Blob }) | undefined;
      if (!record || !record.blob) {
        resolve(null);
        return;
      }
      resolve(record.blob);
    };

    request.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[assets-db] getAssetBlob error", request.error);
      reject(request.error ?? new Error("Failed to load asset blob"));
    };
  });
}

export async function deleteAssets(ids: string[]): Promise<void> {
  if (!ids.length) return;

  const db = await openHqccDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    ids.forEach((id) => {
      store.delete(id);
    });

    tx.oncomplete = () => {
      // eslint-disable-next-line no-console
      console.debug("[assets-db] deleteAssets complete", ids.length);
      ids.forEach((id) => enqueueDbEstimateChange(STORE_NAME, id));
      resolve();
    };

    tx.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[assets-db] deleteAssets tx error", tx.error);
      reject(tx.error ?? new Error("Failed to delete assets"));
    };
  });
}

export async function updateAssetMeta(
  id: string,
  patch: Partial<AssetRecord>,
): Promise<void> {
  const db = await openHqccDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result as (AssetRecord & { blob?: Blob }) | undefined;
      if (!record) {
        resolve();
        return;
      }
      const nextRecord = {
        ...record,
        ...patch,
        id,
      } as AssetRecord & { blob?: Blob };
      store.put(nextRecord);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to load asset for update"));
    };

    tx.oncomplete = () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hqcc-assets-updated"));
      }
      enqueueDbEstimateChange(STORE_NAME, id);
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error("Failed to update asset"));
    };
  });
}

export async function clearAssetClassification(): Promise<number> {
  const db = await openHqccDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    let records: AssetRecord[] = [];

    request.onsuccess = () => {
      records = (request.result as AssetRecord[]) ?? [];
      records.forEach((record) => {
        delete record.assetKind;
        delete record.assetKindStatus;
        delete record.assetKindSource;
        delete record.assetKindConfidence;
        delete record.assetKindUpdatedAt;
        store.put(record as AssetRecord);
      });
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to load assets for classification reset"));
    };

    tx.oncomplete = () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hqcc-assets-updated"));
      }
      records.forEach((record) => enqueueDbEstimateChange(STORE_NAME, record.id));
      resolve((request.result as AssetRecord[] | undefined)?.length ?? 0);
    };

    tx.onerror = () => {
      reject(tx.error ?? new Error("Failed to clear asset classification"));
    };
  });
}

export async function resetAssetClassificationForId(id: string): Promise<void> {
  const db = await openHqccDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result as (AssetRecord & { blob?: Blob }) | undefined;
      if (!record) {
        resolve();
        return;
      }
      delete record.assetKind;
      delete record.assetKindStatus;
      delete record.assetKindSource;
      delete record.assetKindConfidence;
      delete record.assetKindUpdatedAt;
      store.put(record as AssetRecord);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to load asset for classification reset"));
    };

    tx.oncomplete = () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hqcc-assets-updated"));
      }
      enqueueDbEstimateChange(STORE_NAME, id);
      resolve();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error("Failed to reset asset classification"));
    };
  });
}
