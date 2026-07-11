const enqueueDbEstimateChange = jest.fn();

jest.mock("@/lib/indexeddb-size-tracker", () => ({
  enqueueDbEstimateChange: (...args: unknown[]) => enqueueDbEstimateChange(...args),
}));

import { getHqccDexieDb } from "@/lib/hqcc-dexie";
import {
  createExportProfile,
  deleteExportProfile,
  getExportProfilesState,
} from "@/lib/export-profiles";
import {
  deleteDb,
  installFakeIndexedDb,
  restoreIndexedDb,
} from "@/lib/test-support/decks-service-test-helpers";

describe("deleteExportProfile", () => {
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

  it("blocks deleting the default profile", async () => {
    const state = await getExportProfilesState();

    await expect(deleteExportProfile(state.defaultProfileId)).rejects.toThrow(
      "Cannot delete the last export profile",
    );
  });

  it("deletes a non-default profile and keeps the default selected", async () => {
    const state = await getExportProfilesState();
    const created = await createExportProfile({
      name: "Alt",
      settings: state.profiles[0].settings,
    });

    expect(created.profiles).toHaveLength(2);

    const next = await deleteExportProfile(
      created.profiles.find((profile) => profile.name === "Alt")!.id,
    );

    expect(next.profiles).toHaveLength(1);
    expect(next.defaultProfileId).toBe(state.defaultProfileId);
    expect(next.selectedProfileId).toBe(state.defaultProfileId);
  });
});
