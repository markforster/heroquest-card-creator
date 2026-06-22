import { getAllAssetsWithBlobs } from "@/lib/assets-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import { createTestBlob, deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("getAllAssetsWithBlobs", () => {
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

  it("returns records with blobs ordered by createdAt", async () => {
    const blob = createTestBlob();
    const db = await openHqccDexieDb();
    await db.table("assets").bulkPut([
      { id: "a2", name: "b", mimeType: "image/png", width: 1, height: 1, createdAt: 2, blob },
      { id: "a1", name: "a", mimeType: "image/png", width: 1, height: 1, createdAt: 1, blob },
    ]);

    const results = await getAllAssetsWithBlobs();
    expect(results).toHaveLength(2);
    expect(results[0]?.id).toBe("a1");
    expect(results[0]?.blob).toEqual(expect.any(Object));
    expect(results[1]?.id).toBe("a2");
  });
});
