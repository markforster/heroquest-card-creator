import { getAssetBlob } from "@/lib/assets-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import { createTestBlob, deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("getAssetBlob", () => {
  beforeEach(() => {
    jest.resetModules();
    installFakeIndexedDb();
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

  it("returns null when the asset is missing", async () => {
    await expect(getAssetBlob("missing")).resolves.toBeNull();
  });

  it("returns the blob when present", async () => {
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
    });

    await expect(getAssetBlob("a1")).resolves.toEqual(expect.any(Object));
  });

  it("returns null when the asset has no blob", async () => {
    const db = await openHqccDexieDb();
    await db.table("assets").put({
      id: "a1",
      name: "a",
      mimeType: "x",
      width: 1,
      height: 1,
      createdAt: 1,
    });

    await expect(getAssetBlob("a1")).resolves.toBeNull();
  });
});
