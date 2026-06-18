import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { createPairWithOverrides } from "@/lib/pairs-service";

import {
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

describe("createPairWithOverrides", () => {
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

  it("preserves explicit override fields", async () => {
    const record = await createPairWithOverrides({
      id: "pair-custom",
      name: "Custom Pair",
      nameLower: "custom pair",
      frontFaceId: "front-1",
      backFaceId: "back-1",
      createdAt: 10,
      updatedAt: 20,
      schemaVersion: 1,
    });
    const db = await openHqccDexieDb();

    await expect(db.pairs.get("pair-custom")).resolves.toEqual(record);
    expect(record).toEqual(
      expect.objectContaining({
        id: "pair-custom",
        name: "Custom Pair",
        nameLower: "custom pair",
        createdAt: 10,
        updatedAt: 20,
      }),
    );
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("pairs", "pair-custom");
  });
});
