const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import { clearAssetClassification } from "@/lib/assets-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import { createTestBlob, deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("clearAssetClassification", () => {
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

  it("clears classification fields, returns the count, and dispatches the assets-updated event", async () => {
    const listener = jest.fn();
    window.addEventListener("hqcc-assets-updated", listener);

    const blob = createTestBlob();
    const db = await openHqccDexieDb();
    await db.table("assets").bulkPut([
      {
        id: "a1",
        name: "a",
        mimeType: "image/png",
        width: 1,
        height: 1,
        createdAt: 1,
        blob,
        assetKind: "icon",
        assetKindStatus: "classified",
        assetKindSource: "manual",
        assetKindConfidence: 0.9,
        assetKindUpdatedAt: 10,
      },
      {
        id: "a2",
        name: "b",
        mimeType: "image/png",
        width: 1,
        height: 1,
        createdAt: 2,
        blob,
      },
    ]);

    await expect(clearAssetClassification()).resolves.toBe(2);

    await expect(db.table("assets").get("a1")).resolves.toEqual({
      id: "a1",
      name: "a",
      mimeType: "image/png",
      width: 1,
      height: 1,
      createdAt: 1,
      blob: expect.any(Object),
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("assets", "a1");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("assets", "a2");

    window.removeEventListener("hqcc-assets-updated", listener);
  });
});
