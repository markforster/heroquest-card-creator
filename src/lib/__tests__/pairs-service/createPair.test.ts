import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { createPair } from "@/lib/pairs-service";

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

describe("createPair", () => {
  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
    getCard.mockReset();
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

  it("creates a pair with a generated name and enqueues the estimate update", async () => {
    getCard
      .mockResolvedValueOnce({ title: "Front Title" })
      .mockResolvedValueOnce({ title: "Back Title" });

    const record = await createPair("front-1", "back-1");
    const db = await openHqccDexieDb();
    const stored = await db.pairs.get(record.id);

    expect(record).toEqual(
      expect.objectContaining({
        name: "Front Title - Back Title",
        nameLower: "front title - back title",
        frontFaceId: "front-1",
        backFaceId: "back-1",
      }),
    );
    expect(stored).toEqual(record);
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("pairs", record.id);
  });

  it("returns the existing pair when the same front/back pair already exists", async () => {
    const db = await openHqccDexieDb();
    const existing = createPairRecord({
      id: "pair-existing",
      frontFaceId: "front-1",
      backFaceId: "back-1",
    });
    await db.pairs.put(existing);

    await expect(createPair("front-1", "back-1")).resolves.toEqual(existing);
    expect(getCard).not.toHaveBeenCalled();
    expect(enqueueDbEstimateChange).not.toHaveBeenCalled();
  });
});
