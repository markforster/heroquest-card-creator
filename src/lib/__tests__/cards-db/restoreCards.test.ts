import { listCards, restoreCards } from "@/lib/cards-db";
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

describe("restoreCards", () => {
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

  it("clears deletedAt and includes the card in listCards default results again", async () => {
    const db = await openHqccDexieDb();
    await db.cards.put(createCardRecord({ id: "c1", deletedAt: 123 }));

    await expect(listCards()).resolves.toEqual([]);
    await restoreCards(["c1"]);
    await expect(listCards()).resolves.toEqual([expect.objectContaining({ id: "c1", deletedAt: null })]);
  });
});
