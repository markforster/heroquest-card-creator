import { listCards, softDeleteCards } from "@/lib/cards-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import {
  createCardRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/cards-db-test-helpers";

const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

describe("softDeleteCards", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    enqueueDbEstimateChange.mockReset();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {}
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
    jest.restoreAllMocks();
  });

  it("marks cards as deleted and excludes them from default listCards results", async () => {
    const db = await openHqccDexieDb();
    await db.cards.put(createCardRecord({ id: "c1", createdAt: 100, updatedAt: 100 }));

    await softDeleteCards(["c1"], 123);

    await expect(listCards()).resolves.toEqual([]);
    await expect(listCards({ deleted: "only" })).resolves.toEqual([
      expect.objectContaining({ id: "c1", deletedAt: 123 }),
    ]);
  });
});
