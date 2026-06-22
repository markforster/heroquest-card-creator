import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { deletePairsForFaces } from "@/lib/pairs-service";

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

describe("deletePairsForFaces", () => {
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
    await db.pairs.bulkPut([
      createPairRecord({ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-2", backFaceId: "back-1" }),
    ]);
    await db.decks.put(createDeckRecord());
    await db.deckGroups.put(createDeckGroupRecord());
    await db.deckSets.put(createDeckSetRecord());
    await db.deckEntries.bulkPut([
      createDeckEntryRecord({ id: "entry-1", pairId: "pair-1" }),
      createDeckEntryRecord({ id: "entry-2", pairId: "pair-2", sortIndex: 1 }),
    ]);
    return db;
  }

  it("throws confirm-required when bulk deletion would cascade", async () => {
    await seedCascadeScenario();

    await expect(
      deletePairsForFaces(["back-1"], { mode: "confirmable-cascade" }),
    ).rejects.toMatchObject({ code: "PAIR_DELETE_CONFIRM_REQUIRED" });
  });

  it("bulk deletes matching pairs and dependent entries after confirmation", async () => {
    const db = await seedCascadeScenario();

    const result = await deletePairsForFaces(["back-1"], {
      mode: "confirmable-cascade",
      confirmCascade: true,
    });

    expect(result).toMatchObject({ kind: "executed", deletedPairs: 2, cascadedEntries: 2 });
    await expect(db.pairs.toArray()).resolves.toEqual([]);
    await expect(db.deckEntries.toArray()).resolves.toEqual([]);
    expect((await db.decks.get("deck-1"))?.updatedAt).toBeGreaterThan(TEST_NOW);
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("pairs", "pair-1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("pairs", "pair-2");
  });
});
