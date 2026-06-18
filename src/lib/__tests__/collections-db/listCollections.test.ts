import type { CollectionRecord } from "@/types/collections-db";

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { listCollections } from "@/lib/collections-db";

import { deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("listCollections", () => {
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

  it("returns an empty list when there are no collections", async () => {
    await expect(listCollections()).resolves.toEqual([]);
  });

  it("returns case-insensitively sorted collections", async () => {
    const a: CollectionRecord = {
      id: "a",
      name: "apple",
      description: undefined,
      cardIds: [],
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };
    const b: CollectionRecord = {
      id: "b",
      name: "Banana",
      description: undefined,
      cardIds: [],
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };
    const c: CollectionRecord = {
      id: "c",
      name: "cherry",
      description: undefined,
      cardIds: [],
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };

    const db = await openHqccDexieDb();
    await db.collections.bulkPut([c, b, a]);

    await expect(listCollections()).resolves.toEqual([a, b, c]);
  });
});
