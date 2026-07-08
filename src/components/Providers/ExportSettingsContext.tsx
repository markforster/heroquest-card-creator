"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  getDefaultExportProfile,
  getExportProfilesState,
  getExportProfileById,
  setDefaultExportProfile,
  setSelectedExportProfile,
  type ExportProfile,
  type ExportProfilesState,
} from "@/lib/export-profiles";
import {
  createDefaultExportSettings,
  type ExportSettings,
} from "@/lib/export-settings";

import type { ReactNode } from "react";

type ExportProfilesContextValue = {
  isReady: boolean;
  profiles: ExportProfile[];
  defaultProfile: ExportProfile | null;
  defaultSettings: ExportSettings;
  selectedProfileId?: string;
  selectedProfile: ExportProfile | null;
  refresh: () => Promise<void>;
  setSelectedProfileId: (profileId: string) => Promise<void>;
  setDefaultProfileId: (profileId: string) => Promise<void>;
};

type ExportSettingsContextValue = {
  isReady: boolean;
  settings: ExportSettings;
};

const DEFAULT_SETTINGS = createDefaultExportSettings();

const ExportProfilesContext = createContext<ExportProfilesContextValue | null>(null);
const ExportSettingsContext = createContext<ExportSettingsContextValue | null>(null);

function cloneExportSettings(settings: ExportSettings): ExportSettings {
  return JSON.parse(JSON.stringify(settings)) as ExportSettings;
}

function resolveStateDefaults(state: ExportProfilesState | null): {
  profiles: ExportProfile[];
  selectedProfileId?: string;
  selectedProfile: ExportProfile | null;
  defaultProfile: ExportProfile | null;
  defaultSettings: ExportSettings;
} {
  if (!state) {
    return {
      profiles: [],
      selectedProfileId: undefined,
      selectedProfile: null,
      defaultProfile: null,
      defaultSettings: cloneExportSettings(DEFAULT_SETTINGS),
    };
  }

  const defaultProfile = getExportProfileById(state, state.defaultProfileId);
  const selectedProfile = getExportProfileById(
    state,
    state.selectedProfileId ?? state.defaultProfileId,
  );

  return {
    profiles: state.profiles,
    selectedProfileId: selectedProfile?.id ?? defaultProfile?.id,
    selectedProfile,
    defaultProfile,
    defaultSettings: cloneExportSettings(defaultProfile?.settings ?? DEFAULT_SETTINGS),
  };
}

export function ExportSettingsProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<ExportProfilesState | null>(null);

  const refresh = useCallback(async () => {
    const nextState = await getExportProfilesState();
    setState(nextState);
    setIsReady(true);
  }, []);

  useEffect(() => {
    let active = true;

    getExportProfilesState()
      .then((nextState) => {
        if (!active) return;
        setState(nextState);
      })
      .finally(() => {
        if (active) {
          setIsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const setSelectedProfileId = useCallback(
    async (profileId: string) => {
      const nextState = await setSelectedExportProfile(profileId);
      setState(nextState);
      setIsReady(true);
    },
    [],
  );

  const setDefaultProfileId = useCallback(
    async (profileId: string) => {
      const nextState = await setDefaultExportProfile(profileId);
      setState(nextState);
      setIsReady(true);
    },
    [],
  );

  const resolved = useMemo(() => resolveStateDefaults(state), [state]);

  const profilesValue = useMemo<ExportProfilesContextValue>(
    () => ({
      isReady,
      profiles: resolved.profiles,
      defaultProfile: resolved.defaultProfile,
      defaultSettings: resolved.defaultSettings,
      selectedProfileId: resolved.selectedProfileId,
      selectedProfile: resolved.selectedProfile,
      refresh,
      setSelectedProfileId,
      setDefaultProfileId,
    }),
    [
      isReady,
      refresh,
      resolved.defaultProfile,
      resolved.defaultSettings,
      resolved.profiles,
      resolved.selectedProfile,
      resolved.selectedProfileId,
      setDefaultProfileId,
      setSelectedProfileId,
    ],
  );

  const settingsValue = useMemo<ExportSettingsContextValue>(
    () => ({
      isReady,
      settings: resolved.defaultSettings,
    }),
    [isReady, resolved.defaultSettings],
  );

  return (
    <ExportProfilesContext.Provider value={profilesValue}>
      <ExportSettingsContext.Provider value={settingsValue}>
        {children}
      </ExportSettingsContext.Provider>
    </ExportProfilesContext.Provider>
  );
}

export function useExportProfilesState() {
  const context = useContext(ExportProfilesContext);
  if (!context) {
    throw new Error("useExportProfilesState must be used within ExportSettingsProvider");
  }
  return context;
}

export function useExportSettingsState() {
  const context = useContext(ExportSettingsContext);
  if (!context) {
    throw new Error("useExportSettingsState must be used within ExportSettingsProvider");
  }
  return context;
}

export async function getHydratedDefaultExportProfile(): Promise<ExportProfile> {
  return getDefaultExportProfile();
}
