import { getAllAssets } from "@/lib/assets-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import { createTestBlob, deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("getAllAssets", () => {
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

  it("returns metadata-only records ordered by createdAt", async () => {
    const blob = createTestBlob();
    const db = await openHqccDexieDb();
    await db.table("assets").bulkPut([
      { id: "a2", name: "b", mimeType: "x", width: 1, height: 1, createdAt: 2, blob },
      { id: "a1", name: "a", mimeType: "x", width: 1, height: 1, createdAt: 1, blob },
    ]);

    await expect(getAllAssets()).resolves.toEqual([
      { id: "a1", name: "a", mimeType: "x", width: 1, height: 1, createdAt: 1 },
      { id: "a2", name: "b", mimeType: "x", width: 1, height: 1, createdAt: 2 },
    ]);
  });
});
