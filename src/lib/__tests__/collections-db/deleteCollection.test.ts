const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import type { CollectionRecord } from "@/types/collections-db";

import { deleteCollection, getCollection } from "@/lib/collections-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";

import { deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("deleteCollection", () => {
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

  it("deletes an existing collection", async () => {
    const existing: CollectionRecord = {
      id: "c1",
      name: "To delete",
      description: undefined,
      cardIds: [],
      createdAt: 1,
      updatedAt: 1,
      schemaVersion: 1,
    };

    const db = await openHqccDexieDb();
    await db.collections.put(existing);

    await deleteCollection("c1");

    await expect(getCollection("c1")).resolves.toBeNull();
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("collections", "c1");
  });

  it("does not fail when deleting a missing collection", async () => {
    await expect(deleteCollection("missing")).resolves.toBeUndefined();
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("collections", "missing");
  });
});
