"use client";

import { openHqccDb } from "./hqcc-db";

export type AssetRecord = {
  id: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: number;
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
      resolve();
    };
    tx.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[assets-db] addAsset tx error", tx.error);
      reject(tx.error ?? new Error("Failed to add asset"));
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
      resolve();
    };

    tx.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[assets-db] deleteAssets tx error", tx.error);
      reject(tx.error ?? new Error("Failed to delete assets"));
    };
  });
}
