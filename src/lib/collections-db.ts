"use client";

import type { CollectionRecord } from "@/types/collections-db";

import { openHqccDb } from "./hqcc-db";

import { generateId } from ".";

import type { HqccDb } from "./hqcc-db";

async function getCollectionsStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db: HqccDb = await openHqccDb();

  if (!db.objectStoreNames.contains("collections")) {
    throw new Error("Collections store not available");
  }

  const tx = db.transaction("collections", mode);
  return tx.objectStore("collections");
}

export async function createCollection(input: {
  name: string;
  description?: string;
  cardIds?: string[];
}): Promise<CollectionRecord> {
  const now = Date.now();
  const record: CollectionRecord = {
    id: generateId(),
    name: input.name,
    description: input.description,
    cardIds: input.cardIds ?? [],
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };

  const store = await getCollectionsStore("readwrite");

  await new Promise<void>((resolve, reject) => {
    const request = store.add(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to create collection"));
  });

  return record;
}

export async function updateCollection(
  id: string,
  patch: Partial<Omit<CollectionRecord, "id" | "createdAt" | "schemaVersion">>,
): Promise<CollectionRecord | null> {
  const store = await getCollectionsStore("readwrite");

  const existing = await new Promise<CollectionRecord | null>((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      resolve((getRequest.result as CollectionRecord | undefined) ?? null);
    };
    getRequest.onerror = () => {
      reject(getRequest.error ?? new Error("Failed to load collection for update"));
    };
  });

  if (!existing) {
    return null;
  }

  const now = Date.now();
  const next: CollectionRecord = {
    ...existing,
    ...patch,
    updatedAt: now,
  };

  await new Promise<void>((resolve, reject) => {
    const putRequest = store.put(next);
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error ?? new Error("Failed to update collection"));
  });

  return next;
}

export async function getCollection(id: string): Promise<CollectionRecord | null> {
  const store = await getCollectionsStore("readonly");

  return new Promise<CollectionRecord | null>((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      resolve((request.result as CollectionRecord | undefined) ?? null);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to load collection"));
    };
  });
}

export async function listCollections(): Promise<CollectionRecord[]> {
  const store = await getCollectionsStore("readonly");
  const collections: CollectionRecord[] = [];

  await new Promise<void>((resolve, reject) => {
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve();
        return;
      }
      collections.push(cursor.value as CollectionRecord);
      cursor.continue();
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to list collections"));
    };
  });

  return collections.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export async function deleteCollection(id: string): Promise<void> {
  const store = await getCollectionsStore("readwrite");

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to delete collection"));
  });
}
