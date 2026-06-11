"use client";

import { useEffect } from "react";

import { repairOrphanDeckEntries } from "@/lib/decks-service";
import { clearDbEstimateCache, runFullDbEstimate } from "@/lib/indexeddb-size-tracker";
import { startThumbnailJpegMigration } from "@/lib/thumbnail-jpeg-migration";

export default function AppStartup() {
  useEffect(() => {
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
