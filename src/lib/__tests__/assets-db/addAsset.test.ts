const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import { addAsset } from "@/lib/assets-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import { createTestBlob, deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("addAsset", () => {
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

  it("writes the record and resolves after the Dexie transaction completes", async () => {
    jest.spyOn(Date, "now").mockReturnValue(123);

    const blob = createTestBlob();
    await expect(
      addAsset("a1", blob, { name: "img.png", mimeType: "image/png", width: 10, height: 20 }),
    ).resolves.toBeUndefined();

    const db = await openHqccDexieDb();
    await expect(db.table("assets").get("a1")).resolves.toEqual({
      id: "a1",
      createdAt: 123,
      name: "img.png",
      mimeType: "image/png",
      width: 10,
      height: 20,
      blob: expect.any(Object),
    });
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("assets", "a1");
  });
});
