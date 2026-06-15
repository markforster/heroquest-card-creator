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

export type HqccDb = IDBDatabase;
export { DB_NAME, DB_VERSION };

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
    runHqccDbStartupJobs(db);

    return db;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[hqcc-db] openHqccDb error", error);
    throw error;
  }
}
export { probeHqccDbVersion, readExistingHqccDbVersion, readExistingHqccDbAppVersion };
