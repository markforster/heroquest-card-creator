"use client";

import { ENTRIES_STORE } from "@/lib/data/decks-db";
import { openHqccDexieDb } from "@/lib/db/hqcc-dexie";
import { enqueueDbEstimateChange } from "@/lib/db/maintenance/indexeddb-size-tracker";

/**
 * Removes deck entries whose pair records are no longer present and returns the number removed.
 */
export async function repairOrphanDeckEntries(): Promise<number> {
  const db = await openHqccDexieDb();
  const [entries, pairs] = await Promise.all([db.deckEntries.toArray(), db.pairs.toArray()]);

  const pairIds = new Set(pairs.map((pair) => pair.id));
  const orphans = entries.filter((entry) => !pairIds.has(entry.pairId));
  if (!orphans.length) return 0;

  await db.transaction("rw", db.deckEntries, async () => {
    await db.deckEntries.bulkDelete(orphans.map((entry) => entry.id));
  });
  orphans.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
  // eslint-disable-next-line no-console
  console.info(`[decks] Repaired orphan deck entries: ${orphans.length}`);
  return orphans.length;
}
