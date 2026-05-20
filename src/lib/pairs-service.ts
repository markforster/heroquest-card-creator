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
import { openHqccDb } from "./hqcc-db";

import { generateId } from ".";

export type PairSummary = PairRecord;
export type PairDeleteMode = "block" | "confirmable-cascade";

type PairDeleteOptions = {
  mode?: PairDeleteMode;
  confirmCascade?: boolean;
};

async function getPairsStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openHqccDb();
  const tx = db.transaction("pairs", mode);
  return tx.objectStore("pairs");
}

function buildPairName(front?: CardRecord | null, back?: CardRecord | null): string {
  const frontName = front?.title ?? front?.name ?? "Untitled front";
  const backName = back?.title ?? back?.name ?? "Untitled back";
  return `${frontName} - ${backName}`;
}

async function listPairsByIndex(
  indexName: "frontFaceId" | "backFaceId",
  faceId: string,
): Promise<PairSummary[]> {
  const store = await getPairsStore("readonly");
  if (!store.indexNames.contains(indexName)) return [];
  const index = store.index(indexName);

  return new Promise<PairSummary[]>((resolve, reject) => {
    const results: PairSummary[] = [];
    const request = index.openCursor(IDBKeyRange.only(faceId));

    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve(results);
        return;
      }
      const value = cursor.value as PairRecord;
      results.push(value);
      cursor.continue();
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to list pairs"));
    };
  });
}

async function listAllPairsFromStore(): Promise<PairSummary[]> {
  const store = await getPairsStore("readonly");
  return new Promise<PairSummary[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const values = (request.result as PairRecord[] | undefined) ?? [];
      resolve(values);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to list pairs"));
    };
  });
}

async function listLegacyPairsFromCards(): Promise<PairSummary[]> {
  return [];
}

async function listLegacyPairsForFace(faceId: string): Promise<PairSummary[]> {
  void faceId;
  return [];
}

export async function listPairsForFace(faceId: string): Promise<PairSummary[]> {
  const [frontMatches, backMatches] = await Promise.all([
    listPairsByIndex("frontFaceId", faceId),
    listPairsByIndex("backFaceId", faceId),
  ]);
  const combined = [...frontMatches, ...backMatches];
  if (combined.length > 0) return combined;
  return listLegacyPairsForFace(faceId);
}

export async function listAllPairs(): Promise<PairSummary[]> {
  const pairs = await listAllPairsFromStore();
  if (pairs.length > 0) return pairs;
  return listLegacyPairsFromCards();
}

async function listPairsForBack(backId: string): Promise<PairSummary[]> {
  const pairs = await listPairsForFace(backId);
  return pairs.filter((pair) => pair.backFaceId === backId);
}

async function listEntriesForPairIds(pairIds: string[]): Promise<DeckEntryRecord[]> {
  if (!pairIds.length) return [];
  const db = await openHqccDb();
  if (!db.objectStoreNames.contains("deckEntries")) return [];
  const tx = db.transaction("deckEntries", "readonly");
  const store = tx.objectStore("deckEntries");
  const byPairId = store.indexNames.contains("pairId") ? store.index("pairId") : null;
  const entries: DeckEntryRecord[] = [];

  if (!byPairId) {
    const allEntries = await new Promise<DeckEntryRecord[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as DeckEntryRecord[] | undefined) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Failed to list deck entries"));
    });
    const pairIdSet = new Set(pairIds);
    return allEntries.filter((entry) => pairIdSet.has(entry.pairId));
  }

  await Promise.all(
    pairIds.map(
      (pairId) =>
        new Promise<void>((resolve, reject) => {
          const request = byPairId.openCursor(IDBKeyRange.only(pairId));
          request.onsuccess = () => {
            const cursor = request.result as IDBCursorWithValue | null;
            if (!cursor) {
              resolve();
              return;
            }
            entries.push(cursor.value as DeckEntryRecord);
            cursor.continue();
          };
          request.onerror = () => reject(request.error ?? new Error("Failed to list deck entries"));
        }),
    ),
  );
  return entries;
}

async function buildDeckUsageForEntries(entryIds: string[]): Promise<
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
  const db = await openHqccDb();
  const stores = ["deckEntries", "deckSets", "deckGroups", "decks"] as const;
  if (stores.some((name) => !db.objectStoreNames.contains(name))) return [];
  const tx = db.transaction(stores, "readonly");
  const entriesStore = tx.objectStore("deckEntries");
  const setsStore = tx.objectStore("deckSets");
  const groupsStore = tx.objectStore("deckGroups");
  const decksStore = tx.objectStore("decks");
  const ids = new Set(entryIds);

  const [entries, sets, groups, decks] = await Promise.all([
    new Promise<DeckEntryRecord[]>((resolve, reject) => {
      const request = entriesStore.getAll();
      request.onsuccess = () => resolve((request.result as DeckEntryRecord[] | undefined) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Failed to load entries"));
    }),
    new Promise<DeckSetRecord[]>((resolve, reject) => {
      const request = setsStore.getAll();
      request.onsuccess = () => resolve((request.result as DeckSetRecord[] | undefined) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Failed to load sets"));
    }),
    new Promise<DeckGroupRecord[]>((resolve, reject) => {
      const request = groupsStore.getAll();
      request.onsuccess = () => resolve((request.result as DeckGroupRecord[] | undefined) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Failed to load groups"));
    }),
    new Promise<DeckRecord[]>((resolve, reject) => {
      const request = decksStore.getAll();
      request.onsuccess = () => resolve((request.result as DeckRecord[] | undefined) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Failed to load decks"));
    }),
  ]);

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
    if (!ids.has(entry.id)) return;
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
  frontFaceId: string,
  backFaceId: string,
  mode: PairDeleteMode,
): Promise<PairUsageReport> {
  const pairs = await listPairsForFace(frontFaceId);
  const matches = pairs.filter(
    (pair) => pair.frontFaceId === frontFaceId && pair.backFaceId === backFaceId,
  );
  const pairIds = matches.map((pair) => pair.id);
  const entries = await listEntriesForPairIds(pairIds);
  const entryIds = Array.from(new Set(entries.map((entry) => entry.id)));
  const usageRows = await buildDeckUsageForEntries(entryIds);
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

  const db = await openHqccDb();
  const stores = db.objectStoreNames.contains("deckEntries")
    ? (["pairs", "deckEntries"] as const)
    : (["pairs"] as const);
  const tx = db.transaction(stores, "readwrite");
  const pairsStore = tx.objectStore("pairs");
  const entriesStore = tx.objectStoreNames.contains("deckEntries")
    ? tx.objectStore("deckEntries")
    : null;

  pairIds.forEach((pairId) => pairsStore.delete(pairId));
  entryIds.forEach((entryId) => entriesStore?.delete(entryId));

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to execute pair deletion plan"));
    tx.onabort = () => reject(tx.error ?? new Error("Failed to execute pair deletion plan"));
  });

  pairIds.forEach((pairId) => enqueueDbEstimateChange("pairs", pairId));
  entryIds.forEach((entryId) => enqueueDbEstimateChange("deckEntries", entryId));

  return { deletedPairs: pairIds.length, deletedEntries: entryIds.length };
}

export async function previewDeletePair(
  frontFaceId: string,
  backFaceId: string,
  options?: Pick<PairDeleteOptions, "mode">,
): Promise<PairUsageReport> {
  return resolvePairUsageReport(frontFaceId, backFaceId, options?.mode ?? "confirmable-cascade");
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
  const pairs = await listAllPairs();
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
      resolvePairUsageReport(op.frontFaceId, op.backFaceId, mode),
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

  const store = await getPairsStore("readwrite");
  await new Promise<void>((resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to create pair"));
  });
  enqueueDbEstimateChange("pairs", record.id);

  return record;
}

export async function deletePairsForFront(frontFaceId: string): Promise<void> {
  const pairs = await listPairsForFace(frontFaceId);
  const deletions = pairs.filter((pair) => pair.frontFaceId === frontFaceId);
  if (!deletions.length) return;
  const store = await getPairsStore("readwrite");
  await new Promise<void>((resolve, reject) => {
    let remaining = deletions.length;
    deletions.forEach((pair) => {
      const request = store.delete(pair.id);
      request.onsuccess = () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Failed to delete pair"));
      };
    });
  });
  deletions.forEach((pair) => enqueueDbEstimateChange("pairs", pair.id));
}

export async function deletePairsForBack(backFaceId: string): Promise<void> {
  const pairs = await listPairsForFace(backFaceId);
  const deletions = pairs.filter((pair) => pair.backFaceId === backFaceId);
  if (!deletions.length) return;
  const store = await getPairsStore("readwrite");
  await new Promise<void>((resolve, reject) => {
    let remaining = deletions.length;
    deletions.forEach((pair) => {
      const request = store.delete(pair.id);
      request.onsuccess = () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Failed to delete pair"));
      };
    });
  });
  deletions.forEach((pair) => enqueueDbEstimateChange("pairs", pair.id));
}

export async function deletePairsForFace(faceId: string): Promise<void> {
  const pairs = await listPairsForFace(faceId);
  if (!pairs.length) return;
  const store = await getPairsStore("readwrite");
  await new Promise<void>((resolve, reject) => {
    let remaining = pairs.length;
    pairs.forEach((pair) => {
      const request = store.delete(pair.id);
      request.onsuccess = () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Failed to delete pair"));
      };
    });
  });
  pairs.forEach((pair) => enqueueDbEstimateChange("pairs", pair.id));
}

export async function deletePair(
  frontFaceId: string,
  backFaceId: string,
  options?: PairDeleteOptions,
): Promise<PairDeleteResolution> {
  const mode = options?.mode ?? "confirmable-cascade";
  const report = await resolvePairUsageReport(frontFaceId, backFaceId, mode);
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

  if (toRemove.length) {
    const store = await getPairsStore("readwrite");
    await new Promise<void>((resolve, reject) => {
      let remaining = toRemove.length;
      toRemove.forEach((pair) => {
        const request = store.delete(pair.id);
        request.onsuccess = () => {
          remaining -= 1;
          if (remaining === 0) resolve();
        };
        request.onerror = () => {
          reject(request.error ?? new Error("Failed to delete pair"));
        };
      });
    });
    toRemove.forEach((pair) => enqueueDbEstimateChange("pairs", pair.id));
  }

  if (toAdd.length) {
    await Promise.all(toAdd.map((frontId) => createPair(frontId, backFaceId)));
  }
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
