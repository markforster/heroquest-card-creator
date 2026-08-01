const getExportProfilesState = jest.fn();
const getExportProfileById = jest.fn();
const setSelectedExportProfile = jest.fn();
const setDefaultExportProfile = jest.fn();
const getDefaultExportProfile = jest.fn();

jest.mock("@/lib/data/export-profiles", () => ({
  getExportProfilesState: (...args: unknown[]) => getExportProfilesState(...args),
  getExportProfileById: (...args: unknown[]) => getExportProfileById(...args),
  setSelectedExportProfile: (...args: unknown[]) => setSelectedExportProfile(...args),
  setDefaultExportProfile: (...args: unknown[]) => setDefaultExportProfile(...args),
  getDefaultExportProfile: (...args: unknown[]) => getDefaultExportProfile(...args),
}));

import { act, renderHook, waitFor } from "@testing-library/react";

import {
  ExportSettingsProvider,
  getHydratedDefaultExportProfile,
  useExportProfilesState,
  useExportSettingsState,
} from "@/components/Providers/ExportSettingsContext";
import type { ExportProfile, ExportProfilesState } from "@/lib/data/export-profiles";
import { createDefaultExportSettings } from "@/lib/export-settings";

import type { ReactNode } from "react";

const settings = createDefaultExportSettings();
const profile = { id: "profile-1", name: "Default", settings } as ExportProfile;
const state = {
  profiles: [profile],
  defaultProfileId: profile.id,
  selectedProfileId: profile.id,
} as ExportProfilesState;

const wrapper = ({ children }: { children: ReactNode }) => (
  <ExportSettingsProvider>{children}</ExportSettingsProvider>
);

describe("ExportSettingsProvider", () => {
  beforeEach(() => {
    getExportProfilesState.mockReset().mockResolvedValue(state);
    getExportProfileById
      .mockReset()
      .mockImplementation((_state, id) => (id === profile.id ? profile : null));
    setSelectedExportProfile.mockReset().mockResolvedValue(state);
    setDefaultExportProfile.mockReset().mockResolvedValue(state);
    getDefaultExportProfile.mockReset().mockResolvedValue(profile);
  });

  it("hydrates profile and settings contexts and applies profile changes", async () => {
    const profiles = renderHook(() => useExportProfilesState(), { wrapper });
    await waitFor(() => expect(profiles.result.current.isReady).toBe(true));
    expect(profiles.result.current.selectedProfile).toBe(profile);

    await act(() => profiles.result.current.setSelectedProfileId(profile.id));
    await act(() => profiles.result.current.setDefaultProfileId(profile.id));
    await act(() => profiles.result.current.refresh());
    expect(setSelectedExportProfile).toHaveBeenCalledWith(profile.id);
    expect(setDefaultExportProfile).toHaveBeenCalledWith(profile.id);

    const resolvedSettings = renderHook(() => useExportSettingsState(), { wrapper });
    await waitFor(() => expect(resolvedSettings.result.current.isReady).toBe(true));
    expect(resolvedSettings.result.current.settings).toEqual(settings);
  });

  it("loads the hydrated default profile directly", async () => {
    await expect(getHydratedDefaultExportProfile()).resolves.toBe(profile);
  });
});
