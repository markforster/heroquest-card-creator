"use client";

import type { CollectionRecord } from "@/types/collections-db";

import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";
import { openHqccDexieDb } from "./hqcc-dexie";

import { generateId } from ".";

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

export async function getCollection(id: string): Promise<CollectionRecord | null> {
  const db = await openHqccDexieDb();
  return (await db.collections.get(id)) ?? null;
}

export async function listCollections(): Promise<CollectionRecord[]> {
  const db = await openHqccDexieDb();
  const collections = await db.collections.toArray();

  return collections.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await openHqccDexieDb();
  await db.collections.delete(id);
  enqueueDbEstimateChange("collections", id);
}
