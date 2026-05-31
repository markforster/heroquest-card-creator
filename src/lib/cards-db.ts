"use client";

import type { CardRecord, CardStatus } from "@/types/cards-db";
import type { DeckEntryRecord, DeckGroupRecord, DeckRecord, DeckSetRecord } from "@/types/decks-db";
import type { TemplateId } from "@/types/templates";

import { enqueueDbEstimateChange } from "@/lib/indexeddb-size-tracker";
import {
  createCardDeleteConfirmRequiredError,
  type DeckUsageLocation,
  type CardDeleteMode,
  type CardDeleteUsageReport,
} from "@/lib/decks-errors";
import { previewDeletePairsForFaces, deletePairsForFaces } from "@/lib/pairs-service";
import { openHqccDb } from "./hqcc-db";

import { generateId } from ".";

import type { HqccDb } from "./hqcc-db";

const DECKS_STORE = "decks";
const DECK_GROUPS_STORE = "deckGroups";
const DECK_SETS_STORE = "deckSets";
const DECK_ENTRIES_STORE = "deckEntries";

async function getCardsStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db: HqccDb = await openHqccDb();
  const tx = db.transaction("cards", mode);
  return tx.objectStore("cards");
}

async function repairThumbnailBlob(record: CardRecord): Promise<void> {
  if (!record.thumbnailBlob) return;
  const normalized = normalizeThumbnailBlob(record.thumbnailBlob);
  if (normalized === record.thumbnailBlob) return;
  try {
    const store = await getCardsStore("readwrite");
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        ...record,
        thumbnailBlob: normalized,
      });
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to repair thumbnail blob"));
    });
  } catch {
    // Ignore repair failures.
  }
}

function normalizeThumbnailBlob(blob?: Blob | null): Blob | null | undefined {
  if (!blob) return blob;
  if (blob.type) return blob;
  try {
    return new Blob([blob], { type: "image/png" });
  } catch {
    return blob;
  }
}

function normalizeCardRecord(record: CardRecord): CardRecord {
  if (!record.thumbnailBlob) {
    return record;
  }
  const normalized = normalizeThumbnailBlob(record.thumbnailBlob);
  if (normalized === record.thumbnailBlob) {
    return record;
  }
  void repairThumbnailBlob(record);
  return {
    ...record,
    thumbnailBlob: normalized,
  };
}

export async function createCard(
  input: Omit<CardRecord, "id" | "createdAt" | "updatedAt" | "nameLower" | "schemaVersion"> & {
    id?: string;
    createdAt?: number;
    updatedAt?: number;
    nameLower?: string;
    schemaVersion?: 1 | 2;
  },
): Promise<CardRecord> {
  const now = Date.now();
  const createdAt = input.createdAt ?? now;
  const updatedAt = input.updatedAt ?? createdAt;
  const id = input.id ?? generateId();
  const normalizedThumbnail = normalizeThumbnailBlob(input.thumbnailBlob);
  const base: CardRecord = {
    ...input,
    ...(normalizedThumbnail !== input.thumbnailBlob
      ? { thumbnailBlob: normalizedThumbnail }
      : {}),
    id,
    createdAt,
    updatedAt,
    nameLower: input.nameLower ?? input.name.toLocaleLowerCase(),
    schemaVersion: input.schemaVersion ?? 2,
  };

  const store = await getCardsStore("readwrite");

  await new Promise<void>((resolve, reject) => {
    const request = store.add(base);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to create card"));
  });
  enqueueDbEstimateChange("cards", base.id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
  }

  return base;
}

export async function updateCard(
  id: string,
  patch: Partial<Omit<CardRecord, "id" | "createdAt" | "schemaVersion">>,
): Promise<CardRecord | null> {
  const store = await getCardsStore("readwrite");
  const normalizedPatch =
    "thumbnailBlob" in patch
      ? {
          ...patch,
          thumbnailBlob: normalizeThumbnailBlob(patch.thumbnailBlob ?? null),
        }
      : patch;

  const existing = await new Promise<CardRecord | null>((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      resolve((getRequest.result as CardRecord | undefined) ?? null);
    };
    getRequest.onerror = () => {
      reject(getRequest.error ?? new Error("Failed to load card for update"));
    };
  });

  if (!existing) {
    return null;
  }

  const now = Date.now();
  const next: CardRecord = {
    ...existing,
    ...normalizedPatch,
    updatedAt: now,
  };

  if (normalizedPatch.name) {
    next.nameLower = normalizedPatch.name.toLocaleLowerCase();
  }

  await new Promise<void>((resolve, reject) => {
    const putRequest = store.put(next);
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error ?? new Error("Failed to update card"));
  });
  enqueueDbEstimateChange("cards", next.id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
  }

  return next;
}

export async function updateCards(
  ids: string[],
  patch: Partial<Omit<CardRecord, "id" | "createdAt" | "schemaVersion">>,
): Promise<void> {
  if (!ids.length) return;
  const store = await getCardsStore("readwrite");
  const normalizedPatch =
    "thumbnailBlob" in patch
      ? {
          ...patch,
          thumbnailBlob: normalizeThumbnailBlob(patch.thumbnailBlob ?? null),
        }
      : patch;

  await new Promise<void>((resolve, reject) => {
    let remaining = ids.length;
    let failed = false;

    ids.forEach((id) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        if (failed) return;
        const existing = getRequest.result as CardRecord | undefined;
        if (!existing) {
          remaining -= 1;
          if (remaining === 0) resolve();
          return;
        }
        const next: CardRecord = {
          ...existing,
          ...normalizedPatch,
          updatedAt: Date.now(),
        };
        if (normalizedPatch.name) {
          next.nameLower = normalizedPatch.name.toLocaleLowerCase();
        }
        const putRequest = store.put(next);
        putRequest.onerror = () => {
          if (failed) return;
          failed = true;
          reject(putRequest.error ?? new Error("Failed to update card"));
        };
        putRequest.onsuccess = () => {
          remaining -= 1;
          if (remaining === 0) resolve();
        };
      };
      getRequest.onerror = () => {
        if (failed) return;
        failed = true;
        reject(getRequest.error ?? new Error("Failed to load card for update"));
      };
    });
  });
  ids.forEach((id) => enqueueDbEstimateChange("cards", id));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
  }
}

export async function getCard(id: string): Promise<CardRecord | null> {
  const store = await getCardsStore("readonly");

  return new Promise<CardRecord | null>((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const record = (request.result as CardRecord | undefined) ?? null;
      resolve(record ? normalizeCardRecord(record) : null);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to load card"));
    };
  });
}

export async function getCardThumbnail(id: string): Promise<Blob | null> {
  const record = await getCard(id);
  if (!record?.thumbnailBlob) {
    return null;
  }
  return normalizeThumbnailBlob(record.thumbnailBlob) ?? null;
}

export async function touchCardLastViewed(
  id: string,
  viewedAt: number = Date.now(),
): Promise<CardRecord | null> {
  const store = await getCardsStore("readwrite");

  const existing = await new Promise<CardRecord | null>((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      resolve((getRequest.result as CardRecord | undefined) ?? null);
    };
    getRequest.onerror = () => {
      reject(getRequest.error ?? new Error("Failed to load card for lastViewed update"));
    };
  });

  if (!existing) {
    return null;
  }

  const next: CardRecord = {
    ...existing,
    lastViewedAt: viewedAt,
  };

  await new Promise<void>((resolve, reject) => {
    const putRequest = store.put(next);
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error ?? new Error("Failed to update card view"));
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
  }

  return normalizeCardRecord(next);
}

export async function updateCardThumbnail(
  id: string,
  thumbnailBlob: Blob | null,
): Promise<boolean> {
  const store = await getCardsStore("readwrite");

  const existing = await new Promise<CardRecord | null>((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      resolve((getRequest.result as CardRecord | undefined) ?? null);
    };
    getRequest.onerror = () => {
      reject(getRequest.error ?? new Error("Failed to load card for thumbnail update"));
    };
  });

  if (!existing) {
    return false;
  }

  const normalized = normalizeThumbnailBlob(thumbnailBlob ?? null);
  const next: CardRecord = {
    ...existing,
    thumbnailBlob: normalized ?? null,
  };

  await new Promise<void>((resolve, reject) => {
    const putRequest = store.put(next);
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () =>
      reject(putRequest.error ?? new Error("Failed to update card thumbnail"));
  });
  enqueueDbEstimateChange("cards", next.id);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
  }

  return true;
}

export type ListCardsFilter = {
  templateId?: TemplateId;
  status?: CardStatus;
  search?: string;
  deleted?: "exclude" | "include" | "only";
};

export async function listCards(filter: ListCardsFilter = {}): Promise<CardRecord[]> {
  const store = await getCardsStore("readonly");

  const { templateId, status, search, deleted = "exclude" } = filter;
  const cards: CardRecord[] = [];

  await new Promise<void>((resolve, reject) => {
    let request: IDBRequest;

    if (templateId && status && store.indexNames.contains("templateId_status")) {
      const index = store.index("templateId_status");
      request = index.openCursor(IDBKeyRange.only([templateId, status]));
    } else if (status && store.indexNames.contains("status")) {
      const index = store.index("status");
      request = index.openCursor(IDBKeyRange.only(status));
    } else if (templateId && store.indexNames.contains("templateId")) {
      const index = store.index("templateId");
      request = index.openCursor(IDBKeyRange.only(templateId));
    } else {
      request = store.openCursor();
    }

    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve();
        return;
      }
      cards.push(normalizeCardRecord(cursor.value as CardRecord));
      cursor.continue();
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to list cards"));
    };
  });

  let filtered = cards;

  if (deleted === "exclude") {
    filtered = filtered.filter((card) => card.deletedAt == null);
  } else if (deleted === "only") {
    filtered = filtered.filter((card) => typeof card.deletedAt === "number");
  }

  if (search) {
    const q = search.toLocaleLowerCase();
    filtered = filtered.filter((card) => card.nameLower.includes(q));
  }

  return filtered;
}

export async function normalizeSelfPairings(): Promise<number> {
  // Pairings are managed in a separate store in current versions.
  return 0;
}

async function listAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openHqccDb();
  if (!db.objectStoreNames.contains(storeName)) return [];
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  if (typeof (store as IDBObjectStore & { getAll?: unknown }).getAll !== "function") {
    return [];
  }
  return new Promise<T[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as T[] | undefined) ?? []);
    request.onerror = () => reject(request.error ?? new Error(`Failed to read ${storeName}`));
  });
}

async function getDeckUsageForBackFaceIds(
  backFaceIds: string[],
): Promise<Array<DeckUsageLocation & { backFaceId: string }>> {
  if (!backFaceIds.length) return [];
  const backIdSet = new Set(backFaceIds);
  const [sets, groups, decks] = await Promise.all([
    listAllFromStore<DeckSetRecord>(DECK_SETS_STORE),
    listAllFromStore<DeckGroupRecord>(DECK_GROUPS_STORE),
    listAllFromStore<DeckRecord>(DECKS_STORE),
  ]);
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const deckMap = new Map(decks.map((deck) => [deck.id, deck]));
  const usage: Array<DeckUsageLocation & { backFaceId: string }> = [];
  sets.forEach((set) => {
    if (!backIdSet.has(set.backFaceId)) return;
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

async function cascadeDeleteDeckDataForBackFaceIds(backFaceIds: string[]): Promise<void> {
  if (!backFaceIds.length) return;
  const backIdSet = new Set(backFaceIds);
  const [sets, groups, entries] = await Promise.all([
    listAllFromStore<DeckSetRecord>(DECK_SETS_STORE),
    listAllFromStore<DeckGroupRecord>(DECK_GROUPS_STORE),
    listAllFromStore<DeckEntryRecord>(DECK_ENTRIES_STORE),
  ]);

  const setsToDelete = sets.filter((set) => backIdSet.has(set.backFaceId));
  if (!setsToDelete.length) return;
  const setIdSet = new Set(setsToDelete.map((set) => set.id));
  const entriesToDelete = entries.filter((entry) => setIdSet.has(entry.setId));
  const touchedDeckIds = new Set(setsToDelete.map((set) => set.deckId));
  const touchedGroupIds = new Set(setsToDelete.map((set) => set.groupId));
  const remainingSets = sets.filter((set) => !setIdSet.has(set.id));
  const remainingGroupIds = new Set(remainingSets.map((set) => set.groupId));
  const groupsToDelete = groups.filter(
    (group) => touchedGroupIds.has(group.id) && !remainingGroupIds.has(group.id),
  );

  const db = await openHqccDb();
  const tx = db.transaction([DECK_ENTRIES_STORE, DECK_SETS_STORE, DECK_GROUPS_STORE], "readwrite");
  const entriesStore = tx.objectStore(DECK_ENTRIES_STORE);
  const setsStore = tx.objectStore(DECK_SETS_STORE);
  const groupsStore = tx.objectStore(DECK_GROUPS_STORE);
  entriesToDelete.forEach((entry) => entriesStore.delete(entry.id));
  setsToDelete.forEach((set) => setsStore.delete(set.id));
  groupsToDelete.forEach((group) => groupsStore.delete(group.id));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to cascade delete deck data"));
    tx.onabort = () => reject(tx.error ?? new Error("Failed to cascade delete deck data"));
  });

  entriesToDelete.forEach((entry) => enqueueDbEstimateChange(DECK_ENTRIES_STORE, entry.id));
  setsToDelete.forEach((set) => enqueueDbEstimateChange(DECK_SETS_STORE, set.id));
  groupsToDelete.forEach((group) => enqueueDbEstimateChange(DECK_GROUPS_STORE, group.id));
  if (touchedDeckIds.size) {
    const deckTx = db.transaction(DECKS_STORE, "readwrite");
    const deckStore = deckTx.objectStore(DECKS_STORE);
    const now = Date.now();
    await Promise.all(
      Array.from(touchedDeckIds).map(
        (deckId) =>
          new Promise<void>((resolve, reject) => {
            const getRequest = deckStore.get(deckId);
            getRequest.onsuccess = () => {
              const deck = (getRequest.result as DeckRecord | undefined) ?? null;
              if (!deck) {
                resolve();
                return;
              }
              const putRequest = deckStore.put({ ...deck, updatedAt: now });
              putRequest.onsuccess = () => resolve();
              putRequest.onerror = () => reject(putRequest.error ?? new Error("Failed to touch deck"));
            };
            getRequest.onerror = () => reject(getRequest.error ?? new Error("Failed to load deck"));
          }),
      ),
    );
    await new Promise<void>((resolve, reject) => {
      deckTx.oncomplete = () => resolve();
      deckTx.onerror = () => reject(deckTx.error ?? new Error("Failed to touch decks"));
      deckTx.onabort = () => reject(deckTx.error ?? new Error("Failed to touch decks"));
    });
    touchedDeckIds.forEach((deckId) => enqueueDbEstimateChange(DECKS_STORE, deckId));
  }
}

export async function softDeleteCards(
  ids: string[],
  deletedAt: number = Date.now(),
): Promise<void> {
  if (!ids.length) return;
  await updateCards(ids, { deletedAt });
}

export async function restoreCards(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await updateCards(ids, { deletedAt: null });
}

export async function deleteCard(id: string): Promise<void> {
  const store = await getCardsStore("readwrite");

  await new Promise<void>((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to delete card"));
  });
  enqueueDbEstimateChange("cards", id);
}

async function deleteCardsRaw(ids: string[]): Promise<void> {
  if (!ids.length) return;

  const store = await getCardsStore("readwrite");

  await new Promise<void>((resolve, reject) => {
    ids.forEach((id) => {
      store.delete(id);
    });

    const tx = store.transaction;
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete cards"));
  });
  ids.forEach((id) => enqueueDbEstimateChange("cards", id));
}

export async function deleteCards(ids: string[]): Promise<void> {
  await deleteCardsRaw(ids);
}

export async function previewDeleteCardsImpact(
  ids: string[],
  mode: CardDeleteMode = "confirmable-cascade",
): Promise<CardDeleteUsageReport> {
  const uniqueIds = Array.from(new Set(ids));
  if (!uniqueIds.length) {
    return {
      cardIds: [],
      mode,
      cascadePlan: {
        cardIds: [],
        deckSetIds: [],
        deckEntryIds: [],
        deletedDeckUsage: [],
        pairUsage: [],
      },
    };
  }

  const deletedDeckUsage = await getDeckUsageForBackFaceIds(uniqueIds);
  let pairReport: Awaited<ReturnType<typeof previewDeletePairsForFaces>>;
  try {
    pairReport = await previewDeletePairsForFaces(uniqueIds, { mode: "confirmable-cascade" });
  } catch {
    pairReport = {
      frontFaceId: "__bulk__",
      backFaceId: "__bulk__",
      mode: "confirmable-cascade",
      cascadePlan: {
        pairIds: [],
        entryIds: [],
        usage: [],
      },
    };
  }
  const deckSetIds = Array.from(new Set(deletedDeckUsage.map((usage) => usage.setId)));
  const pairUsage = pairReport.cascadePlan.usage;

  return {
    cardIds: uniqueIds,
    mode,
    cascadePlan: {
      cardIds: uniqueIds,
      deckSetIds,
      deckEntryIds: pairReport.cascadePlan.entryIds,
      deletedDeckUsage: deletedDeckUsage.map(({ backFaceId: _backFaceId, ...usage }) => usage),
      pairUsage,
    },
  };
}

export async function deleteCardsWithCascade(
  ids: string[],
  options?: {
    mode?: CardDeleteMode;
    confirmCascade?: boolean;
  },
): Promise<void> {
  if (!ids.length) return;
  const mode = options?.mode ?? "confirmable-cascade";
  const confirmCascade = options?.confirmCascade ?? true;
  if (mode === "confirmable-cascade" && confirmCascade) {
    await cascadeDeleteDeckDataForBackFaceIds(ids);
    try {
      const db = await openHqccDb();
      if (db.objectStoreNames.contains("pairs")) {
        await deletePairsForFaces(ids, { mode: "confirmable-cascade", confirmCascade: true });
      }
    } catch {
      // If pair stores are unavailable, continue card deletion.
    }
    await deleteCardsRaw(ids);
    return;
  }
  const impact = await previewDeleteCardsImpact(ids, mode);
  const hasImpact =
    impact.cascadePlan.deckSetIds.length > 0 || impact.cascadePlan.deckEntryIds.length > 0;
  if (hasImpact && mode === "block") {
    throw createCardDeleteConfirmRequiredError(impact);
  }
  if (hasImpact && mode === "confirmable-cascade" && !confirmCascade) {
    throw createCardDeleteConfirmRequiredError(impact);
  }

  await cascadeDeleteDeckDataForBackFaceIds(ids);
  if (impact.cascadePlan.deckEntryIds.length > 0 || impact.cascadePlan.pairUsage.length > 0) {
    try {
      await deletePairsForFaces(ids, { mode: "confirmable-cascade", confirmCascade: true });
    } catch {
      // If pair stores are unavailable, continue card deletion.
    }
  }
  await deleteCardsRaw(ids);
}
