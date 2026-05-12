"use client";

import type {
  DeckEntryRecord,
  DeckGroupRecord,
  DeckRecord,
  DeckSetRecord,
} from "@/types/decks-db";
import type { PairRecord } from "@/types/pairs-db";

import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";
import { getCard } from "@/lib/cards-db";
import { createPair } from "@/lib/pairs-service";
import { generateId } from "@/lib";
import { openHqccDb } from "@/lib/hqcc-db";
import type { DeckUsageLocation } from "@/lib/decks-errors";

const DECKS_STORE = "decks";
const GROUPS_STORE = "deckGroups";
const SETS_STORE = "deckSets";
const ENTRIES_STORE = "deckEntries";
const PAIRS_STORE = "pairs";
const ENTRY_COUNT_MIN = 1;
const ENTRY_COUNT_MAX = 12;

async function getStore(name: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openHqccDb();
  if (!db.objectStoreNames.contains(name)) {
    throw new Error(`Store not available: ${name}`);
  }
  const tx = db.transaction(name, mode);
  return tx.objectStore(name);
}

async function getPairsStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openHqccDb();
  if (!db.objectStoreNames.contains(PAIRS_STORE)) {
    throw new Error("Pairs store not available");
  }
  const tx = db.transaction(PAIRS_STORE, mode);
  return tx.objectStore(PAIRS_STORE);
}

function sortByIndex<T extends { sortIndex: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortIndex - b.sortIndex);
}

function clampEntryCount(value: number): number {
  return Math.max(ENTRY_COUNT_MIN, Math.min(ENTRY_COUNT_MAX, Math.trunc(value)));
}

function normalizeDeckEntryRecord(
  entry: DeckEntryRecord & { count?: number | null },
): DeckEntryRecord {
  const raw = entry.count;
  const count =
    typeof raw === "number" && Number.isFinite(raw) ? clampEntryCount(raw) : ENTRY_COUNT_MIN;
  return { ...entry, count };
}

async function listByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  const store = await getStore(storeName, "readonly");
  if (!store.indexNames.contains(indexName)) return [];
  const index = store.index(indexName);

  return new Promise<T[]>((resolve, reject) => {
    const results: T[] = [];
    const request = index.openCursor(IDBKeyRange.only(value));
    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve(results);
        return;
      }
      results.push(cursor.value as T);
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to read index"));
  });
}

async function listAll<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName, "readonly");
  return new Promise<T[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as T[] | undefined) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Failed to list records"));
  });
}

function nextSortIndex(items: { sortIndex: number }[]): number {
  if (!items.length) return 0;
  return Math.max(...items.map((item) => item.sortIndex)) + 1;
}

export async function listDecks({ search }: { search?: string } = {}): Promise<DeckRecord[]> {
  const decks = await listAll<DeckRecord>(DECKS_STORE);
  if (!search) return decks;
  const q = search.toLocaleLowerCase();
  return decks.filter((deck) => deck.title.toLocaleLowerCase().includes(q));
}

export async function getDeck(deckId: string): Promise<DeckRecord | null> {
  const store = await getStore(DECKS_STORE, "readonly");
  return new Promise<DeckRecord | null>((resolve, reject) => {
    const request = store.get(deckId);
    request.onsuccess = () => {
      resolve((request.result as DeckRecord | undefined) ?? null);
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to load deck"));
  });
}

export async function createDeck(input: {
  title: string;
  description?: string | null;
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
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    schemaVersion: input.schemaVersion ?? 1,
  };
  const store = await getStore(DECKS_STORE, "readwrite");
  await new Promise<void>((resolve, reject) => {
    const request = store.add(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to create deck"));
  });
  enqueueDbEstimateChange(DECKS_STORE, record.id);
  return record;
}

export async function updateDeck(
  deckId: string,
  patch: Partial<Pick<DeckRecord, "title" | "description">>,
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

  const groups = sortByIndex(
    await listByIndex<DeckGroupRecord>(GROUPS_STORE, "deckId", deckId),
  );
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

export async function createGroup(
  deckId: string,
  input: { title: string },
): Promise<DeckGroupRecord> {
  const existing = await listGroups(deckId);
  const now = Date.now();
  const record: DeckGroupRecord = {
    id: generateId(),
    deckId,
    title: input.title,
    sortIndex: nextSortIndex(existing),
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };
  const store = await getStore(GROUPS_STORE, "readwrite");
  await new Promise<void>((resolve, reject) => {
    const request = store.add(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to create group"));
  });
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
  orderedGroupIds.forEach((id) => enqueueDbEstimateChange(GROUPS_STORE, id));
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
  input: { title: string; description?: string | null; backFaceId: string },
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
    title: input.title,
    description: input.description ?? null,
    backFaceId: input.backFaceId,
    sortIndex: nextSortIndex(existingSets.filter((set) => set.groupId === groupId)),
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };
  const store = await getStore(SETS_STORE, "readwrite");
  await new Promise<void>((resolve, reject) => {
    const request = store.add(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to create set"));
  });
  enqueueDbEstimateChange(SETS_STORE, record.id);
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
  const shouldDeleteGroup = groupSets.length === 1;

  const db = await openHqccDb();
  const tx = db.transaction([SETS_STORE, ENTRIES_STORE, GROUPS_STORE], "readwrite");
  const txSetStore = tx.objectStore(SETS_STORE);
  const txEntryStore = tx.objectStore(ENTRIES_STORE);
  const txGroupStore = tx.objectStore(GROUPS_STORE);
  entries.forEach((entry) => txEntryStore.delete(entry.id));
  txSetStore.delete(setId);
  if (shouldDeleteGroup) {
    txGroupStore.delete(set.groupId);
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
      setId: setId,
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
  const tx = db.transaction([SETS_STORE, ENTRIES_STORE], "readwrite");
  const txSetStore = tx.objectStore(SETS_STORE);
  const txEntryStore = tx.objectStore(ENTRIES_STORE);

  existingEntries.forEach((entry) => txEntryStore.delete(entry.id));
  nextEntries.forEach((entry) => txEntryStore.add(entry));

  const nextSet: DeckSetRecord = {
    ...set,
    backFaceId: newBackFaceId,
    updatedAt: now,
  };
  txSetStore.put(nextSet);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to rebuild set"));
  });

  enqueueDbEstimateChange(SETS_STORE, setId);
  existingEntries.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
  nextEntries.forEach((entry) => enqueueDbEstimateChange(ENTRIES_STORE, entry.id));
}

export async function listEntriesForSet(setId: string): Promise<DeckEntryRecord[]> {
  const entries = await listByIndex<DeckEntryRecord & { count?: number | null }>(
    ENTRIES_STORE,
    "setId",
    setId,
  );
  return sortByIndex(entries.map(normalizeDeckEntryRecord));
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
  orderedEntryIds.forEach((id) => enqueueDbEstimateChange(ENTRIES_STORE, id));
}

export async function updateEntryCount(
  setId: string,
  entryId: string,
  count: number,
): Promise<DeckEntryRecord | null> {
  const store = await getStore(ENTRIES_STORE, "readwrite");
  const existing = await new Promise<(DeckEntryRecord & { count?: number | null }) | null>((resolve, reject) => {
    const request = store.get(entryId);
    request.onsuccess = () =>
      resolve((request.result as (DeckEntryRecord & { count?: number | null }) | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load entry"));
  });
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
  enqueueDbEstimateChange(ENTRIES_STORE, next.id);
  return next;
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

  const groupIds = new Set<string>();
  const deckIds = new Set<string>();
  setIds.forEach((setId) => {
    const set = setMap.get(setId);
    if (!set) return;
    groupIds.add(set.groupId);
    deckIds.add(set.deckId);
  });

  const groups = await listAll<DeckGroupRecord>(GROUPS_STORE);
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const decks = await listAll<DeckRecord>(DECKS_STORE);
  const deckMap = new Map(decks.map((deck) => [deck.id, deck]));

  const usage: DeckUsageLocation[] = [];
  entries.forEach((entry) => {
    const set = setMap.get(entry.setId);
    if (!set) return;
    const group = groupMap.get(set.groupId);
    const deck = deckMap.get(set.deckId);
    if (!group || !deck) return;
    usage.push({
      deckId: deck.id,
      deckTitle: deck.title,
      groupId: group.id,
      groupTitle: group.title,
      setId: set.id,
      setTitle: set.title,
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
