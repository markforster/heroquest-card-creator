"use client";

import {
  assembleNormalizedCardSummaryRecord,
  assembleNormalizedCardRecord,
  deleteNormalizedCardRecords,
  replaceNormalizedCardRecords,
  replaceNormalizedCardThumbnail,
  touchNormalizedCardBaseLastViewed,
} from "@/lib/cards-normalized";
import type { CardRecord, CardStatus } from "@/types/cards-db";
import type { DeckEntryRecord, DeckGroupRecord, DeckRecord, DeckSetRecord } from "@/types/decks-db";
import type { CardThumbnailRecord } from "@/types/cards-normalized";
import type { TemplateId } from "@/types/templates";
import type { Table, Transaction } from "dexie";

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

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

async function loadComponentRecords<T extends { id: string }>(
  table: Pick<Table<T, string>, "bulkGet">,
  ids: string[],
): Promise<T[]> {
  if (!ids.length) {
    return [];
  }

  const records = await table.bulkGet(ids);
  return records.filter(isDefined);
}

function dispatchCardsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
  }
}

async function repairThumbnailBlob(cardId: string, record: CardRecord): Promise<void> {
  if (!record.thumbnailBlob) return;
  const normalized = normalizeThumbnailBlob(record.thumbnailBlob);
  if (normalized === record.thumbnailBlob) return;
  try {
    const db = await openHqccDexieDb();
    const existing = await db.cardThumbnails.get(cardId);
    if (!existing || !(normalized instanceof Blob)) {
      return;
    }
    await db.cardThumbnails.put({
      ...existing,
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
  void repairThumbnailBlob(record.id, record);
  return {
    ...record,
    thumbnailBlob: normalized,
  };
}

async function getNormalizedThumbnailBlob(
  id: string,
  db: Awaited<ReturnType<typeof openHqccDexieDb>>,
): Promise<Blob | null> {
  const thumbnail = (await db.cardThumbnails.get(id)) as CardThumbnailRecord | undefined;
  if (!thumbnail?.thumbnailBlob) {
    return null;
  }

  return normalizeThumbnailBlob(thumbnail.thumbnailBlob as Blob) ?? null;
}

async function getNormalizedCardRecord(
  id: string,
  dbArg?: Awaited<ReturnType<typeof openHqccDexieDb>>,
): Promise<CardRecord | null> {
  const db = dbArg ?? (await openHqccDexieDb());
  const baseRecord = await db.cardsBase.get(id);
  if (!baseRecord) {
    return null;
  }

  const [slotLinks, thumbnailBlob] = await Promise.all([
    db.cardSlotLinks.where("cardId").equals(id).sortBy("order"),
    getNormalizedThumbnailBlob(id, db),
  ]);

  if (!slotLinks.length) {
    return null;
  }

  const backgroundIds = slotLinks
    .filter((slotLink) => slotLink.slotType === "background")
    .map((slotLink) => slotLink.dataRecordId);
  const borderIds = slotLinks
    .filter((slotLink) => slotLink.slotType === "border")
    .map((slotLink) => slotLink.dataRecordId);
  const titleIds = slotLinks
    .filter((slotLink) => slotLink.slotType === "title")
    .map((slotLink) => slotLink.dataRecordId);
  const textIds = slotLinks
    .filter((slotLink) => slotLink.slotType === "text")
    .map((slotLink) => slotLink.dataRecordId);
  const copyrightIds = slotLinks
    .filter((slotLink) => slotLink.slotType === "copyright")
    .map((slotLink) => slotLink.dataRecordId);
  const imageIds = slotLinks
    .filter((slotLink) => slotLink.slotType === "image")
    .map((slotLink) => slotLink.dataRecordId);
  const iconIds = slotLinks
    .filter((slotLink) => slotLink.slotType === "icon")
    .map((slotLink) => slotLink.dataRecordId);
  const heroStatsIds = slotLinks
    .filter((slotLink) => slotLink.slotType === "stats-hero")
    .map((slotLink) => slotLink.dataRecordId);
  const monsterStatsIds = slotLinks
    .filter((slotLink) => slotLink.slotType === "stats-monster")
    .map((slotLink) => slotLink.dataRecordId);

  const [
    backgrounds,
    borders,
    titles,
    texts,
    copyrights,
    images,
    icons,
    heroStats,
    monsterStats,
  ] = await Promise.all([
    loadComponentRecords(db.cardBackgroundComponents, backgroundIds),
    loadComponentRecords(db.cardBorderComponents, borderIds),
    loadComponentRecords(db.cardTitleComponents, titleIds),
    loadComponentRecords(db.cardTextComponents, textIds),
    loadComponentRecords(db.cardCopyrightComponents, copyrightIds),
    loadComponentRecords(db.cardImageComponents, imageIds),
    loadComponentRecords(db.cardIconComponents, iconIds),
    loadComponentRecords(db.cardHeroStatsComponents, heroStatsIds),
    loadComponentRecords(db.cardMonsterStatsComponents, monsterStatsIds),
  ]);

  const assembled = assembleNormalizedCardRecord({
    baseRecord,
    slotLinks,
    backgrounds,
    borders,
    titles,
    texts,
    copyrights,
    images,
    icons,
    heroStats,
    monsterStats,
    thumbnailBlob,
  });

  return assembled ? normalizeCardRecord(assembled) : null;
}

async function listNormalizedCardRecords(
  dbArg?: Awaited<ReturnType<typeof openHqccDexieDb>>,
): Promise<CardRecord[]> {
  const db = dbArg ?? (await openHqccDexieDb());
  const [baseRecords, thumbnailRecords] = await Promise.all([
    db.cardsBase.toArray(),
    db.cardThumbnails.toArray(),
  ]);
  const thumbnailMap = new Map(
    thumbnailRecords.map((record) => [
      record.cardId,
      normalizeThumbnailBlob(record.thumbnailBlob) ?? null,
    ]),
  );

  return baseRecords.map((baseRecord) =>
    normalizeCardRecord(
      assembleNormalizedCardSummaryRecord({
        baseRecord,
        thumbnailBlob: thumbnailMap.get(baseRecord.id) ?? undefined,
      }),
    ),
  );
}

async function writeCardAndNormalizedState(
  db: Awaited<ReturnType<typeof openHqccDexieDb>>,
  record: CardRecord,
): Promise<void> {
  const writeTables = [
    db.cardsBase,
    db.cardThumbnails,
    db.cardSlotLinks,
    db.cardBackgroundComponents,
    db.cardBorderComponents,
    db.cardTitleComponents,
    db.cardTextComponents,
    db.cardCopyrightComponents,
    db.cardImageComponents,
    db.cardIconComponents,
    db.cardHeroStatsComponents,
    db.cardMonsterStatsComponents,
  ];
  await db.transaction(
    "rw",
    writeTables,
    async (tx: Transaction) => {
      const normalized = await replaceNormalizedCardRecords(tx, record);
      if (!normalized) {
        throw new Error(`Unable to derive normalized card rows for ${record.id}`);
      }
      await replaceNormalizedCardThumbnail(tx, record);
    },
  );
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
  await writeCardAndNormalizedState(db, base);
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

  const existing = await getNormalizedCardRecord(id, db);

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

  await writeCardAndNormalizedState(db, next);
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

  const existingCards = await Promise.all(ids.map((id) => getNormalizedCardRecord(id, db)));
  const updates: CardRecord[] = [];
  const now = Date.now();

  existingCards.forEach((existing) => {
    if (!existing) {
      return;
    }

    const next: CardRecord = {
      ...existing,
      ...normalizedPatch,
      updatedAt: now,
    };
    if (normalizedPatch.name) {
      next.nameLower = normalizedPatch.name.toLocaleLowerCase();
    }
    updates.push(next);
  });

  if (updates.length > 0) {
    for (let index = 0; index < updates.length; index += 1) {
      await writeCardAndNormalizedState(db, updates[index]);
    }
  }
  ids.forEach((id) => enqueueDbEstimateChange("cards", id));
  dispatchCardsUpdated();
}

export async function getCard(id: string): Promise<CardRecord | null> {
  return getNormalizedCardRecord(id);
}

export async function getCardThumbnail(id: string): Promise<Blob | null> {
  const db = await openHqccDexieDb();
  return getNormalizedThumbnailBlob(id, db);
}

export async function touchCardLastViewed(
  id: string,
  viewedAt: number = Date.now(),
): Promise<CardRecord | null> {
  const db = await openHqccDexieDb();
  const existing = await getNormalizedCardRecord(id, db);

  if (!existing) {
    return null;
  }

  const next: CardRecord = {
    ...existing,
    lastViewedAt: viewedAt,
  };

  await db.transaction("rw", db.cardsBase, async (tx) => {
    await touchNormalizedCardBaseLastViewed(tx, id, viewedAt);
  });
  dispatchCardsUpdated();

  return next;
}

export async function updateCardThumbnail(
  id: string,
  thumbnailBlob: Blob | null,
): Promise<boolean> {
  const db = await openHqccDexieDb();

  const existing = await db.cardsBase.get(id);

  if (!existing) {
    return false;
  }

  const normalized = normalizeThumbnailBlob(thumbnailBlob ?? null);
  await db.transaction("rw", db.cardThumbnails, async () => {
    if (!(normalized instanceof Blob)) {
      await db.cardThumbnails.delete(id);
      return;
    }

    const current = await db.cardThumbnails.get(id);
    await db.cardThumbnails.put({
      id,
      cardId: id,
      thumbnailBlob: normalized,
      createdAt: current?.createdAt ?? existing.createdAt,
      updatedAt: Date.now(),
      schemaVersion: 1,
    });
  });
  enqueueDbEstimateChange("cards", id);
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
  const { templateId, status, search, deleted = "exclude" } = filter;
  let filtered = await listNormalizedCardRecords();

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
  await db.transaction(
    "rw",
    [
      db.cardsBase,
      db.cardThumbnails,
      db.cardSlotLinks,
      db.cardBackgroundComponents,
      db.cardBorderComponents,
      db.cardTitleComponents,
      db.cardTextComponents,
      db.cardCopyrightComponents,
      db.cardImageComponents,
      db.cardIconComponents,
      db.cardHeroStatsComponents,
      db.cardMonsterStatsComponents,
    ],
    async (tx) => {
      await deleteNormalizedCardRecords(tx, id);
    },
  );
  enqueueDbEstimateChange("cards", id);
}

async function deleteCardsRaw(ids: string[]): Promise<void> {
  if (!ids.length) return;

  const db = await openHqccDexieDb();

  await db.transaction(
    "rw",
    [
      db.cardsBase,
      db.cardThumbnails,
      db.cardSlotLinks,
      db.cardBackgroundComponents,
      db.cardBorderComponents,
      db.cardTitleComponents,
      db.cardTextComponents,
      db.cardCopyrightComponents,
      db.cardImageComponents,
      db.cardIconComponents,
      db.cardHeroStatsComponents,
      db.cardMonsterStatsComponents,
    ],
    async (tx) => {
      for (let index = 0; index < ids.length; index += 1) {
        await deleteNormalizedCardRecords(tx, ids[index]);
      }
    },
  );
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
