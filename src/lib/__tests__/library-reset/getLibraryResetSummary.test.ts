import { getLibraryResetSummary, isLibraryEmpty } from "@/lib/data/library-reset";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/db/hqcc-dexie";
import {
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";

describe("getLibraryResetSummary", () => {
  beforeEach(() => {
    installFakeIndexedDb();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
  });

  it("reports empty only when all library-owned stores are empty", async () => {
    await expect(isLibraryEmpty()).resolves.toBe(true);
    await expect(getLibraryResetSummary()).resolves.toEqual(
      expect.objectContaining({
        totalLibraryRecords: 0,
        isEmpty: true,
      }),
    );

    const db = await openHqccDexieDb();
    await db.deckEntries.put({
      id: "orphan-entry",
      deckId: "missing-deck",
      setId: "missing-set",
      pairId: "missing-pair",
      sortIndex: 0,
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    });

    await expect(isLibraryEmpty()).resolves.toBe(false);
    await expect(getLibraryResetSummary()).resolves.toEqual(
      expect.objectContaining({
        deckEntries: 1,
        totalLibraryRecords: 1,
        isEmpty: false,
      }),
    );
  });
});
