const enqueueDbEstimateChange = jest.fn();
const createPair = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

jest.mock("@/lib/pairs-service", () => ({
  createPair: (...args: unknown[]) => createPair(...args),
}));

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { addFrontsToSet, listEntriesForSet, updateEntryCount } from "@/lib/decks-service";

import {
  TEST_NOW,
  createDeckEntryRecord,
  createDeckRecord,
  createDeckSetRecord,
  createPairRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

describe("decks-service entry count", () => {
  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
    enqueueDbEstimateChange.mockReset();
    createPair.mockReset();
    createPair.mockResolvedValue(createPairRecord());
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

  it("listEntriesForSet defaults missing count to 1", async () => {
    const db = await openHqccDexieDb();
    await db.deckEntries.put(
      createDeckEntryRecord({ id: "entry-1", deckId: "deck-1", setId: "set-1", count: undefined }),
    );

    await expect(listEntriesForSet("set-1")).resolves.toEqual([
      expect.objectContaining({ id: "entry-1", count: 1 }),
    ]);
  });

  it("addFrontsToSet creates entries with count 1", async () => {
    const db = await openHqccDexieDb();
    await db.decks.put(createDeckRecord({ id: "deck-1" }));
    await db.deckSets.put(createDeckSetRecord({ id: "set-1", deckId: "deck-1", groupId: "group-1", backFaceId: "back-1" }));

    const created = await addFrontsToSet("set-1", ["front-1"]);

    expect(created[0]?.count).toBe(1);
    await expect(db.deckEntries.get(created[0]!.id)).resolves.toEqual(
      expect.objectContaining({ count: 1, pairId: "pair-1" }),
    );
  });

  it("updateEntryCount clamps between 1 and 12", async () => {
    const db = await openHqccDexieDb();
    await db.decks.put(createDeckRecord({ id: "deck-1" }));
    await db.deckEntries.put(
      createDeckEntryRecord({
        id: "entry-1",
        deckId: "deck-1",
        setId: "set-1",
        pairId: "pair-1",
        count: 3,
        createdAt: TEST_NOW,
        updatedAt: TEST_NOW,
      }),
    );

    const nextLow = await updateEntryCount("set-1", "entry-1", 0);
    const nextHigh = await updateEntryCount("set-1", "entry-1", 99);

    expect(nextLow?.count).toBe(1);
    expect(nextHigh?.count).toBe(12);
    await expect(db.deckEntries.get("entry-1")).resolves.toEqual(
      expect.objectContaining({ count: 12 }),
    );
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckEntries", "entry-1");
  });
});
