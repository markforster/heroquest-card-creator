const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { replaceAsset } from "@/lib/assets-db";

import { createTestBlob, deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("replaceAsset", () => {
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

  it("preserves an explicitly supplied createdAt value", async () => {
    const blob = createTestBlob();

    await expect(
      replaceAsset(
        "a1",
        blob,
        { name: "img.png", mimeType: "image/png", width: 10, height: 20 },
        99,
      ),
    ).resolves.toBeUndefined();

    const db = await openHqccDexieDb();
    await expect(db.table("assets").get("a1")).resolves.toEqual({
      id: "a1",
      createdAt: 99,
      name: "img.png",
      mimeType: "image/png",
      width: 10,
      height: 20,
      blob: expect.any(Object),
    });
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("assets", "a1");
  });
});
