"use client";

import {
  DB_NAME,
  DB_VERSION,
  ensureDexieMetaAppVersionRecord,
  openHqccDexieDb,
} from "@/lib/hqcc-dexie";
import {
  ensureIndexedDbAvailable,
  probeHqccDbVersion,
  readExistingHqccDbAppVersion,
  readExistingHqccDbVersion,
} from "@/lib/hqcc-db-native";
import { runHqccDbStartupJobs } from "@/lib/hqcc-db-startup-jobs";

/**
 * Native IndexedDB handle returned after the Dexie-backed database has been opened successfully.
 */
export type HqccDb = IDBDatabase;
export { DB_NAME, DB_VERSION };

/**
 * Opens the HeroQuest Card Creator database, ensures metadata records exist, and schedules startup jobs.
 */
export async function openHqccDb(): Promise<HqccDb> {
  try {
    ensureIndexedDbAvailable();
    const dexieDb = await openHqccDexieDb();
    const db = dexieDb.backendDB();

    if (!db) {
      throw new Error("Failed to access native hqcc DB");
    }

    await ensureDexieMetaAppVersionRecord(dexieDb);

    // eslint-disable-next-line no-console
    console.debug("[hqcc-db] openHqccDb success");
    runHqccDbStartupJobs(dexieDb);

    return db;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[hqcc-db] openHqccDb error", error);
    throw error;
  }
}
export { probeHqccDbVersion, readExistingHqccDbVersion, readExistingHqccDbAppVersion };
