"use client";

import type {
  DeckEntryRecord,
  DeckGroupRecord,
  DeckRecord,
  DeckSetRecord,
} from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";
import type { CardDeckMembership } from "@/api/cards";

import { getCard } from "@/lib/cards-db";
import type { DeckUsageLocation } from "@/lib/decks-errors";
import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";
import { openHqccDb } from "@/lib/hqcc-db";
import {
  DECKS_STORE,
  ENTRIES_STORE,
  getPairsStore,
  getStore,
  GROUPS_STORE,
  listAll,
  listByIndex,
  normalizeDeckEntryRecord,
  PAIRS_STORE,
  resolveCardFace,
  SETS_STORE,
  sortByIndex,
} from "@/lib/decks-db";

export async function listDecks({ search }: { search?: string } = {}): Promise<DeckRecord[]> {
  const decks = (await listAll<DeckRecord>(DECKS_STORE)).map((deck) => ({
    ...deck,
    keySetId: deck.keySetId ?? null,
  }));
  if (!search) return decks;
  const q = search.toLocaleLowerCase();
  return decks.filter((deck) => deck.title.toLocaleLowerCase().includes(q));
}

export async function listCardDeckMembership(cardId: string): Promise<CardDeckMembership[]> {
  const card = await getCard(cardId);
  if (!card || card.status !== "saved" || card.deletedAt != null) {
    return [];
  }

  const effectiveFace = resolveCardFace(card.templateId, card.face);
  const deckCountById = new Map<string, number>();
  const locationByDeckId = new Map<string, { setId: string; entryId?: string }>();
  const groups = await listAll<DeckGroupRecord>(GROUPS_STORE);
  const sets = await listAll<DeckSetRecord>(SETS_STORE);
  const entries = (await listAll<DeckEntryRecord & { count?: number | null }>(ENTRIES_STORE)).map(
    normalizeDeckEntryRecord,
  );
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const setById = new Map(sets.map((set) => [set.id, set]));
  const getGroupSort = (setId: string) => {
    const set = setById.get(setId);
    const group = set ? groupById.get(set.groupId) : null;
    return group?.sortIndex ?? Number.MAX_SAFE_INTEGER;
  };
  const compareSetOrder = (a: DeckSetRecord, b: DeckSetRecord) => {
    const groupCmp = getGroupSort(a.id) - getGroupSort(b.id);
    if (groupCmp !== 0) return groupCmp;
    if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
    return a.id.localeCompare(b.id);
  };
  const addDeckCount = (deckId: string, count: number) => {
    const nextCount = Math.max(0, Math.trunc(count));
    deckCountById.set(deckId, (deckCountById.get(deckId) ?? 0) + nextCount);
  };

  if (effectiveFace === "back") {
    const matchingSets = sets.filter((set) => set.backFaceId === cardId);
    if (!matchingSets.length) return [];
    const sortedMatchingSets = [...matchingSets].sort(compareSetOrder);
    matchingSets.forEach((set) => {
      if (!deckCountById.has(set.deckId)) deckCountById.set(set.deckId, 0);
    });
    const setIds = new Set(sortedMatchingSets.map((set) => set.id));
    const matchingEntries = entries.filter((entry) => setIds.has(entry.setId));
    matchingEntries.forEach((entry) => addDeckCount(entry.deckId, entry.count ?? 1));
    sortedMatchingSets.forEach((set) => {
      if (!locationByDeckId.has(set.deckId)) {
        locationByDeckId.set(set.deckId, { setId: set.id });
      }
    });
  } else {
    const pairs = await listAll<PairRecord>(PAIRS_STORE);
    const pairIds = new Set(
      pairs.filter((pair) => pair.frontFaceId === cardId).map((pair) => pair.id),
    );
    if (!pairIds.size) return [];

    const matchingEntries = entries.filter((entry) => pairIds.has(entry.pairId));
    if (!matchingEntries.length) return [];
    const resolvedEntries = matchingEntries
      .map((entry) => {
        const set = setById.get(entry.setId);
        if (!set) return null;
        return {
          entryId: entry.id,
          setId: set.id,
          deckId: set.deckId,
          sortIndex: entry.sortIndex,
          count: entry.count ?? 1,
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          entryId: string;
          setId: string;
          deckId: string;
          sortIndex: number;
          count: number;
        } => Boolean(entry),
      );
    if (!resolvedEntries.length) return [];
    resolvedEntries.forEach((entry) => addDeckCount(entry.deckId, entry.count));
    const entriesByDeckId = new Map<
      string,
      Array<{ entryId: string; setId: string; deckId: string; sortIndex: number }>
    >();
    resolvedEntries.forEach((entry) => {
      const bucket = entriesByDeckId.get(entry.deckId) ?? [];
      bucket.push(entry);
      entriesByDeckId.set(entry.deckId, bucket);
    });
    entriesByDeckId.forEach((deckEntries, deckId) => {
      const deckSetsOrdered = sets.filter((set) => set.deckId === deckId).sort(compareSetOrder);
      for (const set of deckSetsOrdered) {
        const inSet = deckEntries
          .filter((entry) => entry.setId === set.id)
          .sort((a, b) => {
            if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
            return a.entryId.localeCompare(b.entryId);
          });
        const firstEntry = inSet[0];
        if (firstEntry) {
          locationByDeckId.set(deckId, { setId: set.id, entryId: firstEntry.entryId });
          return;
        }
      }
    });
  }

  if (!deckCountById.size) return [];

  const decks = await listAll<DeckRecord>(DECKS_STORE);
  const deckMap = new Map(decks.map((deck) => [deck.id, deck]));

  const memberships: CardDeckMembership[] = [];
  Array.from(deckCountById.entries()).forEach(([deckId, count]) => {
    const deck = deckMap.get(deckId);
    if (!deck) return;
    const location = locationByDeckId.get(deckId);
    memberships.push({
      deckId: deck.id,
      deckTitle: deck.title,
      count,
      setId: location?.setId,
      entryId: location?.entryId,
    });
  });

  memberships.sort((a, b) => {
    const byTitle = a.deckTitle.localeCompare(b.deckTitle);
    if (byTitle !== 0) return byTitle;
    return a.deckId.localeCompare(b.deckId);
  });

  return memberships;
}

export async function getDeck(deckId: string): Promise<DeckRecord | null> {
  const store = await getStore(DECKS_STORE, "readonly");
  return new Promise<DeckRecord | null>((resolve, reject) => {
    const request = store.get(deckId);
    request.onsuccess = () => {
      const deck = (request.result as DeckRecord | undefined) ?? null;
      if (!deck) {
        resolve(null);
        return;
      }
      resolve({ ...deck, keySetId: deck.keySetId ?? null });
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to load deck"));
  });
}

export async function listGroups(deckId: string): Promise<DeckGroupRecord[]> {
  const groups = await listByIndex<DeckGroupRecord>(GROUPS_STORE, "deckId", deckId);
  return sortByIndex(groups);
}

export async function getGroup(groupId: string): Promise<DeckGroupRecord | null> {
  const store = await getStore(GROUPS_STORE, "readonly");
  return new Promise<DeckGroupRecord | null>((resolve, reject) => {
    const request = store.get(groupId);
    request.onsuccess = () => resolve((request.result as DeckGroupRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load group"));
  });
}

export async function listSets(deckId: string): Promise<DeckSetRecord[]> {
  const sets = await listByIndex<DeckSetRecord>(SETS_STORE, "deckId", deckId);
  return sortByIndex(sets);
}

export async function getSet(setId: string): Promise<DeckSetRecord | null> {
  const store = await getStore(SETS_STORE, "readonly");
  return new Promise<DeckSetRecord | null>((resolve, reject) => {
    const request = store.get(setId);
    request.onsuccess = () => resolve((request.result as DeckSetRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load set"));
  });
}

export async function listEntriesForSet(setId: string): Promise<DeckEntryRecord[]> {
  const entries = await listByIndex<DeckEntryRecord & { count?: number | null }>(
    ENTRIES_STORE,
    "setId",
    setId,
  );
  return sortByIndex(entries.map(normalizeDeckEntryRecord));
}

async function getPairById(pairId: string): Promise<PairRecord | null> {
  const store = await getPairsStore("readonly");
  return new Promise<PairRecord | null>((resolve, reject) => {
    const request = store.get(pairId);
    request.onsuccess = () => resolve((request.result as PairRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load pair"));
  });
}

export async function getDeckUsageForPair(pairId: string): Promise<DeckUsageLocation[]> {
  const entries = (
    await listByIndex<DeckEntryRecord & { count?: number | null }>(ENTRIES_STORE, "pairId", pairId)
  ).map(normalizeDeckEntryRecord);
  if (!entries.length) return [];

  const setIds = new Set(entries.map((entry) => entry.setId));
  const sets = await listAll<DeckSetRecord>(SETS_STORE);
  const setMap = new Map(sets.map((set) => [set.id, set]));
  const groups = await listAll<DeckGroupRecord>(GROUPS_STORE);
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const decks = await listAll<DeckRecord>(DECKS_STORE);
  const deckMap = new Map(decks.map((deck) => [deck.id, deck]));

  const usage: DeckUsageLocation[] = [];
  entries.forEach((entry) => {
    const set = setMap.get(entry.setId);
    if (!set || !setIds.has(entry.setId)) return;
    const group = groupMap.get(set.groupId);
    const deck = deckMap.get(set.deckId);
    if (!group || !deck) return;
    usage.push({
      deckId: deck.id,
      deckTitle: deck.title,
      groupId: group.id,
      groupTitle: group.title ?? "",
      setId: set.id,
      setTitle: set.title ?? "",
    });
  });

  return usage;
}

export async function getDeckUsageForBackFaceIds(
  backFaceIds: string[],
): Promise<Array<DeckUsageLocation & { backFaceId: string }>> {
  if (!backFaceIds.length) return [];
  const backIdSet = new Set(backFaceIds);
  const sets = await listAll<DeckSetRecord>(SETS_STORE);
  const matchedSets = sets.filter((set) => backIdSet.has(set.backFaceId));
  if (!matchedSets.length) return [];

  const groups = await listAll<DeckGroupRecord>(GROUPS_STORE);
  const decks = await listAll<DeckRecord>(DECKS_STORE);
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const deckMap = new Map(decks.map((deck) => [deck.id, deck]));
  const usage: Array<DeckUsageLocation & { backFaceId: string }> = [];

  matchedSets.forEach((set) => {
    const group = groupMap.get(set.groupId);
    const deck = deckMap.get(set.deckId);
    if (!group || !deck) return;
    usage.push({
      deckId: deck.id,
      deckTitle: deck.title,
      groupId: group.id,
      groupTitle: group.title ?? "",
      setId: set.id,
      setTitle: set.title ?? "",
      backFaceId: set.backFaceId,
    });
  });

  return usage;
}

export async function validatePairEntry(setId: string, pairId: string): Promise<void> {
  const setStore = await getStore(SETS_STORE, "readonly");
  const set = await new Promise<DeckSetRecord | null>((resolve, reject) => {
    const request = setStore.get(setId);
    request.onsuccess = () => resolve((request.result as DeckSetRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load set"));
  });
  if (!set) return;
  const pair = await getPairById(pairId);
  if (!pair || !pair.frontFaceId || !pair.backFaceId) {
    throw new Error("Pair must be complete");
  }
  if (pair.backFaceId !== set.backFaceId) {
    throw new Error("Pair back does not match set back");
  }
}

export async function repairOrphanDeckEntries(): Promise<number> {
  const db = await openHqccDb();
  if (!db.objectStoreNames.contains(ENTRIES_STORE) || !db.objectStoreNames.contains(PAIRS_STORE)) {
    return 0;
  }

  const readTx = db.transaction([ENTRIES_STORE, PAIRS_STORE], "readonly");
  const entriesStore = readTx.objectStore(ENTRIES_STORE);
  const pairsStore = readTx.objectStore(PAIRS_STORE);
  const [entries, pairs] = await Promise.all([
    new Promise<DeckEntryRecord[]>((resolve, reject) => {
      const request = entriesStore.getAll();
      request.onsuccess = () => resolve((request.result as DeckEntryRecord[] | undefined) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Failed to load deck entries"));
    }),
    new Promise<PairRecord[]>((resolve, reject) => {
      const request = pairsStore.getAll();
      request.onsuccess = () => resolve((request.result as PairRecord[] | undefined) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Failed to load pairs"));
    }),
  ]);

  const pairIds = new Set(pairs.map((pair) => pair.id));
  const orphans = entries.filter((entry) => !pairIds.has(entry.pairId));
  if (!orphans.length) return 0;

  const writeTx = db.transaction(ENTRIES_STORE, "readwrite");
  const writeEntriesStore = writeTx.objectStore(ENTRIES_STORE);
  orphans.forEach((entry) => writeEntriesStore.delete(entry.id));
  await new Promise<void>((resolve, reject) => {
    writeTx.oncomplete = () => resolve();
    writeTx.onerror = () => reject(writeTx.error ?? new Error("Failed to repair orphan entries"));
    writeTx.onabort = () => reject(writeTx.error ?? new Error("Failed to repair orphan entries"));
  });
  orphans.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
  // eslint-disable-next-line no-console
  console.info(`[decks] Repaired orphan deck entries: ${orphans.length}`);
  return orphans.length;
}
