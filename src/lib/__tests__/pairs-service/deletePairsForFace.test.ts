import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { deletePairsForFace } from "@/lib/pairs-service";

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

describe("deletePairsForFace", () => {
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

  it("removes pairs where the face appears on either side", async () => {
    const db = await openHqccDexieDb();
    await db.pairs.bulkPut([
      createPairRecord({ id: "pair-1", frontFaceId: "face-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-2", backFaceId: "face-1" }),
      createPairRecord({ id: "pair-3", frontFaceId: "front-3", backFaceId: "back-3" }),
    ]);

    await deletePairsForFace("face-1");

    await expect(db.pairs.toArray()).resolves.toEqual([expect.objectContaining({ id: "pair-3" })]);
    expect(enqueueDbEstimateChange).toHaveBeenNthCalledWith(1, "pairs", "pair-1");
    expect(enqueueDbEstimateChange).toHaveBeenNthCalledWith(2, "pairs", "pair-2");
  });
});
