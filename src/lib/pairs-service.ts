"use client";

import type { CardRecord } from "@/types/cards-db";
import type {
  DeckEntryRecord,
  DeckGroupRecord,
  DeckRecord,
  DeckSetRecord,
} from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";

import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";
import {
  createPairDeleteConfirmRequiredError,
  createPairInUseError,
  type PairDeleteResolution,
  type PairUsageReport,
} from "@/lib/decks-errors";
import { getCard } from "./cards-db";
import { openHqccDexieDb } from "./hqcc-dexie";

import { generateId } from ".";

export type PairSummary = PairRecord;
export type PairDeleteMode = "block" | "confirmable-cascade";

type PairDeleteOptions = {
  mode?: PairDeleteMode;
  confirmCascade?: boolean;
};

function buildPairName(front?: CardRecord | null, back?: CardRecord | null): string {
  const frontName = front?.title ?? front?.name ?? "Untitled front";
  const backName = back?.title ?? back?.name ?? "Untitled back";
  return `${frontName} - ${backName}`;
}

function throwPairError(error: unknown, fallback: string): never {
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(fallback);
}

async function listPairsForFaceFromDb(
  db: Awaited<ReturnType<typeof openHqccDexieDb>>,
  faceId: string,
): Promise<PairSummary[]> {
  const [frontMatches, backMatches] = await Promise.all([
    db.pairs.where("frontFaceId").equals(faceId).toArray(),
    db.pairs.where("backFaceId").equals(faceId).toArray(),
  ]);
  return [...frontMatches, ...backMatches];
}

async function listAllPairsFromDb(
  db: Awaited<ReturnType<typeof openHqccDexieDb>>,
): Promise<PairSummary[]> {
  return db.pairs.toArray();
}

async function listLegacyPairsFromCards(): Promise<PairSummary[]> {
  return [];
}

async function listLegacyPairsForFace(faceId: string): Promise<PairSummary[]> {
  void faceId;
  return [];
}

export async function listPairsForFace(faceId: string): Promise<PairSummary[]> {
  const db = await openHqccDexieDb();
  const combined = await listPairsForFaceFromDb(db, faceId);
  if (combined.length > 0) return combined;
  return listLegacyPairsForFace(faceId);
}

export async function listAllPairs(): Promise<PairSummary[]> {
  const db = await openHqccDexieDb();
  const pairs = await listAllPairsFromDb(db);
  if (pairs.length > 0) return pairs;
  return listLegacyPairsFromCards();
}

async function listPairsForBack(backId: string): Promise<PairSummary[]> {
  const db = await openHqccDexieDb();
  const pairs = await listPairsForFaceFromDb(db, backId);
  return pairs.filter((pair) => pair.backFaceId === backId);
}

async function listEntriesForPairIds(
  db: Awaited<ReturnType<typeof openHqccDexieDb>>,
  pairIds: string[],
): Promise<DeckEntryRecord[]> {
  if (!pairIds.length) return [];
  return db.deckEntries.where("pairId").anyOf(pairIds).toArray();
}

async function buildDeckUsageForEntries(
  db: Awaited<ReturnType<typeof openHqccDexieDb>>,
  entryIds: string[],
): Promise<
  Array<{
    entryId: string;
    usage: {
      deckId: string;
      deckTitle: string;
      groupId: string;
      groupTitle: string;
      setId: string;
      setTitle: string;
    };
  }>
> {
  if (!entryIds.length) return [];
  const entries = (await db.deckEntries.bulkGet(entryIds)).filter(
    (entry): entry is DeckEntryRecord => Boolean(entry),
  );
  if (!entries.length) return [];
  const sets = (
    await db.deckSets.bulkGet(Array.from(new Set(entries.map((entry) => entry.setId))))
  ).filter((set): set is DeckSetRecord => Boolean(set));
  const groups = (
    await db.deckGroups.bulkGet(Array.from(new Set(sets.map((set) => set.groupId))))
  ).filter((group): group is DeckGroupRecord => Boolean(group));
  const decks = (
    await db.decks.bulkGet(Array.from(new Set(sets.map((set) => set.deckId))))
  ).filter((deck): deck is DeckRecord => Boolean(deck));

  const setById = new Map(sets.map((set) => [set.id, set]));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const deckById = new Map(decks.map((deck) => [deck.id, deck]));
  const rows: Array<{
    entryId: string;
    usage: {
      deckId: string;
      deckTitle: string;
      groupId: string;
      groupTitle: string;
      setId: string;
      setTitle: string;
    };
  }> = [];

  entries.forEach((entry) => {
    const set = setById.get(entry.setId);
    if (!set) return;
    const group = groupById.get(set.groupId);
    const deck = deckById.get(set.deckId);
    if (!group || !deck) return;
    rows.push({
      entryId: entry.id,
      usage: {
        deckId: deck.id,
        deckTitle: deck.title,
        groupId: group.id,
        groupTitle: group.title ?? "",
        setId: set.id,
        setTitle: set.title ?? "",
      },
    });
  });
  return rows;
}

async function resolvePairUsageReport(
  db: Awaited<ReturnType<typeof openHqccDexieDb>>,
  frontFaceId: string,
  backFaceId: string,
  mode: PairDeleteMode,
): Promise<PairUsageReport> {
  const pairs = await listPairsForFaceFromDb(db, frontFaceId);
  const matches = pairs.filter(
    (pair) => pair.frontFaceId === frontFaceId && pair.backFaceId === backFaceId,
  );
  const pairIds = matches.map((pair) => pair.id);
  const entries = await listEntriesForPairIds(db, pairIds);
  const entryIds = Array.from(new Set(entries.map((entry) => entry.id)));
  const usageRows = await buildDeckUsageForEntries(db, entryIds);
  const usageByKey = new Map<string, (typeof usageRows)[number]["usage"]>();
  usageRows.forEach(({ usage }) => {
    const key = `${usage.deckId}:${usage.groupId}:${usage.setId}`;
    if (!usageByKey.has(key)) usageByKey.set(key, usage);
  });
  return {
    frontFaceId,
    backFaceId,
    mode,
    cascadePlan: {
      pairIds,
      entryIds,
      usage: Array.from(usageByKey.values()),
    },
  };
}

async function executePairDeletionPlan(report: PairUsageReport): Promise<{
  deletedPairs: number;
  deletedEntries: number;
}> {
  const pairIds = report.cascadePlan.pairIds;
  const entryIds = report.cascadePlan.entryIds;
  if (!pairIds.length) return { deletedPairs: 0, deletedEntries: 0 };

  const db = await openHqccDexieDb();
  const deckIdsToTouch = new Set<string>();
  if (entryIds.length) {
    const existingEntries = await db.deckEntries.bulkGet(entryIds);
    existingEntries.forEach((entry) => {
      if (entry) {
        deckIdsToTouch.add(entry.deckId);
      }
    });
  }

  try {
    await db.transaction("rw", db.pairs, db.deckEntries, async () => {
      await db.pairs.bulkDelete(pairIds);
      if (entryIds.length) {
        await db.deckEntries.bulkDelete(entryIds);
      }
    });
  } catch (error) {
    throwPairError(error, "Failed to execute pair deletion plan");
  }

  pairIds.forEach((pairId) => enqueueDbEstimateChange("pairs", pairId));
  entryIds.forEach((entryId) => enqueueDbEstimateChange("deckEntries", entryId));
  if (deckIdsToTouch.size) {
    const deckIds = Array.from(deckIdsToTouch);
    let touchedDeckIds: string[] = [];

    try {
      await db.transaction("rw", db.decks, async () => {
        const decks = (await db.decks.bulkGet(deckIds)).filter(
          (deck): deck is DeckRecord => Boolean(deck),
        );
        if (!decks.length) {
          return;
        }
        const now = Date.now();
        const touchedDecks = decks.map((deck) => ({ ...deck, updatedAt: now }));
        touchedDeckIds = touchedDecks.map((deck) => deck.id);
        await db.decks.bulkPut(touchedDecks);
      });
    } catch (error) {
      throwPairError(error, "Failed to touch decks");
    }

    touchedDeckIds.forEach((deckId) => enqueueDbEstimateChange("decks", deckId));
  }

  return { deletedPairs: pairIds.length, deletedEntries: entryIds.length };
}

export async function previewDeletePair(
  frontFaceId: string,
  backFaceId: string,
  options?: Pick<PairDeleteOptions, "mode">,
): Promise<PairUsageReport> {
  const db = await openHqccDexieDb();
  return resolvePairUsageReport(
    db,
    frontFaceId,
    backFaceId,
    options?.mode ?? "confirmable-cascade",
  );
}

function mergeUsageReports(
  reports: PairUsageReport[],
  mode: PairDeleteMode,
): PairUsageReport {
  const pairIds = new Set<string>();
  const entryIds = new Set<string>();
  const usageByKey = new Map<string, PairUsageReport["cascadePlan"]["usage"][number]>();
  reports.forEach((report) => {
    report.cascadePlan.pairIds.forEach((id) => pairIds.add(id));
    report.cascadePlan.entryIds.forEach((id) => entryIds.add(id));
    report.cascadePlan.usage.forEach((usage) => {
      const key = `${usage.deckId}:${usage.groupId}:${usage.setId}`;
      if (!usageByKey.has(key)) usageByKey.set(key, usage);
    });
  });
  return {
    frontFaceId: "__bulk__",
    backFaceId: "__bulk__",
    mode,
    cascadePlan: {
      pairIds: Array.from(pairIds),
      entryIds: Array.from(entryIds),
      usage: Array.from(usageByKey.values()),
    },
  };
}

export async function previewDeletePairsForFaces(
  faceIds: string[],
  options?: Pick<PairDeleteOptions, "mode">,
): Promise<PairUsageReport> {
  const ids = new Set(faceIds);
  const db = await openHqccDexieDb();
  const pairs = await listAllPairsFromDb(db);
  const uniqueOps = new Map<string, { frontFaceId: string; backFaceId: string }>();
  pairs.forEach((pair) => {
    if (!pair.frontFaceId || !pair.backFaceId) return;
    if (!ids.has(pair.frontFaceId) && !ids.has(pair.backFaceId)) return;
    const key = `${pair.frontFaceId}|${pair.backFaceId}`;
    if (!uniqueOps.has(key)) {
      uniqueOps.set(key, { frontFaceId: pair.frontFaceId, backFaceId: pair.backFaceId });
    }
  });
  const mode = options?.mode ?? "confirmable-cascade";
  const reports = await Promise.all(
    Array.from(uniqueOps.values()).map((op) =>
      resolvePairUsageReport(db, op.frontFaceId, op.backFaceId, mode),
    ),
  );
  return mergeUsageReports(reports, mode);
}

export async function createPair(
  frontFaceId: string,
  backFaceId: string,
): Promise<PairSummary> {
  return createPairWithOverrides({ frontFaceId, backFaceId });
}

export async function createPairWithOverrides(input: {
  frontFaceId: string;
  backFaceId: string;
  id?: string;
  name?: string;
  nameLower?: string;
  createdAt?: number;
  updatedAt?: number;
  schemaVersion?: 1;
}): Promise<PairSummary> {
  const existing = await listPairsForFace(input.frontFaceId);
  const match = existing.find(
    (pair) =>
      pair.frontFaceId === input.frontFaceId && pair.backFaceId === input.backFaceId,
  );
  if (match) return match;

  const [front, back] = await Promise.all([
    getCard(input.frontFaceId),
    getCard(input.backFaceId),
  ]);
  const name = input.name ?? buildPairName(front, back);
  const now = Date.now();
  const createdAt = input.createdAt ?? now;
  const updatedAt = input.updatedAt ?? createdAt;
  const record: PairRecord = {
    id: input.id ?? generateId(),
    name,
    nameLower: input.nameLower ?? name.toLocaleLowerCase(),
    frontFaceId: input.frontFaceId,
    backFaceId: input.backFaceId,
    createdAt,
    updatedAt,
    schemaVersion: input.schemaVersion ?? 1,
  };

  const db = await openHqccDexieDb();
  try {
    await db.transaction("rw", db.pairs, async () => {
      await db.pairs.put(record);
    });
  } catch (error) {
    throwPairError(error, "Failed to create pair");
  }
  enqueueDbEstimateChange("pairs", record.id);

  return record;
}

export async function deletePairsForFront(frontFaceId: string): Promise<void> {
  const pairs = await listPairsForFace(frontFaceId);
  const deletions = pairs.filter((pair) => pair.frontFaceId === frontFaceId);
  if (!deletions.length) return;
  const db = await openHqccDexieDb();
  try {
    await db.transaction("rw", db.pairs, async () => {
      await db.pairs.bulkDelete(deletions.map((pair) => pair.id));
    });
  } catch (error) {
    throwPairError(error, "Failed to delete pair");
  }
  deletions.forEach((pair) => enqueueDbEstimateChange("pairs", pair.id));
}

export async function deletePairsForBack(backFaceId: string): Promise<void> {
  const pairs = await listPairsForFace(backFaceId);
  const deletions = pairs.filter((pair) => pair.backFaceId === backFaceId);
  if (!deletions.length) return;
  const db = await openHqccDexieDb();
  try {
    await db.transaction("rw", db.pairs, async () => {
      await db.pairs.bulkDelete(deletions.map((pair) => pair.id));
    });
  } catch (error) {
    throwPairError(error, "Failed to delete pair");
  }
  deletions.forEach((pair) => enqueueDbEstimateChange("pairs", pair.id));
}

export async function deletePairsForFace(faceId: string): Promise<void> {
  const pairs = await listPairsForFace(faceId);
  if (!pairs.length) return;
  const db = await openHqccDexieDb();
  try {
    await db.transaction("rw", db.pairs, async () => {
      await db.pairs.bulkDelete(pairs.map((pair) => pair.id));
    });
  } catch (error) {
    throwPairError(error, "Failed to delete pair");
  }
  pairs.forEach((pair) => enqueueDbEstimateChange("pairs", pair.id));
}

export async function deletePair(
  frontFaceId: string,
  backFaceId: string,
  options?: PairDeleteOptions,
): Promise<PairDeleteResolution> {
  const mode = options?.mode ?? "confirmable-cascade";
  const db = await openHqccDexieDb();
  const report = await resolvePairUsageReport(db, frontFaceId, backFaceId, mode);
  if (!report.cascadePlan.pairIds.length) {
    return { kind: "no-impact", report };
  }
  const hasUsage = report.cascadePlan.entryIds.length > 0;

  if (hasUsage && mode === "block") {
    throw createPairInUseError(report.cascadePlan.usage);
  }
  if (hasUsage && mode === "confirmable-cascade" && !options?.confirmCascade) {
    throw createPairDeleteConfirmRequiredError(report);
  }

  const { deletedPairs, deletedEntries } = await executePairDeletionPlan(report);
  return {
    kind: "executed",
    report,
    deletedPairs,
    cascadedEntries: deletedEntries,
  };
}

export async function deletePairsForFaces(
  faceIds: string[],
  options?: PairDeleteOptions,
): Promise<PairDeleteResolution> {
  const mode = options?.mode ?? "confirmable-cascade";
  const report = await previewDeletePairsForFaces(faceIds, { mode });
  if (!report.cascadePlan.pairIds.length) {
    return { kind: "no-impact", report };
  }
  const hasUsage = report.cascadePlan.entryIds.length > 0;
  if (hasUsage && mode === "block") {
    throw createPairInUseError(report.cascadePlan.usage);
  }
  if (hasUsage && mode === "confirmable-cascade" && !options?.confirmCascade) {
    throw createPairDeleteConfirmRequiredError(report);
  }
  const { deletedPairs, deletedEntries } = await executePairDeletionPlan(report);
  return {
    kind: "executed",
    report,
    deletedPairs,
    cascadedEntries: deletedEntries,
  };
}

export async function replacePairsForBack(
  backFaceId: string,
  frontFaceIds: string[],
): Promise<void> {
  const existing = await listPairsForBack(backFaceId);
  const nextFrontSet = new Set(frontFaceIds);
  const toRemove = existing.filter((pair) => !nextFrontSet.has(pair.frontFaceId ?? ""));
  const existingFronts = new Set(
    existing.map((pair) => pair.frontFaceId).filter((id): id is string => Boolean(id)),
  );
  const toAdd = frontFaceIds.filter((frontId) => !existingFronts.has(frontId));

  if (!toRemove.length && !toAdd.length) return;

  const db = await openHqccDexieDb();
  const now = Date.now();
  const cardsById = new Map<string, CardRecord | null>();
  const back = toAdd.length ? await getCard(backFaceId) : null;

  if (toAdd.length) {
    const cards = await Promise.all(toAdd.map((frontId) => getCard(frontId)));
    cards.forEach((card, index) => {
      cardsById.set(toAdd[index], card);
    });
  }

  const additions: PairRecord[] = toAdd.map((frontId) => {
    const front = cardsById.get(frontId) ?? null;
    const name = buildPairName(front, back);
    return {
      id: generateId(),
      name,
      nameLower: name.toLocaleLowerCase(),
      frontFaceId: frontId,
      backFaceId,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
  });

  try {
    await db.transaction("rw", db.pairs, async () => {
      if (toRemove.length) {
        await db.pairs.bulkDelete(toRemove.map((pair) => pair.id));
      }
      if (additions.length) {
        await db.pairs.bulkPut(additions);
      }
    });
  } catch (error) {
    throwPairError(error, "Failed to replace pairs");
  }

  toRemove.forEach((pair) => enqueueDbEstimateChange("pairs", pair.id));
  additions.forEach((pair) => enqueueDbEstimateChange("pairs", pair.id));
}

export async function getPairedFaceIds(faceId: string): Promise<string[]> {
  const pairs = await listPairsForFace(faceId);
  const ids = new Set<string>();
  pairs.forEach((pair) => {
    if (pair.frontFaceId && pair.frontFaceId !== faceId) {
      ids.add(pair.frontFaceId);
    }
    if (pair.backFaceId && pair.backFaceId !== faceId) {
      ids.add(pair.backFaceId);
    }
  });
  return Array.from(ids);
}
