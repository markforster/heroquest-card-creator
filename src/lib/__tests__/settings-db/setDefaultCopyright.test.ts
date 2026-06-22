const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { setDefaultCopyright } from "@/lib/settings-db";

import { deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("setDefaultCopyright", () => {
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

  it("writes the copyright record and enqueues a DB estimate update", async () => {
    jest.spyOn(Date, "now").mockReturnValue(456);

    await expect(setDefaultCopyright("2026 HeroQuest")).resolves.toBeUndefined();

    const db = await openHqccDexieDb();
    await expect(db.settings.get("defaultCopyright")).resolves.toEqual({
      id: "defaultCopyright",
      value: "2026 HeroQuest",
      updatedAt: 456,
      schemaVersion: 1,
    });
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith("settings", "defaultCopyright");
  });
});
