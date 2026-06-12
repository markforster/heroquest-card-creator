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
import { openHqccDb } from "@/lib/hqcc-db";
import {
  clampEntryCount,
  DECKS_STORE,
  ENTRIES_STORE,
  ENTRY_COUNT_MIN,
  getStore,
  GROUPS_STORE,
  listAll,
  listByIndex,
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

  const db = await openHqccDb();
  const tx = db.transaction([DECKS_STORE, GROUPS_STORE], "readwrite");
  const decksStore = tx.objectStore(DECKS_STORE);
  const groupsStore = tx.objectStore(GROUPS_STORE);

  decksStore.add(record);
  groupsStore.add(defaultGroup);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to create deck"));
  });
  enqueueDbEstimateChange(DECKS_STORE, record.id);
  enqueueDbEstimateChange(GROUPS_STORE, defaultGroup.id);
  return record;
}

export async function updateDeck(
  deckId: string,
  patch: Partial<Pick<DeckRecord, "title" | "description" | "keySetId">>,
): Promise<DeckRecord | null> {
  const store = await getStore(DECKS_STORE, "readwrite");
  const existing = await new Promise<DeckRecord | null>((resolve, reject) => {
    const request = store.get(deckId);
    request.onsuccess = () => resolve((request.result as DeckRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load deck"));
  });
  if (!existing) return null;
  const next: DeckRecord = {
    ...existing,
    ...patch,
    keySetId: patch.keySetId === undefined ? existing.keySetId ?? null : patch.keySetId,
    updatedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const request = store.put(next);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to update deck"));
  });
  enqueueDbEstimateChange(DECKS_STORE, next.id);
  return next;
}

async function touchDeckUpdatedAt(
  deckId: string,
  updatedAt: number = Date.now(),
): Promise<void> {
  const store = await getStore(DECKS_STORE, "readwrite");
  const existing = await new Promise<DeckRecord | null>((resolve, reject) => {
    const request = store.get(deckId);
    request.onsuccess = () => resolve((request.result as DeckRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load deck"));
  });
  if (!existing) return;
  const next: DeckRecord = {
    ...existing,
    updatedAt,
  };
  await new Promise<void>((resolve, reject) => {
    const request = store.put(next);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to touch deck"));
  });
  enqueueDbEstimateChange(DECKS_STORE, deckId);
}

function touchDeckUpdatedAtInTransaction(
  deckStore: IDBObjectStore,
  deck: DeckRecord,
  updatedAt: number,
): void {
  deckStore.put({
    ...deck,
    updatedAt,
  });
}

export async function deleteDeck(deckId: string): Promise<void> {
  const groups = await listByIndex<DeckGroupRecord>(GROUPS_STORE, "deckId", deckId);
  const sets = await listByIndex<DeckSetRecord>(SETS_STORE, "deckId", deckId);
  const entries = (
    await listByIndex<DeckEntryRecord & { count?: number | null }>(ENTRIES_STORE, "deckId", deckId)
  ).map(normalizeDeckEntryRecord);

  const db = await openHqccDb();
  const tx = db.transaction([DECKS_STORE, GROUPS_STORE, SETS_STORE, ENTRIES_STORE], "readwrite");
  const decksStore = tx.objectStore(DECKS_STORE);
  const groupsStore = tx.objectStore(GROUPS_STORE);
  const setsStore = tx.objectStore(SETS_STORE);
  const entriesStore = tx.objectStore(ENTRIES_STORE);

  entries.forEach((entry) => entriesStore.delete(entry.id));
  sets.forEach((set) => setsStore.delete(set.id));
  groups.forEach((group) => groupsStore.delete(group.id));
  decksStore.delete(deckId);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete deck"));
  });

  enqueueDbEstimateChange(DECKS_STORE, deckId);
  groups.forEach((group) => enqueueDbEstimateChange(GROUPS_STORE, group.id));
  sets.forEach((set) => enqueueDbEstimateChange(SETS_STORE, set.id));
  entries.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
}

export async function duplicateDeck(deckId: string): Promise<DeckRecord | null> {
  const existingDeck = await getDeck(deckId);
  if (!existingDeck) return null;

  const groups = sortByIndex(await listByIndex<DeckGroupRecord>(GROUPS_STORE, "deckId", deckId));
  const sets = sortByIndex(await listByIndex<DeckSetRecord>(SETS_STORE, "deckId", deckId));
  const entries = sortByIndex(
    (
      await listByIndex<DeckEntryRecord & { count?: number | null }>(ENTRIES_STORE, "deckId", deckId)
    ).map(normalizeDeckEntryRecord),
  );

  const db = await openHqccDb();
  const tx = db.transaction([DECKS_STORE, GROUPS_STORE, SETS_STORE, ENTRIES_STORE], "readwrite");
  const decksStore = tx.objectStore(DECKS_STORE);
  const groupsStore = tx.objectStore(GROUPS_STORE);
  const setsStore = tx.objectStore(SETS_STORE);
  const entriesStore = tx.objectStore(ENTRIES_STORE);

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
  decksStore.add(deckCopy);

  const groupIdMap = new Map<string, string>();
  groups.forEach((group) => {
    const id = generateId();
    groupIdMap.set(group.id, id);
    const copy: DeckGroupRecord = {
      ...group,
      id,
      deckId: deckCopy.id,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    groupsStore.add(copy);
  });

  const setIdMap = new Map<string, string>();
  sets.forEach((set) => {
    const id = generateId();
    setIdMap.set(set.id, id);
    const copy: DeckSetRecord = {
      ...set,
      id,
      deckId: deckCopy.id,
      groupId: groupIdMap.get(set.groupId) ?? set.groupId,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    setsStore.add(copy);
  });

  if (deckCopy.keySetId) {
    deckCopy.keySetId = setIdMap.get(deckCopy.keySetId) ?? null;
  }
  decksStore.put(deckCopy);

  entries.forEach((entry) => {
    const copy: DeckEntryRecord = {
      ...entry,
      id: generateId(),
      deckId: deckCopy.id,
      setId: setIdMap.get(entry.setId) ?? entry.setId,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    entriesStore.add(copy);
  });

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to duplicate deck"));
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
  const store = await getStore(GROUPS_STORE, "readwrite");
  await new Promise<void>((resolve, reject) => {
    const request = store.add(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to create group"));
  });
  await touchDeckUpdatedAt(deckId, now);
  enqueueDbEstimateChange(GROUPS_STORE, record.id);
  return record;
}

export async function updateGroup(
  groupId: string,
  patch: Partial<Pick<DeckGroupRecord, "title">>,
): Promise<DeckGroupRecord | null> {
  const store = await getStore(GROUPS_STORE, "readwrite");
  const existing = await new Promise<DeckGroupRecord | null>((resolve, reject) => {
    const request = store.get(groupId);
    request.onsuccess = () => resolve((request.result as DeckGroupRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load group"));
  });
  if (!existing) return null;
  const next: DeckGroupRecord = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const request = store.put(next);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to update group"));
  });
  await touchDeckUpdatedAt(existing.deckId, next.updatedAt);
  enqueueDbEstimateChange(GROUPS_STORE, next.id);
  return next;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const groupStore = await getStore(GROUPS_STORE, "readwrite");
  const group = await new Promise<DeckGroupRecord | null>((resolve, reject) => {
    const request = groupStore.get(groupId);
    request.onsuccess = () => resolve((request.result as DeckGroupRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load group"));
  });
  if (!group) return;
  const siblingGroups = await listByIndex<DeckGroupRecord>(GROUPS_STORE, "deckId", group.deckId);
  if (siblingGroups.length <= 1) return;

  const sets = await listByIndex<DeckSetRecord>(SETS_STORE, "groupId", groupId);
  const entryIds: string[] = [];
  for (const set of sets) {
    const entries = await listByIndex<DeckEntryRecord>(ENTRIES_STORE, "setId", set.id);
    entryIds.push(...entries.map((entry) => entry.id));
  }

  const db = await openHqccDb();
  const tx = db.transaction([GROUPS_STORE, SETS_STORE, ENTRIES_STORE], "readwrite");
  const txGroupStore = tx.objectStore(GROUPS_STORE);
  const txSetStore = tx.objectStore(SETS_STORE);
  const txEntryStore = tx.objectStore(ENTRIES_STORE);

  entryIds.forEach((id) => txEntryStore.delete(id));
  sets.forEach((set) => txSetStore.delete(set.id));
  txGroupStore.delete(groupId);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete group"));
  });

  await touchDeckUpdatedAt(group.deckId);
  enqueueDbEstimateChange(GROUPS_STORE, groupId);
  sets.forEach((set) => enqueueDbEstimateChange(SETS_STORE, set.id));
  entryIds.forEach((id) => enqueueDbEstimateChange(ENTRIES_STORE, id));
}

export async function reorderGroups(deckId: string, orderedGroupIds: string[]): Promise<void> {
  const groups = await listGroups(deckId);
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const store = await getStore(GROUPS_STORE, "readwrite");

  await new Promise<void>((resolve, reject) => {
    let remaining = orderedGroupIds.length;
    if (remaining === 0) {
      resolve();
      return;
    }
    orderedGroupIds.forEach((groupId, index) => {
      const group = groupMap.get(groupId);
      if (!group) {
        remaining -= 1;
        if (remaining === 0) resolve();
        return;
      }
      const next: DeckGroupRecord = { ...group, sortIndex: index, updatedAt: Date.now() };
      const request = store.put(next);
      request.onsuccess = () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      };
      request.onerror = () => reject(request.error ?? new Error("Failed to reorder groups"));
    });
  });
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
  const store = await getStore(SETS_STORE, "readwrite");
  await new Promise<void>((resolve, reject) => {
    const request = store.add(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to create set"));
  });
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
  const store = await getStore(SETS_STORE, "readwrite");
  const existing = await new Promise<DeckSetRecord | null>((resolve, reject) => {
    const request = store.get(setId);
    request.onsuccess = () => resolve((request.result as DeckSetRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load set"));
  });
  if (!existing) return null;
  const next: DeckSetRecord = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const request = store.put(next);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to update set"));
  });
  await touchDeckUpdatedAt(existing.deckId, next.updatedAt);
  enqueueDbEstimateChange(SETS_STORE, next.id);
  return next;
}

export async function deleteSet(setId: string): Promise<void> {
  const setStore = await getStore(SETS_STORE, "readwrite");
  const set = await new Promise<DeckSetRecord | null>((resolve, reject) => {
    const request = setStore.get(setId);
    request.onsuccess = () => resolve((request.result as DeckSetRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load set"));
  });
  if (!set) return;
  const entries = await listByIndex<DeckEntryRecord>(ENTRIES_STORE, "setId", setId);
  const groupSets = await listByIndex<DeckSetRecord>(SETS_STORE, "groupId", set.groupId);
  const deckGroups = await listByIndex<DeckGroupRecord>(GROUPS_STORE, "deckId", set.deckId);
  const shouldDeleteGroup = groupSets.length === 1 && deckGroups.length > 1;

  const deckStore = await getStore(DECKS_STORE, "readwrite");
  const deck = await new Promise<DeckRecord | null>((resolve, reject) => {
    const request = deckStore.get(set.deckId);
    request.onsuccess = () => resolve((request.result as DeckRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load deck"));
  });

  const db = await openHqccDb();
  const tx = db.transaction([SETS_STORE, ENTRIES_STORE, GROUPS_STORE, DECKS_STORE], "readwrite");
  const txSetStore = tx.objectStore(SETS_STORE);
  const txEntryStore = tx.objectStore(ENTRIES_STORE);
  const txGroupStore = tx.objectStore(GROUPS_STORE);
  const txDeckStore = tx.objectStore(DECKS_STORE);
  const now = Date.now();
  entries.forEach((entry) => txEntryStore.delete(entry.id));
  txSetStore.delete(setId);
  if (shouldDeleteGroup) {
    txGroupStore.delete(set.groupId);
  }
  if (deck) {
    const isDeletingKeySet = (deck.keySetId ?? null) === setId;
    touchDeckUpdatedAtInTransaction(
      txDeckStore,
      {
        ...deck,
        keySetId: isDeletingKeySet ? null : deck.keySetId ?? null,
      },
      now,
    );
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete set"));
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
  const store = await getStore(SETS_STORE, "readwrite");

  await new Promise<void>((resolve, reject) => {
    let remaining = orderedSetIds.length;
    if (remaining === 0) {
      resolve();
      return;
    }
    orderedSetIds.forEach((setId, index) => {
      const set = setMap.get(setId);
      if (!set || set.groupId !== groupId) {
        remaining -= 1;
        if (remaining === 0) resolve();
        return;
      }
      const next: DeckSetRecord = { ...set, sortIndex: index, updatedAt: Date.now() };
      const request = store.put(next);
      request.onsuccess = () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      };
      request.onerror = () => reject(request.error ?? new Error("Failed to reorder sets"));
    });
  });
  await touchDeckUpdatedAt(deckId);
  orderedSetIds.forEach((id) => enqueueDbEstimateChange(SETS_STORE, id));
}

export async function rebuildSetBack(
  setId: string,
  newBackFaceId: string,
  selectedFrontFaceIds: string[],
): Promise<void> {
  const setStore = await getStore(SETS_STORE, "readwrite");
  const set = await new Promise<DeckSetRecord | null>((resolve, reject) => {
    const request = setStore.get(setId);
    request.onsuccess = () => resolve((request.result as DeckSetRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load set"));
  });
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

  const existingEntries = await listByIndex<DeckEntryRecord>(ENTRIES_STORE, "setId", setId);
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

  const db = await openHqccDb();
  const tx = db.transaction([SETS_STORE, ENTRIES_STORE, DECKS_STORE], "readwrite");
  const txSetStore = tx.objectStore(SETS_STORE);
  const txEntryStore = tx.objectStore(ENTRIES_STORE);
  const txDeckStore = tx.objectStore(DECKS_STORE);

  existingEntries.forEach((entry) => txEntryStore.delete(entry.id));
  nextEntries.forEach((entry) => txEntryStore.add(entry));

  const nextSet: DeckSetRecord = {
    ...set,
    backFaceId: newBackFaceId,
    updatedAt: now,
  };
  txSetStore.put(nextSet);
  if (existingDeck) {
    touchDeckUpdatedAtInTransaction(txDeckStore, existingDeck, now);
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to rebuild set"));
  });

  enqueueDbEstimateChange(SETS_STORE, setId);
  existingEntries.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
  nextEntries.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
}

export async function addFrontsToSet(
  setId: string,
  frontFaceIds: string[],
): Promise<DeckEntryRecord[]> {
  const setStore = await getStore(SETS_STORE, "readonly");
  const set = await new Promise<DeckSetRecord | null>((resolve, reject) => {
    const request = setStore.get(setId);
    request.onsuccess = () => resolve((request.result as DeckSetRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load set"));
  });
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

  const db = await openHqccDb();
  const tx = db.transaction(ENTRIES_STORE, "readwrite");
  const store = tx.objectStore(ENTRIES_STORE);
  created.forEach((entry) => store.add(entry));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to add entry"));
  });

  await touchDeckUpdatedAt(set.deckId, now);
  created.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
  return created;
}

export async function removeEntries(setId: string, entryIds: string[]): Promise<void> {
  if (!entryIds.length) return;
  const store = await getStore(ENTRIES_STORE, "readwrite");
  await new Promise<void>((resolve, reject) => {
    entryIds.forEach((id) => store.delete(id));
    const tx = store.transaction;
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to remove entries"));
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
  const store = await getStore(ENTRIES_STORE, "readwrite");

  await new Promise<void>((resolve, reject) => {
    let remaining = orderedEntryIds.length;
    if (remaining === 0) {
      resolve();
      return;
    }
    orderedEntryIds.forEach((entryId, index) => {
      const entry = entryMap.get(entryId);
      if (!entry) {
        remaining -= 1;
        if (remaining === 0) resolve();
        return;
      }
      const next: DeckEntryRecord = { ...entry, sortIndex: index, updatedAt: Date.now() };
      const request = store.put(next);
      request.onsuccess = () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      };
      request.onerror = () => reject(request.error ?? new Error("Failed to reorder entries"));
    });
  });
  await touchDeckUpdatedAt(set.deckId);
  orderedEntryIds.forEach((id) => enqueueDbEstimateChange(ENTRIES_STORE, id));
}

export async function updateEntryCount(
  setId: string,
  entryId: string,
  count: number,
): Promise<DeckEntryRecord | null> {
  const store = await getStore(ENTRIES_STORE, "readwrite");
  const existing = await new Promise<(DeckEntryRecord & { count?: number | null }) | null>(
    (resolve, reject) => {
      const request = store.get(entryId);
      request.onsuccess = () =>
        resolve(
          (request.result as (DeckEntryRecord & { count?: number | null }) | undefined) ?? null,
        );
      request.onerror = () => reject(request.error ?? new Error("Failed to load entry"));
    },
  );
  if (!existing || existing.setId !== setId) return null;
  const normalized = normalizeDeckEntryRecord(existing);
  const next: DeckEntryRecord = {
    ...normalized,
    count: clampEntryCount(count),
    updatedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const request = store.put(next);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to update entry count"));
  });
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
  const sets = await listAll<DeckSetRecord>(SETS_STORE);
  const groups = await listAll<DeckGroupRecord>(GROUPS_STORE);
  const decks = await listAll<DeckRecord>(DECKS_STORE);
  const entries = (await listAll<DeckEntryRecord & { count?: number | null }>(ENTRIES_STORE)).map(
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

  const db = await openHqccDb();
  const tx = db.transaction([ENTRIES_STORE, SETS_STORE, GROUPS_STORE, DECKS_STORE], "readwrite");
  const entriesStore = tx.objectStore(ENTRIES_STORE);
  const setsStore = tx.objectStore(SETS_STORE);
  const groupsStore = tx.objectStore(GROUPS_STORE);
  const decksStore = tx.objectStore(DECKS_STORE);

  entriesToDelete.forEach((entry) => entriesStore.delete(entry.id));
  setsToDelete.forEach((set) => setsStore.delete(set.id));
  groupsToDelete.forEach((group) => groupsStore.delete(group.id));
  decksToDelete.forEach((deck) => decksStore.delete(deck.id));

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to cascade delete deck data"));
    tx.onabort = () => reject(tx.error ?? new Error("Failed to cascade delete deck data"));
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
