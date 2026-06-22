"use client";

import { META_PAIRS_DEDUPED_KEY, openHqccDexieDb } from "@/lib/hqcc-dexie";

type HqccDexieDb = Awaited<ReturnType<typeof openHqccDexieDb>>;

export async function dedupePairsFromStore(db?: HqccDexieDb): Promise<void> {
  const dexieDb = db ?? (await openHqccDexieDb());

  const alreadyDeduped = await dexieDb.meta.get(META_PAIRS_DEDUPED_KEY);
  if (Boolean(alreadyDeduped?.value)) {
    return;
  }

  const pairs = await dexieDb.pairs.toArray();
  if (!pairs.length) {
    return;
  }

  const seen = new Set<string>();
  const duplicates: string[] = [];
  pairs.forEach((pair) => {
    const key = `${pair.frontFaceId ?? ""}::${pair.backFaceId ?? ""}`;
    if (seen.has(key)) {
      duplicates.push(pair.id);
      return;
    }
    seen.add(key);
  });

  if (duplicates.length === 0) {
    await dexieDb.meta.put({
      id: META_PAIRS_DEDUPED_KEY,
      value: true,
      updatedAt: Date.now(),
    });
    return;
  }

  await dexieDb.transaction("rw", dexieDb.pairs, dexieDb.meta, async () => {
    await dexieDb.pairs.bulkDelete(duplicates);
    await dexieDb.meta.put({
      id: META_PAIRS_DEDUPED_KEY,
      value: true,
      updatedAt: Date.now(),
    });
  });

  // eslint-disable-next-line no-console
  console.debug("[hqcc-db] pair dedupe", { removed: duplicates.length });
}
