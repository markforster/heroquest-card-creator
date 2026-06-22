"use client";

import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";
import { openHqccDexieDb } from "./hqcc-dexie";

export type SettingsRecord = {
  id: string;
  value: unknown;
  updatedAt: number;
  schemaVersion: 1;
};

const SETTINGS_STORE = "settings";
const BORDER_SWATCHES_KEY = "borderSwatches";
const DEFAULT_COPYRIGHT_KEY = "defaultCopyright";

export async function getBorderSwatches(): Promise<string[]> {
  const db = await openHqccDexieDb();
  const record = (await db.settings.get(BORDER_SWATCHES_KEY)) as SettingsRecord | undefined;
  const value = record?.value;

  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === "string") as string[];
  }

  return [];
}

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

export async function getDefaultCopyright(): Promise<string> {
  const db = await openHqccDexieDb();
  const record = (await db.settings.get(DEFAULT_COPYRIGHT_KEY)) as SettingsRecord | undefined;
  const value = record?.value;

  if (typeof value === "string") {
    return value;
  }

  return "";
}

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
