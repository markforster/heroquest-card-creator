import type { CollectionRecord } from "@/types/collections-db";

import { getCollection } from "@/lib/collections-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import { deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("getCollection", () => {
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

  it("returns null when the collection is missing", async () => {
    await expect(getCollection("missing")).resolves.toBeNull();
  });

  it("returns the collection when present", async () => {
    const existing: CollectionRecord = {
      id: "c1",
      name: "Test",
      description: undefined,
      cardIds: [],
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };

    const db = await openHqccDexieDb();
    await db.collections.put(existing);

    await expect(getCollection("c1")).resolves.toEqual(existing);
  });
});
