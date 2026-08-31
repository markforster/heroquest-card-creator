const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/db/maintenance/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import {
  COPYRIGHT_TEMPLATE_DEFAULTS_KEY,
  getCopyrightTemplateDefaults,
  setCopyrightTemplateDefaults,
} from "@/lib/data/settings-db";
import { getHqccDexieDb, openHqccDexieDb } from "@/lib/db/hqcc-dexie";

import { deleteDb, installFakeIndexedDb, restoreIndexedDb } from "./test-helpers";

describe("copyright template defaults settings", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    enqueueDbEstimateChange.mockReset();
  });

  afterEach(async () => {
    getHqccDexieDb().close();
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
  });

  it("normalizes missing and invalid stored values", async () => {
    const db = await openHqccDexieDb();
    await db.settings.put({
      id: COPYRIGHT_TEMPLATE_DEFAULTS_KEY,
      value: { hero: true, monster: "invalid", unknown: false },
      updatedAt: 1,
      schemaVersion: 1,
    });

    await expect(getCopyrightTemplateDefaults()).resolves.toEqual({ hero: true });
  });

  it("normalizes and persists explicit defaults", async () => {
    jest.spyOn(Date, "now").mockReturnValue(123);

    await setCopyrightTemplateDefaults({ hero: false, monster: true });

    const db = await openHqccDexieDb();
    await expect(db.settings.get(COPYRIGHT_TEMPLATE_DEFAULTS_KEY)).resolves.toEqual({
      id: COPYRIGHT_TEMPLATE_DEFAULTS_KEY,
      value: { hero: false, monster: true },
      updatedAt: 123,
      schemaVersion: 1,
    });
    expect(enqueueDbEstimateChange).toHaveBeenCalledWith(
      "settings",
      COPYRIGHT_TEMPLATE_DEFAULTS_KEY,
    );
  });
});
