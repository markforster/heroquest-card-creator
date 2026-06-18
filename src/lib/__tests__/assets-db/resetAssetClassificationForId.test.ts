const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { resetAssetClassificationForId } from "@/lib/assets-db";

import { createTestBlob, deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("resetAssetClassificationForId", () => {
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

  it("clears classification fields for a single asset and dispatches the assets-updated event", async () => {
    const listener = jest.fn();
    window.addEventListener("hqcc-assets-updated", listener);

    const blob = createTestBlob();
    const db = await openHqccDexieDb();
    await db.table("assets").put({
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
    });

    await expect(resetAssetClassificationForId("a1")).resolves.toBeUndefined();

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

    window.removeEventListener("hqcc-assets-updated", listener);
  });

  it("is a no-op when the asset is missing", async () => {
    const listener = jest.fn();
    window.addEventListener("hqcc-assets-updated", listener);

    await expect(resetAssetClassificationForId("missing")).resolves.toBeUndefined();

    expect(listener).not.toHaveBeenCalled();
    expect(enqueueDbEstimateChange).not.toHaveBeenCalled();

    window.removeEventListener("hqcc-assets-updated", listener);
  });
});
