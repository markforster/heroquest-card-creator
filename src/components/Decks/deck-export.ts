"use client";

import { apiClient } from "@/api/client";
import { listPairsMap } from "@/components/Decks/deck-preview";

export type DeckExportFaceIdsResult = {
  faceIds: string[];
  setCount: number;
  backCount: number;
  frontCount: number;
  totalCount: number;
};

export type DeckPdfExcludedSet = {
  setId: string;
  setTitle: string;
  backFaceId: string | null;
};

export type DeckPdfSetScopeMode = "complete" | "all" | "selected";

export type DeckPdfSetMeta = {
  setId: string;
  setTitle: string;
  backFaceId: string | null;
  hasEntries: boolean;
  entryCount: number;
};

export type DeckPdfRunData = {
  sets: DeckPdfSetMeta[];
  selectedSetIds: string[];
  slotPairs: {
    slotId: string;
    frontId: string | null;
    backId: string | null;
  }[];
};

export type DeckPdfExportSummary = {
  totalSetCount: number;
  includedSetCount: number;
  includedEmptySetCount: number;
  excludedEmptySetCount: number;
  excludedNonEmptySetCount: number;
  totalEntryQuantity: number;
  exportSlotQuantity: number;
  frontFaceCount: number;
  backFaceCount: number;
  totalFaceCount: number;
  sets: DeckPdfSetMeta[];
};

export async function resolveDeckExportFaceIds(deckId: string): Promise<DeckExportFaceIdsResult> {
  const [sets, pairMap] = await Promise.all([
    apiClient.listDeckSets({ params: { deckId } }),
    listPairsMap(),
  ]);

  const orderedSets = [...sets].sort((a, b) => {
    if (a.groupId !== b.groupId) return a.groupId.localeCompare(b.groupId);
    return a.sortIndex - b.sortIndex;
  });

  const seen = new Set<string>();
  const faceIds: string[] = [];

  orderedSets.forEach((set) => {
    if (!set.backFaceId) return;
    if (seen.has(set.backFaceId)) return;
    seen.add(set.backFaceId);
    faceIds.push(set.backFaceId);
  });

  for (const set of orderedSets) {
    const entries = await apiClient.listDeckEntries({ params: { setId: set.id } });
    const orderedEntries = [...entries].sort((a, b) => a.sortIndex - b.sortIndex);
    orderedEntries.forEach((entry) => {
      const frontId = pairMap.get(entry.pairId)?.frontFaceId;
      if (!frontId || seen.has(frontId)) return;
      seen.add(frontId);
      faceIds.push(frontId);
    });
  }

  const backIds = new Set<string>();
  const frontIds = new Set<string>();
  orderedSets.forEach((set) => {
    if (set.backFaceId && seen.has(set.backFaceId)) backIds.add(set.backFaceId);
  });
  faceIds.forEach((id) => {
    if (!backIds.has(id)) frontIds.add(id);
  });

  return {
    faceIds,
    setCount: orderedSets.length,
    backCount: backIds.size,
    frontCount: frontIds.size,
    totalCount: faceIds.length,
  };
}

export async function resolveDeckPdfExportSummary(
  deckId: string,
  mode: "frontsOnly" | "frontAndBack",
): Promise<DeckPdfExportSummary> {
  const runData = await resolveDeckPdfRunData(deckId, mode, "complete", []);
  return summarizeDeckPdfRunData(runData, mode, "complete", new Set(runData.selectedSetIds));
}

export function createDeckPdfPlaceholderFrontId(setId: string): string {
  return `deck-empty-front:${setId}`;
}

export function parseDeckPdfPlaceholderFrontId(faceId: string): { setId: string } | null {
  const prefix = "deck-empty-front:";
  if (!faceId.startsWith(prefix)) return null;
  const setId = faceId.slice(prefix.length);
  if (!setId) return null;
  return { setId };
}

export function summarizeDeckPdfRunData(
  runData: DeckPdfRunData,
  mode: "frontsOnly" | "frontAndBack",
  scopeMode: DeckPdfSetScopeMode,
  selectedSetIds: Set<string>,
): DeckPdfExportSummary {
  const includedSets = runData.sets.filter((set) => {
    if (scopeMode === "all") return true;
    if (scopeMode === "complete") return set.hasEntries;
    return selectedSetIds.has(set.setId);
  });
  const excludedSets = runData.sets.filter((set) => !includedSets.some((included) => included.setId === set.setId));
  const includedEmptySetCount = includedSets.filter((set) => !set.hasEntries).length;
  const excludedEmptySetCount = excludedSets.filter((set) => !set.hasEntries).length;
  const excludedNonEmptySetCount = excludedSets.filter((set) => set.hasEntries).length;

  const exportSlotQuantity = runData.slotPairs.length;
  const totalEntryQuantity = runData.slotPairs.reduce((sum, slot) => {
    return parseDeckPdfPlaceholderFrontId(slot.frontId ?? "") ? sum : sum + 1;
  }, 0);
  const frontFaceCount = totalEntryQuantity;
  const backFaceCount = mode === "frontAndBack" ? includedSets.length : 0;
  const totalFaceCount = frontFaceCount + backFaceCount;
  return {
    totalSetCount: runData.sets.length,
    includedSetCount: includedSets.length,
    includedEmptySetCount,
    excludedEmptySetCount,
    excludedNonEmptySetCount,
    totalEntryQuantity,
    exportSlotQuantity,
    frontFaceCount,
    backFaceCount,
    totalFaceCount,
    sets: runData.sets,
  };
}

export async function resolveDeckPdfRunData(
  deckId: string,
  mode: "frontsOnly" | "frontAndBack",
  scopeMode: DeckPdfSetScopeMode,
  selectedSetIds: string[],
): Promise<DeckPdfRunData> {
  const [sets, cards] = await Promise.all([
    apiClient.listDeckSets({ params: { deckId } }),
    apiClient.listCards(),
  ]);

  const cardTitleById = new Map(cards.map((card) => [card.id, card.name || card.title || card.id]));
  const pairMap = await listPairsMap();
  const entriesBySet = await Promise.all(
    sets.map(async (set) => ({
      set,
      entries: (await apiClient.listDeckEntries({ params: { setId: set.id } })).sort(
        (a, b) => a.sortIndex - b.sortIndex,
      ),
    })),
  );
  const setMeta: DeckPdfSetMeta[] = entriesBySet.map(({ set, entries }) => ({
    setId: set.id,
    setTitle: set.title ?? cardTitleById.get(set.backFaceId) ?? set.id,
    backFaceId: set.backFaceId ?? null,
    hasEntries: entries.length > 0,
    entryCount: entries.length,
  }));
  const selected = new Set(selectedSetIds);
  const effectiveSetMeta = setMeta.filter((set) => {
    if (scopeMode === "all") return true;
    if (scopeMode === "complete") return set.hasEntries;
    return selected.has(set.setId);
  });
  const includeEmptyPlaceholders = scopeMode === "all" || scopeMode === "selected";
  const slotPairs: DeckPdfRunData["slotPairs"] = [];
  for (const set of effectiveSetMeta) {
    const setEntries = entriesBySet.find((row) => row.set.id === set.setId)?.entries ?? [];
    if (!setEntries.length) {
      if (includeEmptyPlaceholders) {
        slotPairs.push({
          slotId: `${set.setId}:empty:0`,
          frontId: createDeckPdfPlaceholderFrontId(set.setId),
          backId: mode === "frontAndBack" ? set.backFaceId : null,
        });
      }
      continue;
    }
    for (const entry of setEntries) {
      const frontId = pairMap.get(entry.pairId)?.frontFaceId ?? null;
      if (!frontId) continue;
      const count = Math.max(1, entry.count ?? 1);
      for (let copyIndex = 0; copyIndex < count; copyIndex += 1) {
        slotPairs.push({
          slotId: `${set.setId}:${entry.id}:${copyIndex}`,
          frontId,
          backId: mode === "frontAndBack" ? set.backFaceId : null,
        });
      }
    }
  }

  return { sets: setMeta, selectedSetIds, slotPairs };
}
