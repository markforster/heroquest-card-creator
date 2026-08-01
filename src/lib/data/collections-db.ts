"use client";

import { generateId } from "@/lib";
import { openHqccDexieDb } from "@/lib/db/hqcc-dexie";
import { enqueueDbEstimateChange } from "@/lib/db/maintenance/indexeddb-size-tracker";
import type { CollectionRecord } from "@/types/collections-db";

/**
 * Creates a collection record used by stockpile and card-organization flows.
 */
export async function createCollection(input: {
  name: string;
  description?: string;
  cardIds?: string[];
  id?: string;
  createdAt?: number;
  updatedAt?: number;
  schemaVersion?: 1;
}): Promise<CollectionRecord> {
  const now = Date.now();
  const createdAt = input.createdAt ?? now;
  const updatedAt = input.updatedAt ?? createdAt;
  const record: CollectionRecord = {
    id: input.id ?? generateId(),
    name: input.name,
    description: input.description,
    cardIds: input.cardIds ?? [],
    createdAt,
    updatedAt,
    schemaVersion: input.schemaVersion ?? 1,
  };

  const db = await openHqccDexieDb();
  await db.collections.add(record);
  enqueueDbEstimateChange("collections", record.id);

  return record;
}

/**
 * Updates a collection and refreshes its `updatedAt` timestamp.
 */
export async function updateCollection(
  id: string,
  patch: Partial<Omit<CollectionRecord, "id" | "createdAt" | "schemaVersion">>,
): Promise<CollectionRecord | null> {
  const db = await openHqccDexieDb();
  const existing = (await db.collections.get(id)) ?? null;

  if (!existing) {
    return null;
  }

  const now = Date.now();
  const next: CollectionRecord = {
    ...existing,
    ...patch,
    updatedAt: now,
  };

  await db.collections.put(next);
  enqueueDbEstimateChange("collections", next.id);

  return next;
}

/**
 * Loads a single collection by id.
 */
export async function getCollection(id: string): Promise<CollectionRecord | null> {
  const db = await openHqccDexieDb();
  return (await db.collections.get(id)) ?? null;
}

/**
 * Lists collections ordered by name for picker and stockpile views.
 */
export async function listCollections(): Promise<CollectionRecord[]> {
  const db = await openHqccDexieDb();
  const collections = await db.collections.toArray();

  return collections.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/**
 * Deletes a collection record without modifying the cards it referenced.
 */
export async function deleteCollection(id: string): Promise<void> {
  const db = await openHqccDexieDb();
  await db.collections.delete(id);
  enqueueDbEstimateChange("collections", id);
}
