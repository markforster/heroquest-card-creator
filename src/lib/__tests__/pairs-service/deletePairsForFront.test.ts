import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { deletePairsForFront } from "@/lib/pairs-service";

import {
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

describe("deletePairsForFront", () => {
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

  it("removes only pairs whose front face matches", async () => {
    const db = await openHqccDexieDb();
    await db.pairs.bulkPut([
      createPairRecord({ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-1", backFaceId: "back-2" }),
      createPairRecord({ id: "pair-3", frontFaceId: "front-2", backFaceId: "front-1" }),
    ]);

    await deletePairsForFront("front-1");

    await expect(db.pairs.toArray()).resolves.toEqual([expect.objectContaining({ id: "pair-3" })]);
    expect(enqueueDbEstimateChange).toHaveBeenNthCalledWith(1, "pairs", "pair-1");
    expect(enqueueDbEstimateChange).toHaveBeenNthCalledWith(2, "pairs", "pair-2");
  });
});
