import type { CardRecord } from "@/types/cards-db";
import type { CollectionRecord } from "@/types/collections-db";

import {
  TEST_NOW,
  createDeckEntryRecord,
  createDeckGroupRecord,
  createDeckRecord,
  createDeckSetRecord,
  createPairRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

export {
  TEST_NOW,
  createDeckEntryRecord,
  createDeckGroupRecord,
  createDeckRecord,
  createDeckSetRecord,
  createPairRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
};

export function createCardRecord(overrides: Partial<CardRecord> = {}): CardRecord {
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

export function createCollectionRecord(
  overrides: Partial<CollectionRecord> = {},
): CollectionRecord {
  return {
    id: "collection-1",
    name: "Collection",
    cardIds: [],
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    schemaVersion: 1,
    ...overrides,
  };
}
