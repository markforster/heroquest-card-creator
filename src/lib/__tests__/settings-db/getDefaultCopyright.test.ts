import type { SettingsRecord } from "@/lib/settings-db";

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { getDefaultCopyright } from "@/lib/settings-db";

import { deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("getDefaultCopyright", () => {
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

  it("returns the saved copyright when the record exists", async () => {
    const db = await openHqccDexieDb();
    await db.settings.put({
      id: "defaultCopyright",
      value: "2026 HeroQuest",
      updatedAt: 1,
      schemaVersion: 1,
    } satisfies SettingsRecord);

    await expect(getDefaultCopyright()).resolves.toBe("2026 HeroQuest");
  });

  it("returns an empty string when the record is missing", async () => {
    const db = await openHqccDexieDb();
    await db.settings.clear();

    await expect(getDefaultCopyright()).resolves.toBe("");
  });

  it("returns an empty string when the saved value is not a string", async () => {
    const db = await openHqccDexieDb();
    await db.settings.put({
      id: "defaultCopyright",
      value: ["not-a-string"],
      updatedAt: 1,
      schemaVersion: 1,
    } satisfies SettingsRecord);

    await expect(getDefaultCopyright()).resolves.toBe("");
  });
});
