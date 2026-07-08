"use client";

import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";

import { generateId } from ".";
import {
  clearExportSettingKeys,
  createDefaultExportSettings,
  getExportSettings,
  hasLegacyExportSettings,
  type ExportSettings,
} from "./export-settings";
import { openHqccDexieDb } from "./hqcc-dexie";
import type { SettingsRecord } from "./settings-db";

export type ExportProfile = {
  id: string;
  name: string;
  settings: ExportSettings;
  updatedAt: number;
};

export type ExportProfilesState = {
  profiles: ExportProfile[];
  defaultProfileId: string;
  selectedProfileId?: string;
  schemaVersion: 1;
};

export type CreateExportProfileInput = {
  name: string;
  settings: ExportSettings;
};

const SETTINGS_STORE = "settings";
export const EXPORT_PROFILES_SETTINGS_KEY = "exportProfiles";
export const EXPORT_PROFILES_SCHEMA_VERSION = 1 as const;
export const DEFAULT_EXPORT_PROFILE_NAME = "Default";

function cloneExportSettings(settings: ExportSettings): ExportSettings {
  return JSON.parse(JSON.stringify(settings)) as ExportSettings;
}

function createProfileRecord(input: {
  id?: string;
  name: string;
  settings: ExportSettings;
  updatedAt?: number;
}): ExportProfile {
  return {
    id: input.id ?? generateId(),
    name: normalizeProfileName(input.name),
    settings: cloneExportSettings(input.settings),
    updatedAt: input.updatedAt ?? Date.now(),
  };
}

function normalizeProfileName(name: string): string {
  return name.trim();
}

function ensureUniqueProfileName(name: string, profiles: ExportProfile[], ignoreProfileId?: string) {
  const normalized = normalizeProfileName(name);
  if (!normalized) {
    throw new Error("Profile name is required");
  }

  const duplicate = profiles.find((profile) => {
    if (ignoreProfileId && profile.id === ignoreProfileId) {
      return false;
    }
    return profile.name.localeCompare(normalized, undefined, { sensitivity: "accent" }) === 0;
  });

  if (duplicate) {
    throw new Error("Profile name already exists");
  }

  return normalized;
}

function getDefaultProfileId(state: ExportProfilesState): string {
  if (state.profiles.length === 1) {
    return state.profiles[0].id;
  }

  const defaultProfile = state.profiles.find((profile) => profile.id === state.defaultProfileId);
  if (defaultProfile) {
    return defaultProfile.id;
  }

  return state.profiles[0]?.id ?? "";
}

function getSelectedProfileId(state: ExportProfilesState): string | undefined {
  if (!state.profiles.length) return undefined;

  const selectedProfile = state.profiles.find((profile) => profile.id === state.selectedProfileId);
  if (selectedProfile) {
    return selectedProfile.id;
  }

  return getDefaultProfileId(state);
}

function normalizeState(candidate: ExportProfilesState): ExportProfilesState {
  const profiles = candidate.profiles.map((profile) =>
    createProfileRecord({
      id: profile.id,
      name: profile.name,
      settings: profile.settings,
      updatedAt: profile.updatedAt,
    }),
  );

  if (!profiles.length) {
    throw new Error("At least one export profile is required");
  }

  const normalized: ExportProfilesState = {
    profiles,
    defaultProfileId: candidate.defaultProfileId,
    selectedProfileId: candidate.selectedProfileId,
    schemaVersion: EXPORT_PROFILES_SCHEMA_VERSION,
  };

  normalized.defaultProfileId = getDefaultProfileId(normalized);
  normalized.selectedProfileId = getSelectedProfileId(normalized);
  return normalized;
}

function createInitialState(settings: ExportSettings): ExportProfilesState {
  const profile = createProfileRecord({
    name: DEFAULT_EXPORT_PROFILE_NAME,
    settings,
  });

  return {
    profiles: [profile],
    defaultProfileId: profile.id,
    selectedProfileId: profile.id,
    schemaVersion: EXPORT_PROFILES_SCHEMA_VERSION,
  };
}

async function readStoredState(): Promise<ExportProfilesState | null> {
  const db = await openHqccDexieDb();
  const record = (await db.settings.get(EXPORT_PROFILES_SETTINGS_KEY)) as SettingsRecord | undefined;
  if (!record?.value || typeof record.value !== "object") {
    return null;
  }

  const value = record.value as Partial<ExportProfilesState>;
  if (!Array.isArray(value.profiles) || typeof value.defaultProfileId !== "string") {
    return null;
  }

  return normalizeState({
    profiles: value.profiles as ExportProfile[],
    defaultProfileId: value.defaultProfileId,
    selectedProfileId: value.selectedProfileId,
    schemaVersion: EXPORT_PROFILES_SCHEMA_VERSION,
  });
}

async function writeState(state: ExportProfilesState): Promise<ExportProfilesState> {
  const db = await openHqccDexieDb();
  const normalized = normalizeState(state);
  const record: SettingsRecord = {
    id: EXPORT_PROFILES_SETTINGS_KEY,
    value: normalized,
    updatedAt: Date.now(),
    schemaVersion: 1,
  };

  await db.settings.put(record);
  enqueueDbEstimateChange(SETTINGS_STORE, record.id);
  return normalized;
}

async function updateState(
  updater: (state: ExportProfilesState) => ExportProfilesState | Promise<ExportProfilesState>,
): Promise<ExportProfilesState> {
  const current = await getExportProfilesState();
  const next = await updater(current);
  return writeState(next);
}

export async function bootstrapExportProfiles(): Promise<ExportProfilesState> {
  const existing = await readStoredState();
  if (existing) {
    return existing;
  }

  const nextState = createInitialState(
    hasLegacyExportSettings() ? getExportSettings() : createDefaultExportSettings(),
  );
  const migrated = await writeState(nextState);
  if (hasLegacyExportSettings()) {
    clearExportSettingKeys();
  }
  return migrated;
}

export async function getExportProfilesState(): Promise<ExportProfilesState> {
  return bootstrapExportProfiles();
}

export async function getAllExportProfiles(): Promise<ExportProfile[]> {
  const state = await getExportProfilesState();
  return state.profiles.map((profile) => ({
    ...profile,
    settings: cloneExportSettings(profile.settings),
  }));
}

export async function getDefaultExportProfile(): Promise<ExportProfile> {
  const state = await getExportProfilesState();
  const profile = state.profiles.find((entry) => entry.id === state.defaultProfileId);
  if (!profile) {
    throw new Error("Default export profile not found");
  }
  return {
    ...profile,
    settings: cloneExportSettings(profile.settings),
  };
}

export async function setSelectedExportProfile(profileId: string): Promise<ExportProfilesState> {
  return updateState((state) => {
    const profile = state.profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      throw new Error("Export profile not found");
    }

    return {
      ...state,
      selectedProfileId: profile.id,
    };
  });
}

export async function createExportProfile(
  input: CreateExportProfileInput,
): Promise<ExportProfilesState> {
  return updateState((state) => {
    const name = ensureUniqueProfileName(input.name, state.profiles);
    const profile = createProfileRecord({
      name,
      settings: input.settings,
    });

    return {
      ...state,
      profiles: [...state.profiles, profile],
      selectedProfileId: profile.id,
    };
  });
}

export async function updateExportProfile(
  profileId: string,
  settings: ExportSettings,
): Promise<ExportProfilesState> {
  return updateState((state) => {
    const profile = state.profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      throw new Error("Export profile not found");
    }

    return {
      ...state,
      profiles: state.profiles.map((entry) =>
        entry.id === profileId
          ? {
              ...entry,
              settings: cloneExportSettings(settings),
              updatedAt: Date.now(),
            }
          : entry,
      ),
    };
  });
}

export async function renameExportProfile(
  profileId: string,
  name: string,
): Promise<ExportProfilesState> {
  return updateState((state) => {
    const profile = state.profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      throw new Error("Export profile not found");
    }

    const nextName = ensureUniqueProfileName(name, state.profiles, profileId);

    return {
      ...state,
      profiles: state.profiles.map((entry) =>
        entry.id === profileId
          ? {
              ...entry,
              name: nextName,
              updatedAt: Date.now(),
            }
          : entry,
      ),
    };
  });
}

export async function deleteExportProfile(profileId: string): Promise<ExportProfilesState> {
  return updateState((state) => {
    if (state.profiles.length <= 1) {
      throw new Error("Cannot delete the last export profile");
    }
    if (state.defaultProfileId === profileId) {
      throw new Error("Cannot delete the default export profile");
    }

    const remaining = state.profiles.filter((entry) => entry.id !== profileId);
    if (remaining.length === state.profiles.length) {
      throw new Error("Export profile not found");
    }

    return normalizeState({
      ...state,
      profiles: remaining,
      selectedProfileId: state.defaultProfileId,
    });
  });
}

export async function setDefaultExportProfile(profileId: string): Promise<ExportProfilesState> {
  return updateState((state) => {
    const profile = state.profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      throw new Error("Export profile not found");
    }

    return {
      ...state,
      defaultProfileId: profile.id,
      selectedProfileId: profile.id,
    };
  });
}

export async function restoreExportProfilesState(
  state: ExportProfilesState,
): Promise<ExportProfilesState> {
  return writeState(state);
}

export function synthesizeExportProfilesFromLegacySettings(settings?: ExportSettings): ExportProfilesState {
  return createInitialState(settings ?? getExportSettings());
}

export function getExportProfileById(
  state: ExportProfilesState,
  profileId: string | undefined,
): ExportProfile | null {
  if (!profileId) return null;
  return state.profiles.find((profile) => profile.id === profileId) ?? null;
}
