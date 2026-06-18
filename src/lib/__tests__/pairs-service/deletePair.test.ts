import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { deletePair } from "@/lib/pairs-service";

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
} from "@/lib/test-support/pairs-service-test-helpers";

const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

jest.mock("@/lib/cards-db", () => ({
  getCard: jest.fn(async () => null),
}));

describe("deletePair", () => {
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

  async function seedCascadeScenario() {
    const db = await openHqccDexieDb();
    await db.pairs.put(createPairRecord({ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" }));
    await db.decks.put(createDeckRecord());
    await db.deckGroups.put(createDeckGroupRecord());
    await db.deckSets.put(createDeckSetRecord());
    await db.deckEntries.put(createDeckEntryRecord({ id: "entry-1", pairId: "pair-1" }));
    return db;
  }

  it("throws confirm-required when dependent entries exist", async () => {
    await seedCascadeScenario();

    await expect(
      deletePair("front-1", "back-1", { mode: "confirmable-cascade" }),
    ).rejects.toMatchObject({ code: "PAIR_DELETE_CONFIRM_REQUIRED" });
  });

  it("deletes the pair, cascades entries, and touches affected decks after confirmation", async () => {
    const db = await seedCascadeScenario();

    const result = await deletePair("front-1", "back-1", {
      mode: "confirmable-cascade",
      confirmCascade: true,
    });

    expect(result).toMatchObject({ kind: "executed", deletedPairs: 1, cascadedEntries: 1 });
    await expect(db.pairs.get("pair-1")).resolves.toBeUndefined();
    await expect(db.deckEntries.get("entry-1")).resolves.toBeUndefined();
    await expect(db.decks.get("deck-1")).resolves.toEqual(
      expect.objectContaining({ updatedAt: expect.any(Number) }),
    );
    expect((await db.decks.get("deck-1"))?.updatedAt).toBeGreaterThan(TEST_NOW);
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("pairs", "pair-1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckEntries", "entry-1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("decks", "deck-1");
  });
});
