import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { deleteSet } from "@/lib/decks-service";

import {
  TEST_NOW,
  createDeckEntryRecord,
  createDeckGroupRecord,
  createDeckRecord,
  createDeckSetRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

describe("deleteSet", () => {
  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
    enqueueDbEstimateChange.mockReset();
    jest.spyOn(Date, "now").mockReturnValue(TEST_NOW + 50);
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

  it("deletes a set and its entries while keeping the only group", async () => {
    const db = await openHqccDexieDb();
    await db.deckGroups.put(createDeckGroupRecord({ id: "group-1", deckId: "deck-1" }));
    await db.deckSets.put(createDeckSetRecord({ id: "set-1", deckId: "deck-1", groupId: "group-1" }));
    await db.deckEntries.put(createDeckEntryRecord({ id: "entry-1", deckId: "deck-1", setId: "set-1" }));

    await deleteSet("set-1");

    await expect(db.deckSets.get("set-1")).resolves.toBeUndefined();
    await expect(db.deckEntries.get("entry-1")).resolves.toBeUndefined();
    await expect(db.deckGroups.get("group-1")).resolves.toEqual(
      expect.objectContaining({ id: "group-1" }),
    );
  });

  it("clears deck keySetId when deleting the key set and touches deck updatedAt", async () => {
    const db = await openHqccDexieDb();
    await db.decks.put(
      createDeckRecord({ id: "deck-1", keySetId: "set-1", updatedAt: TEST_NOW }),
    );
    await db.deckGroups.bulkPut([
      createDeckGroupRecord({ id: "group-1", deckId: "deck-1" }),
      createDeckGroupRecord({ id: "group-2", deckId: "deck-1", sortIndex: 1 }),
    ]);
    await db.deckSets.bulkPut([
      createDeckSetRecord({ id: "set-1", deckId: "deck-1", groupId: "group-1" }),
      createDeckSetRecord({ id: "set-2", deckId: "deck-1", groupId: "group-2", backFaceId: "back-2" }),
    ]);
    await db.deckEntries.put(createDeckEntryRecord({ id: "entry-1", deckId: "deck-1", setId: "set-1" }));

    await deleteSet("set-1");

    await expect(db.deckSets.get("set-1")).resolves.toBeUndefined();
    await expect(db.deckGroups.get("group-1")).resolves.toBeUndefined();
    await expect(db.decks.get("deck-1")).resolves.toEqual(
      expect.objectContaining({ keySetId: null, updatedAt: TEST_NOW + 50 }),
    );
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckSets", "set-1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckEntries", "entry-1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckGroups", "group-1");
  });
});
