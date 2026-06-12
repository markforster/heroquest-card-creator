"use client";

import type { DeckEntryRecord } from "@/types/decks-db";
import type { CardFace } from "@/types/card-face";

import { cardTemplatesById } from "@/data/card-templates";
import { resolveEffectiveFace } from "@/lib/card-face";
import { openHqccDb } from "@/lib/hqcc-db";

export const DECKS_STORE = "decks";
export const GROUPS_STORE = "deckGroups";
export const SETS_STORE = "deckSets";
export const ENTRIES_STORE = "deckEntries";
export const PAIRS_STORE = "pairs";
export const ENTRY_COUNT_MIN = 1;
export const ENTRY_COUNT_MAX = 12;

export async function getStore(
  name: string,
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> {
  const db = await openHqccDb();
  if (!db.objectStoreNames.contains(name)) {
    throw new Error(`Store not available: ${name}`);
  }
  const tx = db.transaction(name, mode);
  return tx.objectStore(name);
}

export async function getPairsStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openHqccDb();
  if (!db.objectStoreNames.contains(PAIRS_STORE)) {
    throw new Error("Pairs store not available");
  }
  const tx = db.transaction(PAIRS_STORE, mode);
  return tx.objectStore(PAIRS_STORE);
}

export function sortByIndex<T extends { sortIndex: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortIndex - b.sortIndex);
}

export function clampEntryCount(value: number): number {
  return Math.max(ENTRY_COUNT_MIN, Math.min(ENTRY_COUNT_MAX, Math.trunc(value)));
}

export function normalizeDeckEntryRecord(
  entry: DeckEntryRecord & { count?: number | null },
): DeckEntryRecord {
  const raw = entry.count;
  const count =
    typeof raw === "number" && Number.isFinite(raw) ? clampEntryCount(raw) : ENTRY_COUNT_MIN;
  return { ...entry, count };
}

export async function listByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  const store = await getStore(storeName, "readonly");
  if (!store.indexNames.contains(indexName)) return [];
  const index = store.index(indexName);

  return new Promise<T[]>((resolve, reject) => {
    const results: T[] = [];
    const request = index.openCursor(IDBKeyRange.only(value));
    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve(results);
        return;
      }
      results.push(cursor.value as T);
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to read index"));
  });
}

export async function listAll<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName, "readonly");
  return new Promise<T[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as T[] | undefined) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Failed to list records"));
  });
}

export function nextSortIndex(items: { sortIndex: number }[]): number {
  if (!items.length) return 0;
  return Math.max(...items.map((item) => item.sortIndex)) + 1;
}

export function resolveCardFace(templateId: string, cardFace: CardFace | undefined): CardFace {
  const template = cardTemplatesById[templateId as keyof typeof cardTemplatesById];
  if (!template) return cardFace ?? "front";
  return resolveEffectiveFace(cardFace, template.defaultFace);
}
