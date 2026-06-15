import type { SettingsRecord } from "@/lib/settings-db";

import { getHqccDexieDb, openHqccDexieDb } from "@/lib/hqcc-dexie";
import { getBorderSwatches } from "@/lib/settings-db";

import { deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("getBorderSwatches", () => {
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

  it("returns the saved swatches when the record exists", async () => {
    const db = await openHqccDexieDb();
    await db.settings.put({
      id: "borderSwatches",
      value: ["#111111", "#222222"],
      updatedAt: 1,
      schemaVersion: 1,
    } satisfies SettingsRecord);

    await expect(getBorderSwatches()).resolves.toEqual(["#111111", "#222222"]);
  });

  it("returns only string entries when the saved array contains invalid values", async () => {
    const db = await openHqccDexieDb();
    await db.settings.put({
      id: "borderSwatches",
      value: ["#111111", 123, null, "#222222"],
      updatedAt: 1,
      schemaVersion: 1,
    } satisfies SettingsRecord);

    await expect(getBorderSwatches()).resolves.toEqual(["#111111", "#222222"]);
  });

  it("returns an empty array when the record is missing", async () => {
    const db = await openHqccDexieDb();
    await db.settings.clear();

    await expect(getBorderSwatches()).resolves.toEqual([]);
  });

  it("returns an empty array when the saved value is not an array", async () => {
    const db = await openHqccDexieDb();
    await db.settings.put({
      id: "borderSwatches",
      value: "not-an-array",
      updatedAt: 1,
      schemaVersion: 1,
    } satisfies SettingsRecord);

    await expect(getBorderSwatches()).resolves.toEqual([]);
  });
});
