import Dexie from "dexie";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";

import type { CardRecord } from "@/types/cards-db";
import type {
  DeckEntryRecord,
  DeckGroupRecord,
  DeckRecord,
  DeckSetRecord,
} from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";

const originalIndexedDbDescriptor = Object.getOwnPropertyDescriptor(window, "indexedDB");
const originalIdbKeyRangeDescriptor = Object.getOwnPropertyDescriptor(window, "IDBKeyRange");

export const TEST_NOW = 100;

export function installFakeIndexedDb(): void {
  const indexedDb = new IDBFactory();

  Object.defineProperty(window, "indexedDB", { configurable: true, value: indexedDb });
  Object.defineProperty(window, "IDBKeyRange", { configurable: true, value: IDBKeyRange });
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: indexedDb });
  Object.defineProperty(globalThis, "IDBKeyRange", { configurable: true, value: IDBKeyRange });

  Dexie.dependencies.indexedDB = indexedDb;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
}

export function restoreIndexedDb(): void {
  if (originalIndexedDbDescriptor) {
    Object.defineProperty(window, "indexedDB", originalIndexedDbDescriptor);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).indexedDB;
  }

  if (originalIdbKeyRangeDescriptor) {
    Object.defineProperty(window, "IDBKeyRange", originalIdbKeyRangeDescriptor);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).IDBKeyRange;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).indexedDB;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).IDBKeyRange;
}

export async function deleteDb(name: string): Promise<void> {
  if (!("indexedDB" in window)) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Failed to delete ${name}`));
    request.onblocked = () => reject(new Error(`Failed to delete ${name}: blocked`));
  });
}

export function createSavedCardRecord(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: "card-1",
    templateId: "hero",
    status: "saved",
    name: "Card",
    nameLower: "card",
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    schemaVersion: 2,
    ...overrides,
  };
}

export function createPairRecord(overrides: Partial<PairRecord> = {}): PairRecord {
  return {
    id: "pair-1",
    name: "Pair",
    nameLower: "pair",
    frontFaceId: "front-1",
    backFaceId: "back-1",
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    schemaVersion: 1,
    ...overrides,
  };
}

export function createDeckRecord(overrides: Partial<DeckRecord> = {}): DeckRecord {
  return {
    id: "deck-1",
    title: "Deck",
    description: null,
    keySetId: null,
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    schemaVersion: 1,
    ...overrides,
  };
}

export function createDeckGroupRecord(
  overrides: Partial<DeckGroupRecord> = {},
): DeckGroupRecord {
  return {
    id: "group-1",
    deckId: "deck-1",
    title: "Group",
    sortIndex: 0,
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    schemaVersion: 1,
    ...overrides,
  };
}

export function createDeckSetRecord(overrides: Partial<DeckSetRecord> = {}): DeckSetRecord {
  return {
    id: "set-1",
    deckId: "deck-1",
    groupId: "group-1",
    title: "Set",
    description: null,
    backFaceId: "back-1",
    sortIndex: 0,
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    schemaVersion: 1,
    ...overrides,
  };
}

export function createDeckEntryRecord(
  overrides: Partial<DeckEntryRecord> = {},
): DeckEntryRecord {
  return {
    id: "entry-1",
    deckId: "deck-1",
    setId: "set-1",
    pairId: "pair-1",
    count: 1,
    sortIndex: 0,
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    schemaVersion: 1,
    ...overrides,
  };
}
