import type { CardRecord } from "@/types/cards-db";

const getCard = jest.fn();

jest.mock("@/lib/cards-db", () => ({
  getCard: (...args: unknown[]) => getCard(...args),
}));

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { listCardDeckMembership } from "@/lib/decks-service";

import {
  createDeckEntryRecord,
  createDeckRecord,
  createDeckSetRecord,
  createPairRecord,
  createSavedCardRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

describe("listCardDeckMembership", () => {
  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
    getCard.mockReset();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {
      // Ignore teardown failures if the DB module was not opened.
    }

    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("returns empty when the card cannot be resolved", async () => {
    getCard.mockResolvedValue(null);

    await expect(listCardDeckMembership("missing")).resolves.toEqual([]);
  });

  it("resolves deck counts for front cards via pair to entry to set to deck", async () => {
    getCard.mockResolvedValue(
      createSavedCardRecord({ id: "front-1", templateId: "hero", face: "front" } satisfies Partial<CardRecord>),
    );
    const db = await openHqccDexieDb();
    await db.decks.bulkPut([
      createDeckRecord({ id: "deck-b", title: "Beta" }),
      createDeckRecord({ id: "deck-a", title: "Alpha" }),
    ]);
    await db.deckSets.bulkPut([
      createDeckSetRecord({ id: "set-1", deckId: "deck-a", groupId: "group-1", sortIndex: 0, backFaceId: "back-1" }),
      createDeckSetRecord({ id: "set-2", deckId: "deck-b", groupId: "group-2", sortIndex: 1, backFaceId: "back-2" }),
    ]);
    await db.deckEntries.bulkPut([
      createDeckEntryRecord({ id: "entry-1", deckId: "deck-a", setId: "set-1", pairId: "pair-1", count: 2, sortIndex: 0 }),
      createDeckEntryRecord({ id: "entry-2", deckId: "deck-a", setId: "set-1", pairId: "pair-1", count: 1, sortIndex: 1 }),
      createDeckEntryRecord({ id: "entry-3", deckId: "deck-b", setId: "set-2", pairId: "pair-2", count: 4, sortIndex: 0 }),
    ]);
    await db.pairs.bulkPut([
      createPairRecord({ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-1", backFaceId: "back-2" }),
    ]);

    await expect(listCardDeckMembership("front-1")).resolves.toEqual([
      { deckId: "deck-a", deckTitle: "Alpha", count: 3, setId: "set-1", entryId: "entry-1" },
      { deckId: "deck-b", deckTitle: "Beta", count: 4, setId: "set-2", entryId: "entry-3" },
    ]);
  });

  it("resolves deck counts for back cards via sets and entries", async () => {
    getCard.mockResolvedValue(
      createSavedCardRecord({ id: "back-9", templateId: "labelled-back", face: "back" } satisfies Partial<CardRecord>),
    );
    const db = await openHqccDexieDb();
    await db.decks.bulkPut([
      createDeckRecord({ id: "deck-1", title: "Quest Deck" }),
      createDeckRecord({ id: "deck-2", title: "Arena Deck" }),
    ]);
    await db.deckSets.bulkPut([
      createDeckSetRecord({ id: "set-1", deckId: "deck-1", groupId: "group-1", sortIndex: 0, backFaceId: "back-9" }),
      createDeckSetRecord({ id: "set-2", deckId: "deck-1", groupId: "group-1", sortIndex: 1, backFaceId: "back-9" }),
      createDeckSetRecord({ id: "set-3", deckId: "deck-2", groupId: "group-2", sortIndex: 0, backFaceId: "back-9" }),
    ]);
    await db.deckEntries.bulkPut([
      createDeckEntryRecord({ id: "entry-1", deckId: "deck-1", setId: "set-1", pairId: "pair-1", count: 2 }),
      createDeckEntryRecord({ id: "entry-2", deckId: "deck-1", setId: "set-2", pairId: "pair-2", count: 1 }),
      createDeckEntryRecord({ id: "entry-3", deckId: "deck-2", setId: "set-3", pairId: "pair-3", count: 3 }),
    ]);

    await expect(listCardDeckMembership("back-9")).resolves.toEqual([
      { deckId: "deck-2", deckTitle: "Arena Deck", count: 3, setId: "set-3" },
      { deckId: "deck-1", deckTitle: "Quest Deck", count: 3, setId: "set-1" },
    ]);
  });
});
