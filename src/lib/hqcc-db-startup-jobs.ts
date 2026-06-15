"use client";

import { migrateCardCanvas } from "@/lib/hqcc-db-card-canvas-job";
import {
  backfillPairsFromLegacy,
  cleanupLegacyPairedWith,
  dedupePairsFromStore,
} from "@/lib/hqcc-db-pair-jobs";

let pairMaintenanceInFlight: Promise<void> | null = null;
let cardCanvasMigrationInFlight: Promise<void> | null = null;

export function runHqccDbStartupJobs(db: IDBDatabase): void {
  if (!pairMaintenanceInFlight) {
    pairMaintenanceInFlight = dedupePairsFromStore(db)
      .then(() => backfillPairsFromLegacy(db))
      .then(() => cleanupLegacyPairedWith(db))
      .catch(() => {
        // Ignore dedupe/backfill failures.
      })
      .finally(() => {
        pairMaintenanceInFlight = null;
      });
  }

  if (!cardCanvasMigrationInFlight) {
    cardCanvasMigrationInFlight = migrateCardCanvas(db)
      .catch(() => {
        // Ignore migration failures.
      })
      .finally(() => {
        cardCanvasMigrationInFlight = null;
      });
  }
}
