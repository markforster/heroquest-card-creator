"use client";

import {
  normalizeCopyrightTemplateDefaults,
  type CopyrightTemplateDefaults,
} from "@/lib/copyright-defaults";
import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";
import { openHqccDexieDb } from "./hqcc-dexie";

/**
 * Generic persisted settings row stored in the shared settings table.
 */
export type SettingsRecord = {
  id: string;
  value: unknown;
  updatedAt: number;
  schemaVersion: 1;
};

const SETTINGS_STORE = "settings";
const BORDER_SWATCHES_KEY = "borderSwatches";
const DEFAULT_COPYRIGHT_KEY = "defaultCopyright";
/**
 * Settings-table key for per-template copyright visibility defaults.
 */
export const COPYRIGHT_TEMPLATE_DEFAULTS_KEY = "copyrightTemplateDefaults";

/**
 * Returns the shared border swatch palette used by color-picking UI.
 */
export async function getBorderSwatches(): Promise<string[]> {
  const db = await openHqccDexieDb();
  const record = (await db.settings.get(BORDER_SWATCHES_KEY)) as SettingsRecord | undefined;
  const value = record?.value;

  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === "string") as string[];
  }

  return [];
}

/**
 * Persists the shared border swatch palette used across card editors.
 */
export async function setBorderSwatches(swatches: string[]): Promise<void> {
  const db = await openHqccDexieDb();
  const record: SettingsRecord = {
    id: BORDER_SWATCHES_KEY,
    value: swatches,
    updatedAt: Date.now(),
    schemaVersion: 1,
  };

  await db.settings.put(record);
  enqueueDbEstimateChange(SETTINGS_STORE, record.id);
}

/**
 * Returns the fallback copyright text applied when a card has no override.
 */
export async function getDefaultCopyright(): Promise<string> {
  const db = await openHqccDexieDb();
  const record = (await db.settings.get(DEFAULT_COPYRIGHT_KEY)) as SettingsRecord | undefined;
  const value = record?.value;

  if (typeof value === "string") {
    return value;
  }

  return "";
}

/**
 * Persists the global fallback copyright text.
 */
export async function setDefaultCopyright(value: string): Promise<void> {
  const db = await openHqccDexieDb();
  const record: SettingsRecord = {
    id: DEFAULT_COPYRIGHT_KEY,
    value,
    updatedAt: Date.now(),
    schemaVersion: 1,
  };

  await db.settings.put(record);
  enqueueDbEstimateChange(SETTINGS_STORE, record.id);
}

/**
 * Loads explicit per-template copyright visibility overrides.
 */
export async function getCopyrightTemplateDefaults(): Promise<CopyrightTemplateDefaults> {
  const db = await openHqccDexieDb();
  const record = (await db.settings.get(COPYRIGHT_TEMPLATE_DEFAULTS_KEY)) as
    | SettingsRecord
    | undefined;

  return normalizeCopyrightTemplateDefaults(record?.value);
}

/**
 * Persists per-template copyright visibility overrides after normalizing the payload.
 */
export async function setCopyrightTemplateDefaults(
  defaults: CopyrightTemplateDefaults,
): Promise<void> {
  const db = await openHqccDexieDb();
  const normalized = normalizeCopyrightTemplateDefaults(defaults);
  const record: SettingsRecord = {
    id: COPYRIGHT_TEMPLATE_DEFAULTS_KEY,
    value: normalized,
    updatedAt: Date.now(),
    schemaVersion: 1,
  };

  await db.settings.put(record);
  enqueueDbEstimateChange(SETTINGS_STORE, record.id);
}
