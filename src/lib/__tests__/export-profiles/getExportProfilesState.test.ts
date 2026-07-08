const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import { getHqccDexieDb } from "@/lib/hqcc-dexie";
import {
  getExportProfilesState,
  restoreExportProfilesState,
} from "@/lib/export-profiles";
import {
  EXPORT_SETTINGS_STORAGE_KEYS,
  clearExportSettingKeys,
} from "@/lib/export-settings";
import {
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

describe("getExportProfilesState", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    enqueueDbEstimateChange.mockReset();
    window.localStorage.clear();
  });

  afterEach(async () => {
    try {
      getHqccDexieDb().close();
    } catch {
      // Ignore teardown failures if DB never opened.
    }
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
  });

  it("creates one default profile from built-in defaults on a fresh install", async () => {
    const state = await getExportProfilesState();

    expect(state.profiles).toHaveLength(1);
    expect(state.profiles[0].name).toBe("Default");
    expect(state.defaultProfileId).toBe(state.profiles[0].id);
    expect(state.selectedProfileId).toBe(state.profiles[0].id);
    expect(state.profiles[0].settings.bleed.bleedPx).toBe(36);
  });

  it("migrates legacy localStorage values into the initial default profile and clears the keys", async () => {
    window.localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEYS.bleedEnabled, "1");
    window.localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEYS.bleedPx, "12");
    window.localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEYS.askBeforeExport, "1");

    const state = await getExportProfilesState();

    expect(state.profiles).toHaveLength(1);
    expect(state.profiles[0].settings.bleed.enabled).toBe(true);
    expect(state.profiles[0].settings.bleed.bleedPx).toBe(12);
    expect(state.profiles[0].settings.bleed.askBeforeExport).toBe(true);
    expect(window.localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEYS.bleedEnabled)).toBeNull();
    expect(window.localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEYS.bleedPx)).toBeNull();
    expect(window.localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEYS.askBeforeExport)).toBeNull();
  });

  it("returns stored Dexie export profiles without reusing cleared localStorage values", async () => {
    const stored = await getExportProfilesState();
    clearExportSettingKeys();

    const reloaded = await restoreExportProfilesState(stored);
    expect(reloaded).toEqual(stored);
  });
});
