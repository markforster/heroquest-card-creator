"use client";

import { migrateCardCanvas } from "@/lib/hqcc-db-card-canvas-job";
import { backfillCardCopyrightComponents } from "@/lib/hqcc-db-copyright-backfill-job";
import {
  META_COPYRIGHT_COMPONENTS_BACKFILLED_KEY,
  openHqccDexieDb,
} from "@/lib/hqcc-dexie";
import { dedupePairsFromStore } from "@/lib/hqcc-db-pair-jobs";

let pairMaintenanceInFlight: Promise<void> | null = null;
let cardCanvasMigrationInFlight: Promise<void> | null = null;
let copyrightBackfillInFlight: Promise<void> | null = null;

type HqccDexieDb = Awaited<ReturnType<typeof openHqccDexieDb>>;

export function runHqccDbStartupJobs(db?: HqccDexieDb): void {
  if (!copyrightBackfillInFlight) {
    copyrightBackfillInFlight = (async () => {
      const dexieDb = db ?? (await openHqccDexieDb());
      const alreadyBackfilled = await dexieDb.meta.get(META_COPYRIGHT_COMPONENTS_BACKFILLED_KEY);
      if (Boolean(alreadyBackfilled?.value)) {
        return;
      }

      await backfillCardCopyrightComponents(dexieDb);
      await dexieDb.meta.put({
        id: META_COPYRIGHT_COMPONENTS_BACKFILLED_KEY,
        value: true,
        updatedAt: Date.now(),
      });
    })()
      .catch(() => {
        // Ignore copyright-backfill failures.
      })
      .finally(() => {
        copyrightBackfillInFlight = null;
      });
  }

  if (!pairMaintenanceInFlight) {
    pairMaintenanceInFlight = dedupePairsFromStore(db)
      .catch(() => {
        // Ignore pair-maintenance failures.
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
