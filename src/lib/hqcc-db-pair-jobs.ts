"use client";

import {
  META_PAIRS_DEDUPED_KEY,
  META_PAIRED_WITH_CLEANED_KEY,
  META_PAIRS_MIGRATED_KEY,
  openHqccDexieDb,
} from "@/lib/hqcc-dexie";
import type { CardRecord } from "@/types/cards-db";
import type { PairRecord } from "@/types/pairs-db";

import { generateId } from ".";

type HqccDexieDb = Awaited<ReturnType<typeof openHqccDexieDb>>;

export async function backfillPairsFromLegacy(db?: HqccDexieDb): Promise<void> {
  const dexieDb = db ?? (await openHqccDexieDb());

  const countPairs = await dexieDb.pairs.count();
  if (countPairs > 0) {
    return;
  }

  const cards = await dexieDb.cards.toArray();
  if (!cards.length) {
    return;
  }

  const cardById = new Map<string, CardRecord>();
  cards.forEach((card) => {
    cardById.set(card.id, card);
  });

  const existingKeys = new Set<string>();
  let createdCount = 0;
  let skippedDuplicate = 0;
  let skippedMissingBack = 0;
  let skippedInvalid = 0;

  await dexieDb.transaction("rw", dexieDb.pairs, dexieDb.meta, async () => {
    for (const card of cards) {
      const pairedWith = (card as CardRecord & { pairedWith?: string | null }).pairedWith ?? null;
      if (card.face === "back" || !pairedWith) {
        continue;
      }
      if (pairedWith === card.id) {
        skippedInvalid += 1;
        continue;
      }

      const backCard = cardById.get(pairedWith);
      if (!backCard) {
        skippedMissingBack += 1;
        continue;
      }

      const key = `${card.id}::${backCard.id}`;
      if (existingKeys.has(key)) {
        skippedDuplicate += 1;
        continue;
      }

      const frontName = card.title ?? card.name ?? "Untitled front";
      const backName = backCard.title ?? backCard.name ?? "Untitled back";
      const name = `${frontName} - ${backName}`;
      const now = Date.now();

      const pair: PairRecord = {
        id: generateId(),
        name,
        nameLower: name.toLocaleLowerCase(),
        frontFaceId: card.id,
        backFaceId: backCard.id,
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      };

      try {
        await dexieDb.pairs.add(pair);
        createdCount += 1;
        existingKeys.add(key);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.debug("[hqcc-db] pair backfill add failed", error);
      }
    }

    await dexieDb.meta.put({
      id: META_PAIRS_MIGRATED_KEY,
      value: true,
      updatedAt: Date.now(),
    });
  });

  // eslint-disable-next-line no-console
  console.debug("[hqcc-db] pair backfill", {
    cardsScanned: cards.length,
    pairsCreated: createdCount,
    skippedDuplicate,
    skippedMissingBack,
    skippedInvalid,
  });
}

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

export async function cleanupLegacyPairedWith(db?: HqccDexieDb): Promise<void> {
  const dexieDb = db ?? (await openHqccDexieDb());

  const alreadyCleaned = await dexieDb.meta.get(META_PAIRED_WITH_CLEANED_KEY);
  if (Boolean(alreadyCleaned?.value)) {
    return;
  }

  const cards = await dexieDb.cards.toArray();
  if (!cards.length) {
    await dexieDb.meta.put({
      id: META_PAIRED_WITH_CLEANED_KEY,
      value: true,
      updatedAt: Date.now(),
    });
    return;
  }

  const toUpdate = cards.filter((card) => "pairedWith" in card);
  if (!toUpdate.length) {
    await dexieDb.meta.put({
      id: META_PAIRED_WITH_CLEANED_KEY,
      value: true,
      updatedAt: Date.now(),
    });
    return;
  }

  await dexieDb.transaction("rw", dexieDb.cards, dexieDb.meta, async () => {
    for (const card of toUpdate) {
      const { pairedWith, ...rest } = card as CardRecord & { pairedWith?: string | null };
      void pairedWith;
      await dexieDb.cards.put(rest);
    }

    await dexieDb.meta.put({
      id: META_PAIRED_WITH_CLEANED_KEY,
      value: true,
      updatedAt: Date.now(),
    });
  });

  // eslint-disable-next-line no-console
  console.debug("[hqcc-db] pairedWith cleanup", { updated: toUpdate.length });
}
