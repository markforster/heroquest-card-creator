import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { repairOrphanDeckEntries } from "@/lib/decks-service";

import {
  createDeckEntryRecord,
  createPairRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

describe("repairOrphanDeckEntries", () => {
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

  it("removes deck entries whose pair no longer exists", async () => {
    const db = await openHqccDexieDb();
    await db.pairs.put(createPairRecord({ id: "pair-1" }));
    await db.deckEntries.bulkPut([
      createDeckEntryRecord({ id: "entry-1", pairId: "pair-1" }),
      createDeckEntryRecord({ id: "entry-2", pairId: "pair-missing" }),
    ]);

    await expect(repairOrphanDeckEntries()).resolves.toBe(1);
    await expect(db.deckEntries.get("entry-1")).resolves.toEqual(
      expect.objectContaining({ id: "entry-1" }),
    );
    await expect(db.deckEntries.get("entry-2")).resolves.toBeUndefined();
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("deckEntries", "entry-2");
  });
});
