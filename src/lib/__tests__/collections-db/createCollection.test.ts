const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { createCollection } from "@/lib/collections-db";

import { deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("createCollection", () => {
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

  it("creates a collection with defaults and persists it", async () => {
    jest.spyOn(Date, "now").mockReturnValue(123);

    const record = await createCollection({ name: "My Collection" });

    expect(record).toEqual({
      id: expect.any(String),
      name: "My Collection",
      description: undefined,
      cardIds: [],
      createdAt: 123,
      updatedAt: 123,
      schemaVersion: 1,
    });

    const db = await openHqccDexieDb();
    await expect(db.collections.get(record.id)).resolves.toEqual(record);
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("collections", record.id);
  });
});
