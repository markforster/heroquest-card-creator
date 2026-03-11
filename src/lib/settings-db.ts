"use client";

import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";
import { openHqccDb } from "./hqcc-db";

export type SettingsRecord = {
  id: string;
  value: unknown;
  updatedAt: number;
  schemaVersion: 1;
};

const SETTINGS_STORE = "settings";
const BORDER_SWATCHES_KEY = "borderSwatches";
const DEFAULT_COPYRIGHT_KEY = "defaultCopyright";

async function getSettingsStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openHqccDb();
  const tx = db.transaction(SETTINGS_STORE, mode);
  return tx.objectStore(SETTINGS_STORE);
}

export async function getBorderSwatches(): Promise<string[]> {
  const store = await getSettingsStore("readonly");

  return new Promise<string[]>((resolve, reject) => {
    const request = store.get(BORDER_SWATCHES_KEY);
    request.onsuccess = () => {
      const record = request.result as SettingsRecord | undefined;
      const value = record?.value;
      if (Array.isArray(value)) {
        resolve(value.filter((entry) => typeof entry === "string") as string[]);
        return;
      }
      resolve([]);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to read border swatches"));
    };
  });
}

export async function setBorderSwatches(swatches: string[]): Promise<void> {
  const store = await getSettingsStore("readwrite");

  return new Promise<void>((resolve, reject) => {
    const record: SettingsRecord = {
      id: BORDER_SWATCHES_KEY,
      value: swatches,
      updatedAt: Date.now(),
      schemaVersion: 1,
    };

    const request = store.put(record);
    request.onsuccess = () => {
      enqueueDbEstimateChange(SETTINGS_STORE, record.id);
      resolve();
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to save border swatches"));
  });
}

export async function getDefaultCopyright(): Promise<string> {
  const store = await getSettingsStore("readonly");

  return new Promise<string>((resolve, reject) => {
    const request = store.get(DEFAULT_COPYRIGHT_KEY);
    request.onsuccess = () => {
      const record = request.result as SettingsRecord | undefined;
      const value = record?.value;
      if (typeof value === "string") {
        resolve(value);
        return;
      }
      resolve("");
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to read default copyright"));
    };
  });
}

export async function setDefaultCopyright(value: string): Promise<void> {
  const store = await getSettingsStore("readwrite");

  return new Promise<void>((resolve, reject) => {
    const record: SettingsRecord = {
      id: DEFAULT_COPYRIGHT_KEY,
      value,
      updatedAt: Date.now(),
      schemaVersion: 1,
    };

    const request = store.put(record);
    request.onsuccess = () => {
      enqueueDbEstimateChange(SETTINGS_STORE, record.id);
      resolve();
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to save default copyright"));
  });
}
