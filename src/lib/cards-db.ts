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
import { openHqccDexieDb } from "./hqcc-dexie";

import { generateId } from ".";

const DECKS_STORE = "decks";
const DECK_GROUPS_STORE = "deckGroups";
const DECK_SETS_STORE = "deckSets";
const DECK_ENTRIES_STORE = "deckEntries";

function dispatchCardsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
  }
}

async function repairThumbnailBlob(record: CardRecord): Promise<void> {
  if (!record.thumbnailBlob) return;
  const normalized = normalizeThumbnailBlob(record.thumbnailBlob);
  if (normalized === record.thumbnailBlob) return;
  try {
    const db = await openHqccDexieDb();
    await db.cards.put({
      ...record,
      thumbnailBlob: normalized,
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

  const db = await openHqccDexieDb();
  await db.cards.add(base);
  enqueueDbEstimateChange("cards", base.id);
  dispatchCardsUpdated();

  return base;
}

export async function updateCard(
  id: string,
  patch: Partial<Omit<CardRecord, "id" | "createdAt" | "schemaVersion">>,
): Promise<CardRecord | null> {
  const db = await openHqccDexieDb();
  const normalizedPatch =
    "thumbnailBlob" in patch
      ? {
          ...patch,
          thumbnailBlob: normalizeThumbnailBlob(patch.thumbnailBlob ?? null),
        }
      : patch;

  const existing = (await db.cards.get(id)) ?? null;

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

  await db.cards.put(next);
  enqueueDbEstimateChange("cards", next.id);
  dispatchCardsUpdated();

  return next;
}

export async function updateCards(
  ids: string[],
  patch: Partial<Omit<CardRecord, "id" | "createdAt" | "schemaVersion">>,
): Promise<void> {
  if (!ids.length) return;
  const db = await openHqccDexieDb();
  const normalizedPatch =
    "thumbnailBlob" in patch
      ? {
          ...patch,
          thumbnailBlob: normalizeThumbnailBlob(patch.thumbnailBlob ?? null),
        }
      : patch;

  await db.transaction("rw", db.cards, async () => {
    const existingCards = await db.cards.bulkGet(ids);
    const updates: CardRecord[] = [];

    existingCards.forEach((existing) => {
      if (!existing) {
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
      updates.push(next);
    });

    if (updates.length > 0) {
      await db.cards.bulkPut(updates);
    }
  });
  ids.forEach((id) => enqueueDbEstimateChange("cards", id));
  dispatchCardsUpdated();
}

export async function getCard(id: string): Promise<CardRecord | null> {
  const db = await openHqccDexieDb();
  const record = (await db.cards.get(id)) ?? null;
  return record ? normalizeCardRecord(record) : null;
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
  const db = await openHqccDexieDb();

  const existing = (await db.cards.get(id)) ?? null;

  if (!existing) {
    return null;
  }

  const next: CardRecord = {
    ...existing,
    lastViewedAt: viewedAt,
  };

  await db.cards.put(next);
  dispatchCardsUpdated();

  return normalizeCardRecord(next);
}

export async function updateCardThumbnail(
  id: string,
  thumbnailBlob: Blob | null,
): Promise<boolean> {
  const db = await openHqccDexieDb();

  const existing = (await db.cards.get(id)) ?? null;

  if (!existing) {
    return false;
  }

  const normalized = normalizeThumbnailBlob(thumbnailBlob ?? null);
  const next: CardRecord = {
    ...existing,
    thumbnailBlob: normalized ?? null,
  };

  await db.cards.put(next);
  enqueueDbEstimateChange("cards", next.id);
  dispatchCardsUpdated();

  return true;
}

export type ListCardsFilter = {
  templateId?: TemplateId;
  status?: CardStatus;
  search?: string;
  deleted?: "exclude" | "include" | "only";
};

export async function listCards(filter: ListCardsFilter = {}): Promise<CardRecord[]> {
  const db = await openHqccDexieDb();

  const { templateId, status, search, deleted = "exclude" } = filter;
  let filtered = (await db.cards.toArray()).map(normalizeCardRecord);

  if (templateId) {
    filtered = filtered.filter((card) => card.templateId === templateId);
  }

  if (status) {
    filtered = filtered.filter((card) => card.status === status);
  }

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

async function getDeckUsageForBackFaceIds(
  backFaceIds: string[],
): Promise<Array<DeckUsageLocation & { backFaceId: string }>> {
  if (!backFaceIds.length) return [];
  const backIdSet = new Set(backFaceIds);
  const db = await openHqccDexieDb();
  const [sets, groups, decks] = await Promise.all([
    db.deckSets.toArray(),
    db.deckGroups.toArray(),
    db.decks.toArray(),
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
  const db = await openHqccDexieDb();
  const [sets, groups, entries] = await Promise.all([
    db.deckSets.toArray(),
    db.deckGroups.toArray(),
    db.deckEntries.toArray(),
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

  await db.transaction("rw", db.deckEntries, db.deckSets, db.deckGroups, async () => {
    await db.deckEntries.bulkDelete(entriesToDelete.map((entry) => entry.id));
    await db.deckSets.bulkDelete(setsToDelete.map((set) => set.id));
    await db.deckGroups.bulkDelete(groupsToDelete.map((group) => group.id));
  });

  entriesToDelete.forEach((entry) => enqueueDbEstimateChange(DECK_ENTRIES_STORE, entry.id));
  setsToDelete.forEach((set) => enqueueDbEstimateChange(DECK_SETS_STORE, set.id));
  groupsToDelete.forEach((group) => enqueueDbEstimateChange(DECK_GROUPS_STORE, group.id));
  if (touchedDeckIds.size) {
    await db.transaction("rw", db.decks, async () => {
      const now = Date.now();
      const decks = (await db.decks.bulkGet(Array.from(touchedDeckIds))).filter(
        (deck): deck is DeckRecord => Boolean(deck),
      );
      if (!decks.length) {
        return;
      }
      await db.decks.bulkPut(
        decks.map((deck) => ({
          ...deck,
          updatedAt: now,
        })),
      );
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
  const db = await openHqccDexieDb();
  await db.cards.delete(id);
  enqueueDbEstimateChange("cards", id);
}

async function deleteCardsRaw(ids: string[]): Promise<void> {
  if (!ids.length) return;

  const db = await openHqccDexieDb();

  await db.transaction("rw", db.cards, async () => {
    await db.cards.bulkDelete(ids);
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
      await deletePairsForFaces(ids, { mode: "confirmable-cascade", confirmCascade: true });
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
