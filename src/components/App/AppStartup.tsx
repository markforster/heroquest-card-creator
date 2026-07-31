"use client";

import { useEffect } from "react";

import { runHqccDbStartupJobs } from "@/lib/db/jobs/hqcc-db-startup-jobs";
import { clearDbEstimateCache, runFullDbEstimate } from "@/lib/db/maintenance/indexeddb-size-tracker";
import { repairOrphanDeckEntries } from "@/lib/db/maintenance/repair-orphan-deck-entries";
import { startThumbnailJpegMigration } from "@/lib/db/migrations/thumbnail-jpeg-migration";

export default function AppStartup() {
  useEffect(() => {
    runHqccDbStartupJobs();
    void startThumbnailJpegMigration();
    void repairOrphanDeckEntries().catch(() => {
      // Ignore startup repair failures.
    });
    clearDbEstimateCache();
    setTimeout(() => {
      void runFullDbEstimate();
    }, 0);
  }, []);

  return null;
}
