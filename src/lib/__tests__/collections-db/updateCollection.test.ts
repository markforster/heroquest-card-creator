const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import type { CollectionRecord } from "@/types/collections-db";

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { updateCollection } from "@/lib/collections-db";

import { deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("updateCollection", () => {
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

  it("returns null when the collection does not exist", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1);

    const result = await updateCollection("missing", { name: "New" });

    expect(result).toBeNull();
    expect(enqueueDbEstimateChange).not.toHaveBeenCalled();
  });

  it("updates an existing collection and bumps updatedAt", async () => {
    jest.spyOn(Date, "now").mockReturnValue(200);
    const existing: CollectionRecord = {
      id: "c1",
      name: "Old",
      description: "desc",
      cardIds: ["a"],
      createdAt: 100,
      updatedAt: 100,
      schemaVersion: 1,
    };

    const db = await openHqccDexieDb();
    await db.collections.put(existing);

    const next = await updateCollection("c1", { name: "New", description: undefined });

    expect(next).toEqual({
      ...existing,
      name: "New",
      description: undefined,
      updatedAt: 200,
    });
    await expect(db.collections.get("c1")).resolves.toEqual(next);
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("collections", "c1");
  });
});
