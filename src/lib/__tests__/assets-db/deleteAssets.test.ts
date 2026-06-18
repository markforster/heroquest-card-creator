const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import type { AssetRecordWithBlob } from "@/lib/assets-db";

import { deleteAssets, getAllAssetsWithBlobs } from "@/lib/assets-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import { createTestBlob, deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("deleteAssets", () => {
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

  it("returns early when ids is empty", async () => {
    const openSpy = jest.spyOn(indexedDB, "open");
    await deleteAssets([]);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("deletes assets and resolves after the transaction completes", async () => {
    const blob = createTestBlob();
    const initial: AssetRecordWithBlob[] = [
      { id: "a", name: "a", mimeType: "image/png", width: 1, height: 1, createdAt: 1, blob },
      { id: "b", name: "b", mimeType: "image/png", width: 1, height: 1, createdAt: 2, blob },
    ];
    const db = await openHqccDexieDb();
    await db.table("assets").bulkPut(initial);

    await expect(deleteAssets(["a", "b"])).resolves.toBeUndefined();
    await expect(getAllAssetsWithBlobs()).resolves.toEqual([]);
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("assets", "a");
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("assets", "b");
  });
});
