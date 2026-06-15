import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { deleteDeck } from "@/lib/decks-service";

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

const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

describe("deleteDeck", () => {
  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
    enqueueDbEstimateChange.mockReset();
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

  it("deletes the deck and related groups, sets, and entries while preserving unrelated data and pairs", async () => {
    const db = await openHqccDexieDb();
    await db.decks.bulkPut([
      createDeckRecord({ id: "deck-a", title: "Deck A" }),
      createDeckRecord({ id: "deck-b", title: "Deck B" }),
    ]);
    await db.deckGroups.bulkPut([
      createDeckGroupRecord({ id: "group-a-1", deckId: "deck-a", title: "A1" }),
      createDeckGroupRecord({ id: "group-b-1", deckId: "deck-b", title: "B1" }),
    ]);
    await db.deckSets.bulkPut([
      createDeckSetRecord({ id: "set-a-1", deckId: "deck-a", groupId: "group-a-1", backFaceId: "back-a" }),
      createDeckSetRecord({ id: "set-b-1", deckId: "deck-b", groupId: "group-b-1", backFaceId: "back-b" }),
    ]);
    await db.deckEntries.bulkPut([
      createDeckEntryRecord({ id: "entry-a-1", deckId: "deck-a", setId: "set-a-1", pairId: "pair-a" }),
      createDeckEntryRecord({ id: "entry-b-1", deckId: "deck-b", setId: "set-b-1", pairId: "pair-b" }),
    ]);
    await db.pairs.bulkPut([
      createPairRecord({ id: "pair-a", frontFaceId: "front-a", backFaceId: "back-a" }),
      createPairRecord({ id: "pair-b", frontFaceId: "front-b", backFaceId: "back-b" }),
    ]);

    await deleteDeck("deck-a");

    await expect(db.decks.get("deck-a")).resolves.toBeUndefined();
    await expect(db.decks.get("deck-b")).resolves.toEqual(
      expect.objectContaining({ id: "deck-b", title: "Deck B" }),
    );
    await expect(db.deckGroups.get("group-a-1")).resolves.toBeUndefined();
    await expect(db.deckGroups.get("group-b-1")).resolves.toEqual(
      expect.objectContaining({ id: "group-b-1" }),
    );
    await expect(db.deckSets.get("set-a-1")).resolves.toBeUndefined();
    await expect(db.deckSets.get("set-b-1")).resolves.toEqual(
      expect.objectContaining({ id: "set-b-1" }),
    );
    await expect(db.deckEntries.get("entry-a-1")).resolves.toBeUndefined();
    await expect(db.deckEntries.get("entry-b-1")).resolves.toEqual(
      expect.objectContaining({ id: "entry-b-1" }),
    );
    await expect(db.pairs.get("pair-a")).resolves.toEqual(
      expect.objectContaining({ id: "pair-a" }),
    );
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("decks", "deck-a");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckGroups", "group-a-1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckSets", "set-a-1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckEntries", "entry-a-1");
  });
});
