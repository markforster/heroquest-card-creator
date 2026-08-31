const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/db/maintenance/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import {
  createExportProfile,
  getAllExportProfiles,
  getDefaultExportProfile,
  getExportProfileById,
  getExportProfilesState,
  renameExportProfile,
  setDefaultExportProfile,
  setSelectedExportProfile,
  synthesizeExportProfilesFromLegacySettings,
  updateExportProfile,
} from "@/lib/data/export-profiles";
import { getHqccDexieDb } from "@/lib/db/hqcc-dexie";
import { createDefaultExportSettings } from "@/lib/export-settings";
import {
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

describe("export profile operations", () => {
  beforeEach(() => {
    installFakeIndexedDb();
    window.localStorage.clear();
    enqueueDbEstimateChange.mockReset();
  });

  afterEach(async () => {
    getHqccDexieDb().close();
    await deleteDb("hqcc").catch(() => {});
    restoreIndexedDb();
  });

  it("creates, selects, renames, updates, and promotes profiles", async () => {
    const initial = await getExportProfilesState();
    const settings = createDefaultExportSettings();
    settings.roundedCorners = false;
    const created = await createExportProfile({ name: "  Print shop  ", settings });
    const alternate = created.profiles.find((profile) => profile.name === "Print shop")!;

    expect(created.selectedProfileId).toBe(alternate.id);
    expect(await getAllExportProfiles()).toHaveLength(2);
    expect((await getDefaultExportProfile()).id).toBe(initial.defaultProfileId);

    const selected = await setSelectedExportProfile(initial.defaultProfileId);
    expect(selected.selectedProfileId).toBe(initial.defaultProfileId);

    const renamed = await renameExportProfile(alternate.id, "Commercial print");
    expect(getExportProfileById(renamed, alternate.id)?.name).toBe("Commercial print");

    const updatedSettings = createDefaultExportSettings();
    updatedSettings.bleed.enabled = true;
    const updated = await updateExportProfile(alternate.id, updatedSettings);
    expect(getExportProfileById(updated, alternate.id)?.settings.bleed.enabled).toBe(true);

    const promoted = await setDefaultExportProfile(alternate.id);
    expect(promoted.defaultProfileId).toBe(alternate.id);
    expect(promoted.selectedProfileId).toBe(alternate.id);
  });

  it("rejects missing profiles and duplicate or empty names", async () => {
    const state = await getExportProfilesState();
    await createExportProfile({ name: "Alternate", settings: state.profiles[0].settings });

    await expect(setSelectedExportProfile("missing")).rejects.toThrow("Export profile not found");
    await expect(updateExportProfile("missing", state.profiles[0].settings)).rejects.toThrow(
      "Export profile not found",
    );
    await expect(renameExportProfile("missing", "Name")).rejects.toThrow(
      "Export profile not found",
    );
    await expect(setDefaultExportProfile("missing")).rejects.toThrow("Export profile not found");
    await expect(
      createExportProfile({ name: " alternate ", settings: state.profiles[0].settings }),
    ).rejects.toThrow("Profile name already exists");
    await expect(
      createExportProfile({ name: "   ", settings: state.profiles[0].settings }),
    ).rejects.toThrow("Profile name is required");
  });

  it("synthesizes a standalone initial state and resolves IDs safely", () => {
    const settings = createDefaultExportSettings();
    const state = synthesizeExportProfilesFromLegacySettings(settings);

    expect(state.profiles).toHaveLength(1);
    expect(state.profiles[0].settings).toEqual(settings);
    expect(state.profiles[0].settings).not.toBe(settings);
    expect(getExportProfileById(state, state.defaultProfileId)).toBe(state.profiles[0]);
    expect(getExportProfileById(state, undefined)).toBeNull();
    expect(getExportProfileById(state, "missing")).toBeNull();
  });
});
