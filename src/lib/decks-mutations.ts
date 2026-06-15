"use client";

import type {
  DeckEntryRecord,
  DeckGroupRecord,
  DeckRecord,
  DeckSetRecord,
} from "@/types/decks-db";

import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";
import { getCard } from "@/lib/cards-db";
import { createPair } from "@/lib/pairs-service";
import { generateId } from "@/lib";
import { openHqccDexieDb } from "@/lib/hqcc-dexie";
import {
  clampEntryCount,
  DECKS_STORE,
  ENTRIES_STORE,
  ENTRY_COUNT_MIN,
  GROUPS_STORE,
  nextSortIndex,
  normalizeDeckEntryRecord,
  SETS_STORE,
  sortByIndex,
} from "@/lib/decks-db";
import {
  getDeck,
  getSet,
  listEntriesForSet,
  listGroups,
  listSets,
} from "@/lib/decks-queries";

export async function createDeck(input: {
  title: string;
  description?: string | null;
  keySetId?: string | null;
  id?: string;
  createdAt?: number;
  updatedAt?: number;
  schemaVersion?: 1;
}): Promise<DeckRecord> {
  const now = Date.now();
  const record: DeckRecord = {
    id: input.id ?? generateId(),
    title: input.title,
    description: input.description ?? null,
    keySetId: input.keySetId ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    schemaVersion: input.schemaVersion ?? 1,
  };
  const defaultGroup: DeckGroupRecord = {
    id: generateId(),
    deckId: record.id,
    sortIndex: 0,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };

  const db = await openHqccDexieDb();
  await db.transaction("rw", db.decks, db.deckGroups, async () => {
    await db.decks.add(record);
    await db.deckGroups.add(defaultGroup);
  });
  enqueueDbEstimateChange(DECKS_STORE, record.id);
  enqueueDbEstimateChange(GROUPS_STORE, defaultGroup.id);
  return record;
}

export async function updateDeck(
  deckId: string,
  patch: Partial<Pick<DeckRecord, "title" | "description" | "keySetId">>,
): Promise<DeckRecord | null> {
  const db = await openHqccDexieDb();
  const existing = (await db.decks.get(deckId)) ?? null;
  if (!existing) return null;
  const next: DeckRecord = {
    ...existing,
    ...patch,
    keySetId: patch.keySetId === undefined ? existing.keySetId ?? null : patch.keySetId,
    updatedAt: Date.now(),
  };
  await db.decks.put(next);
  enqueueDbEstimateChange(DECKS_STORE, next.id);
  return next;
}

async function touchDeckUpdatedAt(
  deckId: string,
  updatedAt: number = Date.now(),
): Promise<void> {
  const db = await openHqccDexieDb();
  const existing = (await db.decks.get(deckId)) ?? null;
  if (!existing) return;
  const next: DeckRecord = {
    ...existing,
    updatedAt,
  };
  await db.decks.put(next);
  enqueueDbEstimateChange(DECKS_STORE, deckId);
}

async function touchDeckUpdatedAtInTransaction(
  db: Awaited<ReturnType<typeof openHqccDexieDb>>,
  deck: DeckRecord,
  updatedAt: number,
): Promise<void> {
  await db.decks.put({
    ...deck,
    updatedAt,
  });
}

export async function deleteDeck(deckId: string): Promise<void> {
  const db = await openHqccDexieDb();
  const groups = await db.deckGroups.where("deckId").equals(deckId).toArray();
  const sets = await db.deckSets.where("deckId").equals(deckId).toArray();
  const entries = (await db.deckEntries.where("deckId").equals(deckId).toArray()).map(
    normalizeDeckEntryRecord,
  );

  await db.transaction("rw", db.decks, db.deckGroups, db.deckSets, db.deckEntries, async () => {
    await db.deckEntries.bulkDelete(entries.map((entry) => entry.id));
    await db.deckSets.bulkDelete(sets.map((set) => set.id));
    await db.deckGroups.bulkDelete(groups.map((group) => group.id));
    await db.decks.delete(deckId);
  });

  enqueueDbEstimateChange(DECKS_STORE, deckId);
  groups.forEach((group) => enqueueDbEstimateChange(GROUPS_STORE, group.id));
  sets.forEach((set) => enqueueDbEstimateChange(SETS_STORE, set.id));
  entries.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
}

export async function duplicateDeck(deckId: string): Promise<DeckRecord | null> {
  const existingDeck = await getDeck(deckId);
  if (!existingDeck) return null;

  const db = await openHqccDexieDb();
  const groups = sortByIndex(await db.deckGroups.where("deckId").equals(deckId).toArray());
  const sets = sortByIndex(await db.deckSets.where("deckId").equals(deckId).toArray());
  const entries = sortByIndex(
    (await db.deckEntries.where("deckId").equals(deckId).toArray()).map(normalizeDeckEntryRecord),
  );

  const now = Date.now();
  const deckCopy: DeckRecord = {
    ...existingDeck,
    id: generateId(),
    title: `${existingDeck.title} (Copy)`,
    keySetId: existingDeck.keySetId ?? null,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };

  const groupIdMap = new Map<string, string>();
  const groupCopies: DeckGroupRecord[] = [];
  groups.forEach((group) => {
    const id = generateId();
    groupIdMap.set(group.id, id);
    groupCopies.push({
      ...group,
      id,
      deckId: deckCopy.id,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
  });

  const setIdMap = new Map<string, string>();
  const setCopies: DeckSetRecord[] = [];
  sets.forEach((set) => {
    const id = generateId();
    setIdMap.set(set.id, id);
    setCopies.push({
      ...set,
      id,
      deckId: deckCopy.id,
      groupId: groupIdMap.get(set.groupId) ?? set.groupId,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
  });

  if (deckCopy.keySetId) {
    deckCopy.keySetId = setIdMap.get(deckCopy.keySetId) ?? null;
  }

  const entryCopies = entries.map<DeckEntryRecord>((entry) => ({
    ...entry,
    id: generateId(),
    deckId: deckCopy.id,
    setId: setIdMap.get(entry.setId) ?? entry.setId,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  }));

  await db.transaction("rw", db.decks, db.deckGroups, db.deckSets, db.deckEntries, async () => {
    await db.decks.add(deckCopy);
    await db.deckGroups.bulkAdd(groupCopies);
    await db.deckSets.bulkAdd(setCopies);
    await db.decks.put(deckCopy);
    await db.deckEntries.bulkAdd(entryCopies);
  });

  enqueueDbEstimateChange(DECKS_STORE, deckCopy.id);
  groupIdMap.forEach((id) => enqueueDbEstimateChange(GROUPS_STORE, id));
  setIdMap.forEach((id) => enqueueDbEstimateChange(SETS_STORE, id));

  return deckCopy;
}

export async function createGroup(
  deckId: string,
  input: { title?: string },
): Promise<DeckGroupRecord> {
  const existing = await listGroups(deckId);
  const now = Date.now();
  const record: DeckGroupRecord = {
    id: generateId(),
    deckId,
    sortIndex: nextSortIndex(existing),
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };
  if (typeof input.title !== "undefined") {
    record.title = input.title;
  }
  const db = await openHqccDexieDb();
  await db.deckGroups.add(record);
  await touchDeckUpdatedAt(deckId, now);
  enqueueDbEstimateChange(GROUPS_STORE, record.id);
  return record;
}

export async function updateGroup(
  groupId: string,
  patch: Partial<Pick<DeckGroupRecord, "title">>,
): Promise<DeckGroupRecord | null> {
  const db = await openHqccDexieDb();
  const existing = (await db.deckGroups.get(groupId)) ?? null;
  if (!existing) return null;
  const next: DeckGroupRecord = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  await db.deckGroups.put(next);
  await touchDeckUpdatedAt(existing.deckId, next.updatedAt);
  enqueueDbEstimateChange(GROUPS_STORE, next.id);
  return next;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const db = await openHqccDexieDb();
  const group = (await db.deckGroups.get(groupId)) ?? null;
  if (!group) return;
  const siblingGroups = await db.deckGroups.where("deckId").equals(group.deckId).toArray();
  if (siblingGroups.length <= 1) return;

  const sets = await db.deckSets.where("groupId").equals(groupId).toArray();
  const entryIds: string[] = [];
  for (const set of sets) {
    const entries = await db.deckEntries.where("setId").equals(set.id).toArray();
    entryIds.push(...entries.map((entry) => entry.id));
  }

  await db.transaction("rw", db.deckGroups, db.deckSets, db.deckEntries, async () => {
    await db.deckEntries.bulkDelete(entryIds);
    await db.deckSets.bulkDelete(sets.map((set) => set.id));
    await db.deckGroups.delete(groupId);
  });

  await touchDeckUpdatedAt(group.deckId);
  enqueueDbEstimateChange(GROUPS_STORE, groupId);
  sets.forEach((set) => enqueueDbEstimateChange(SETS_STORE, set.id));
  entryIds.forEach((id) => enqueueDbEstimateChange(ENTRIES_STORE, id));
}

export async function reorderGroups(deckId: string, orderedGroupIds: string[]): Promise<void> {
  const groups = await listGroups(deckId);
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const db = await openHqccDexieDb();
  const updates = orderedGroupIds
    .map((groupId, index) => {
      const group = groupMap.get(groupId);
      if (!group) {
        return null;
      }
      return { ...group, sortIndex: index, updatedAt: Date.now() };
    })
    .filter((group): group is DeckGroupRecord => Boolean(group));

  if (updates.length > 0) {
    await db.deckGroups.bulkPut(updates);
  }
  await touchDeckUpdatedAt(deckId);
  orderedGroupIds.forEach((id) => enqueueDbEstimateChange(GROUPS_STORE, id));
}

async function ensureBackFace(backFaceId: string): Promise<void> {
  const card = await getCard(backFaceId);
  if (!card) return;
  if (card.face && card.face !== "back") {
    throw new Error("Back face id must reference a back card");
  }
}

export async function createSet(
  deckId: string,
  groupId: string,
  input: { title?: string; description?: string | null; backFaceId: string },
): Promise<DeckSetRecord> {
  const existingSets = await listSets(deckId);
  const conflict = existingSets.find((set) => set.backFaceId === input.backFaceId);
  if (conflict) {
    throw {
      code: "DECK_SET_BACK_ALREADY_USED",
      deckId,
      backFaceId: input.backFaceId,
      existingSetId: conflict.id,
    };
  }
  await ensureBackFace(input.backFaceId);
  const now = Date.now();
  const record: DeckSetRecord = {
    id: generateId(),
    deckId,
    groupId,
    description: input.description ?? null,
    backFaceId: input.backFaceId,
    sortIndex: nextSortIndex(existingSets.filter((set) => set.groupId === groupId)),
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };
  if (typeof input.title !== "undefined") {
    record.title = input.title;
  }
  const db = await openHqccDexieDb();
  await db.deckSets.add(record);
  enqueueDbEstimateChange(SETS_STORE, record.id);

  if (existingSets.length === 0) {
    await updateDeck(deckId, { keySetId: record.id });
  } else {
    await touchDeckUpdatedAt(deckId, now);
  }
  return record;
}

export async function updateSet(
  setId: string,
  patch: Partial<Pick<DeckSetRecord, "title" | "description" | "groupId">>,
): Promise<DeckSetRecord | null> {
  const db = await openHqccDexieDb();
  const existing = (await db.deckSets.get(setId)) ?? null;
  if (!existing) return null;
  const next: DeckSetRecord = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  await db.deckSets.put(next);
  await touchDeckUpdatedAt(existing.deckId, next.updatedAt);
  enqueueDbEstimateChange(SETS_STORE, next.id);
  return next;
}

export async function deleteSet(setId: string): Promise<void> {
  const db = await openHqccDexieDb();
  const set = (await db.deckSets.get(setId)) ?? null;
  if (!set) return;
  const entries = await db.deckEntries.where("setId").equals(setId).toArray();
  const groupSets = await db.deckSets.where("groupId").equals(set.groupId).toArray();
  const deckGroups = await db.deckGroups.where("deckId").equals(set.deckId).toArray();
  const shouldDeleteGroup = groupSets.length === 1 && deckGroups.length > 1;

  const deck = (await db.decks.get(set.deckId)) ?? null;

  const now = Date.now();
  await db.transaction("rw", db.deckSets, db.deckEntries, db.deckGroups, db.decks, async () => {
    await db.deckEntries.bulkDelete(entries.map((entry) => entry.id));
    await db.deckSets.delete(setId);
    if (shouldDeleteGroup) {
      await db.deckGroups.delete(set.groupId);
    }
    if (deck) {
      const isDeletingKeySet = (deck.keySetId ?? null) === setId;
      await touchDeckUpdatedAtInTransaction(
        db,
        {
          ...deck,
          keySetId: isDeletingKeySet ? null : deck.keySetId ?? null,
        },
        now,
      );
    }
  });

  enqueueDbEstimateChange(SETS_STORE, setId);
  entries.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
  if (shouldDeleteGroup) {
    enqueueDbEstimateChange(GROUPS_STORE, set.groupId);
  }
}

export async function reorderSets(
  deckId: string,
  groupId: string,
  orderedSetIds: string[],
): Promise<void> {
  const sets = await listSets(deckId);
  const setMap = new Map(sets.map((set) => [set.id, set]));
  const db = await openHqccDexieDb();
  const updates = orderedSetIds
    .map((setId, index) => {
      const set = setMap.get(setId);
      if (!set || set.groupId !== groupId) {
        return null;
      }
      return { ...set, sortIndex: index, updatedAt: Date.now() };
    })
    .filter((set): set is DeckSetRecord => Boolean(set));

  if (updates.length > 0) {
    await db.deckSets.bulkPut(updates);
  }
  await touchDeckUpdatedAt(deckId);
  orderedSetIds.forEach((id) => enqueueDbEstimateChange(SETS_STORE, id));
}

export async function rebuildSetBack(
  setId: string,
  newBackFaceId: string,
  selectedFrontFaceIds: string[],
): Promise<void> {
  const db = await openHqccDexieDb();
  const set = (await db.deckSets.get(setId)) ?? null;
  if (!set) return;

  const existingSets = await listSets(set.deckId);
  const conflict = existingSets.find(
    (candidate) => candidate.backFaceId === newBackFaceId && candidate.id !== setId,
  );
  if (conflict) {
    throw {
      code: "DECK_SET_BACK_ALREADY_USED",
      deckId: set.deckId,
      backFaceId: newBackFaceId,
      existingSetId: conflict.id,
    };
  }
  await ensureBackFace(newBackFaceId);

  const existingEntries = await db.deckEntries.where("setId").equals(setId).toArray();
  const existingDeck = await getDeck(set.deckId);
  const now = Date.now();
  let sortIndex = 0;
  const uniqueFrontIds = Array.from(new Set(selectedFrontFaceIds));
  const usedPairIds = new Set<string>();
  const nextEntries: DeckEntryRecord[] = [];
  for (const frontId of uniqueFrontIds) {
    const pair = await createPair(frontId, newBackFaceId);
    if (usedPairIds.has(pair.id)) {
      continue;
    }
    usedPairIds.add(pair.id);
    nextEntries.push({
      id: generateId(),
      deckId: set.deckId,
      setId,
      pairId: pair.id,
      count: ENTRY_COUNT_MIN,
      sortIndex,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
    sortIndex += 1;
  }

  const nextSet: DeckSetRecord = {
    ...set,
    backFaceId: newBackFaceId,
    updatedAt: now,
  };
  await db.transaction("rw", db.deckSets, db.deckEntries, db.decks, async () => {
    await db.deckEntries.bulkDelete(existingEntries.map((entry) => entry.id));
    await db.deckEntries.bulkAdd(nextEntries);
    await db.deckSets.put(nextSet);
    if (existingDeck) {
      await touchDeckUpdatedAtInTransaction(db, existingDeck, now);
    }
  });

  enqueueDbEstimateChange(SETS_STORE, setId);
  existingEntries.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
  nextEntries.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
}

export async function addFrontsToSet(
  setId: string,
  frontFaceIds: string[],
): Promise<DeckEntryRecord[]> {
  const db = await openHqccDexieDb();
  const set = (await db.deckSets.get(setId)) ?? null;
  if (!set) return [];

  const existingEntries = await listEntriesForSet(setId);
  const setPairIdSet = new Set(existingEntries.map((entry) => entry.pairId));
  let sortIndex = nextSortIndex(existingEntries);
  const created: DeckEntryRecord[] = [];
  const now = Date.now();
  for (const frontId of frontFaceIds) {
    const pair = await createPair(frontId, set.backFaceId);
    if (!pair.backFaceId || pair.backFaceId !== set.backFaceId) {
      continue;
    }
    if (setPairIdSet.has(pair.id)) {
      continue;
    }
    const entry: DeckEntryRecord = {
      id: generateId(),
      deckId: set.deckId,
      setId: set.id,
      pairId: pair.id,
      count: ENTRY_COUNT_MIN,
      sortIndex,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    sortIndex += 1;
    setPairIdSet.add(pair.id);
    created.push(entry);
  }

  if (created.length === 0) {
    return [];
  }

  await db.transaction("rw", db.deckEntries, async () => {
    await db.deckEntries.bulkAdd(created);
  });

  await touchDeckUpdatedAt(set.deckId, now);
  created.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
  return created;
}

export async function removeEntries(setId: string, entryIds: string[]): Promise<void> {
  if (!entryIds.length) return;
  const db = await openHqccDexieDb();
  await db.transaction("rw", db.deckEntries, async () => {
    await db.deckEntries.bulkDelete(entryIds);
  });
  entryIds.forEach((id) => enqueueDbEstimateChange(ENTRIES_STORE, id));

  const remaining = await listEntriesForSet(setId);
  await reorderEntries(setId, remaining.map((entry) => entry.id));
}

export async function reorderEntries(setId: string, orderedEntryIds: string[]): Promise<void> {
  const entries = await listEntriesForSet(setId);
  const set = await getSet(setId);
  if (!set) return;
  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  const db = await openHqccDexieDb();
  const updates = orderedEntryIds
    .map((entryId, index) => {
      const entry = entryMap.get(entryId);
      if (!entry) {
        return null;
      }
      return { ...entry, sortIndex: index, updatedAt: Date.now() };
    })
    .filter((entry): entry is DeckEntryRecord => Boolean(entry));

  if (updates.length > 0) {
    await db.deckEntries.bulkPut(updates);
  }
  await touchDeckUpdatedAt(set.deckId);
  orderedEntryIds.forEach((id) => enqueueDbEstimateChange(ENTRIES_STORE, id));
}

export async function updateEntryCount(
  setId: string,
  entryId: string,
  count: number,
): Promise<DeckEntryRecord | null> {
  const db = await openHqccDexieDb();
  const existing = (await db.deckEntries.get(entryId)) ?? null;
  if (!existing || existing.setId !== setId) return null;
  const normalized = normalizeDeckEntryRecord(existing);
  const next: DeckEntryRecord = {
    ...normalized,
    count: clampEntryCount(count),
    updatedAt: Date.now(),
  };
  await db.deckEntries.put(next);
  await touchDeckUpdatedAt(existing.deckId, next.updatedAt);
  enqueueDbEstimateChange(ENTRIES_STORE, next.id);
  return next;
}

export async function cascadeDeleteDeckDataForBackFaceIds(backFaceIds: string[]): Promise<{
  deletedEntries: number;
  deletedSets: number;
  deletedGroups: number;
  deletedDecks: number;
}> {
  if (!backFaceIds.length) {
    return { deletedEntries: 0, deletedSets: 0, deletedGroups: 0, deletedDecks: 0 };
  }
  const backIdSet = new Set(backFaceIds);
  const db = await openHqccDexieDb();
  const sets = await db.deckSets.toArray();
  const groups = await db.deckGroups.toArray();
  const decks = await db.decks.toArray();
  const entries = (await db.deckEntries.toArray()).map(
    normalizeDeckEntryRecord,
  );

  const setsToDelete = sets.filter((set) => backIdSet.has(set.backFaceId));
  if (!setsToDelete.length) {
    return { deletedEntries: 0, deletedSets: 0, deletedGroups: 0, deletedDecks: 0 };
  }
  const setIdSet = new Set(setsToDelete.map((set) => set.id));
  const entriesToDelete = entries.filter((entry) => setIdSet.has(entry.setId));

  const remainingSets = sets.filter((set) => !setIdSet.has(set.id));
  const remainingSetGroupIds = new Set(remainingSets.map((set) => set.groupId));
  const groupsToDelete = groups.filter((group) => !remainingSetGroupIds.has(group.id));
  const groupIdSetToDelete = new Set(groupsToDelete.map((group) => group.id));
  const remainingGroups = groups.filter((group) => !groupIdSetToDelete.has(group.id));
  const remainingGroupDeckIds = new Set(remainingGroups.map((group) => group.deckId));
  const decksToDelete = decks.filter((deck) => !remainingGroupDeckIds.has(deck.id));

  await db.transaction("rw", db.deckEntries, db.deckSets, db.deckGroups, db.decks, async () => {
    await db.deckEntries.bulkDelete(entriesToDelete.map((entry) => entry.id));
    await db.deckSets.bulkDelete(setsToDelete.map((set) => set.id));
    await db.deckGroups.bulkDelete(groupsToDelete.map((group) => group.id));
    await db.decks.bulkDelete(decksToDelete.map((deck) => deck.id));
  });

  entriesToDelete.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
  setsToDelete.forEach((set) => enqueueDbEstimateChange(SETS_STORE, set.id));
  groupsToDelete.forEach((group) => enqueueDbEstimateChange(GROUPS_STORE, group.id));
  decksToDelete.forEach((deck) => enqueueDbEstimateChange(DECKS_STORE, deck.id));

  return {
    deletedEntries: entriesToDelete.length,
    deletedSets: setsToDelete.length,
    deletedGroups: groupsToDelete.length,
    deletedDecks: decksToDelete.length,
  };
}
