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

export type DeckPdfExportSummary = {
  includedSetCount: number;
  excludedSetCount: number;
  totalEntryQuantity: number;
  frontFaceCount: number;
  backFaceCount: number;
  totalFaceCount: number;
  excludedSets: DeckPdfExcludedSet[];
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
  const [sets, cards] = await Promise.all([
    apiClient.listDeckSets({ params: { deckId } }),
    apiClient.listCards(),
  ]);

  const cardTitleById = new Map(cards.map((card) => [card.id, card.name || card.title || card.id]));
  const entriesBySet = await Promise.all(
    sets.map(async (set) => ({
      set,
      entries: await apiClient.listDeckEntries({ params: { setId: set.id } }),
    })),
  );

  const included = entriesBySet.filter(({ entries }) => entries.length > 0);
  const excluded = entriesBySet.filter(({ entries }) => entries.length === 0);
  const totalEntryQuantity = included.reduce(
    (sum, { entries }) =>
      sum +
      entries.reduce((entrySum, entry) => entrySum + Math.max(1, entry.count ?? 1), 0),
    0,
  );
  const frontFaceCount = totalEntryQuantity;
  const backFaceCount = mode === "frontAndBack" ? totalEntryQuantity : 0;
  const totalFaceCount = frontFaceCount + backFaceCount;

  return {
    includedSetCount: included.length,
    excludedSetCount: excluded.length,
    totalEntryQuantity,
    frontFaceCount,
    backFaceCount,
    totalFaceCount,
    excludedSets: excluded.map(({ set }) => ({
      setId: set.id,
      setTitle: set.title ?? cardTitleById.get(set.backFaceId) ?? set.id,
      backFaceId: set.backFaceId ?? null,
    })),
  };
}
