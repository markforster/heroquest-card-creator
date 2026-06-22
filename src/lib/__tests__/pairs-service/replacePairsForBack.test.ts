import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { replacePairsForBack } from "@/lib/pairs-service";

import {
  createPairRecord,
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/pairs-service-test-helpers";

const enqueueDbEstimateChange = jest.fn();
const getCard = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

jest.mock("@/lib/cards-db", () => ({
  getCard: (...args: unknown[]) => getCard(...args),
}));

describe("replacePairsForBack", () => {
  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
    enqueueDbEstimateChange.mockReset();
    getCard.mockReset();
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

  it("removes obsolete fronts and creates missing fronts for the back face", async () => {
    const db = await openHqccDexieDb();
    await db.pairs.bulkPut([
      createPairRecord({ id: "pair-1", frontFaceId: "front-1", backFaceId: "back-1" }),
      createPairRecord({ id: "pair-2", frontFaceId: "front-2", backFaceId: "back-1" }),
    ]);
    getCard
      .mockResolvedValueOnce({ title: "Back One" })
      .mockResolvedValueOnce({ title: "Front Three" });

    await replacePairsForBack("back-1", ["front-2", "front-3"]);

    const stored = await db.pairs.where("backFaceId").equals("back-1").toArray();

    expect(stored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ frontFaceId: "front-2", backFaceId: "back-1" }),
        expect.objectContaining({
          frontFaceId: "front-3",
          backFaceId: "back-1",
          name: "Front Three - Back One",
        }),
      ]),
    );
    expect(stored).toHaveLength(2);
    expect(stored.find((pair) => pair.id === "pair-1")).toBeUndefined();
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("pairs", "pair-1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith(
      "pairs",
      expect.any(String),
    );
  });
});
