const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { setBorderSwatches } from "@/lib/settings-db";

import { deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("setBorderSwatches", () => {
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

  it("writes the swatches record and enqueues a DB estimate update", async () => {
    jest.spyOn(Date, "now").mockReturnValue(123);

    await expect(setBorderSwatches(["#111111", "#222222"])).resolves.toBeUndefined();

    const db = await openHqccDexieDb();
    await expect(db.settings.get("borderSwatches")).resolves.toEqual({
      id: "borderSwatches",
      value: ["#111111", "#222222"],
      updatedAt: 123,
      schemaVersion: 1,
    });
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("settings", "borderSwatches");
  });
});
