"use client";

import { apiClient } from "@/api/client";
import type { DeckRecord, DeckSetRecord } from "@/api/decks";
import type { PairRecord } from "@/api/pairs";

function buildVisualPrioritySlotOrder(count: number): number[] {
  if (count <= 0) return [];
  const order: number[] = [];

  if (count % 2 === 1) {
    const center = Math.floor(count / 2);
    order.push(center);
    for (let step = 1; order.length < count; step += 1) {
      const right = center + step;
      const left = center - step;
      if (right < count) order.push(right);
      if (left >= 0) order.push(left);
    }
    return order;
  }

  const rightMiddle = count / 2;
  const leftMiddle = rightMiddle - 1;
  order.push(rightMiddle, leftMiddle);
  for (let step = 1; order.length < count; step += 1) {
    const right = rightMiddle + step;
    const left = leftMiddle - step;
    if (right < count) order.push(right);
    if (left >= 0) order.push(left);
  }
  return order;
}

function placeDeckPreviewIds(backIds: string[], frontIds: string[], maxCount: number): string[] {
  const candidateIds = [...backIds, ...frontIds].slice(0, maxCount);
  const slotOrder = buildVisualPrioritySlotOrder(candidateIds.length);
  const slots = new Array<string>(candidateIds.length);
  for (let index = 0; index < candidateIds.length; index += 1) {
    slots[slotOrder[index]] = candidateIds[index];
  }
  return slots;
}

async function buildDeckPreview(
  deck: DeckRecord,
  pairMap: Map<string, PairRecord>,
  previewFanCount: number,
): Promise<string[]> {
  const groupsData = await apiClient.listDeckGroups({ params: { deckId: deck.id } });
  const setsData = await apiClient.listDeckSets({ params: { deckId: deck.id } });
  const setsByGroup = new Map<string, DeckSetRecord[]>();
  setsData.forEach((set) => {
    const list = setsByGroup.get(set.groupId) ?? [];
    list.push(set);
    setsByGroup.set(set.groupId, list);
  });
  setsByGroup.forEach((list, key) => {
    list.sort((a, b) => a.sortIndex - b.sortIndex);
    setsByGroup.set(key, list);
  });

  const orderedGroups = [...groupsData].sort((a, b) => a.sortIndex - b.sortIndex);
  const backIds: string[] = [];
  const frontIds: string[] = [];
  const seen = new Set<string>();

  for (const group of orderedGroups) {
    const groupSets = setsByGroup.get(group.id) ?? [];
    for (const set of groupSets) {
      if (!seen.has(set.backFaceId)) {
        backIds.push(set.backFaceId);
        seen.add(set.backFaceId);
      }
      if (backIds.length >= previewFanCount) break;
    }
    if (backIds.length >= previewFanCount) break;
  }

  for (const group of orderedGroups) {
    if (backIds.length + frontIds.length >= previewFanCount) break;
    const groupSets = setsByGroup.get(group.id) ?? [];
    for (const set of groupSets) {
      if (backIds.length + frontIds.length >= previewFanCount) break;
      const setEntries = await apiClient.listDeckEntries({ params: { setId: set.id } });
      const orderedEntries = [...setEntries].sort((a, b) => a.sortIndex - b.sortIndex);
      for (const entry of orderedEntries) {
        const pair = pairMap.get(entry.pairId);
        if (!pair?.frontFaceId) continue;
        if (seen.has(pair.frontFaceId)) continue;
        frontIds.push(pair.frontFaceId);
        seen.add(pair.frontFaceId);
        if (backIds.length + frontIds.length >= previewFanCount) break;
      }
    }
  }

  return placeDeckPreviewIds(backIds, frontIds, previewFanCount);
}

export async function listPairsMap(): Promise<Map<string, PairRecord>> {
  const pairs = await apiClient.listPairs();
  const map = new Map<string, PairRecord>();
  pairs.forEach((pair) => map.set(pair.id, pair));
  return map;
}

export async function resolveDeckPreviewIds(options: {
  deckId: string;
  maxCount: number;
  pairMap?: Map<string, PairRecord>;
}): Promise<string[]> {
  const { deckId, maxCount, pairMap } = options;
  const deck = await apiClient.getDeck({ params: { deckId } });
  if (!deck) return [];
  const pairsById = pairMap ?? (await listPairsMap());
  return buildDeckPreview(deck, pairsById, maxCount);
}

export async function resolveDeckPreviewMap(options: {
  decks: DeckRecord[];
  maxCount: number;
  pairMap?: Map<string, PairRecord>;
}): Promise<Record<string, string[]>> {
  const { decks, maxCount, pairMap } = options;
  const pairsById = pairMap ?? (await listPairsMap());
  const nextPreviews: Record<string, string[]> = {};
  for (const deck of decks) {
    nextPreviews[deck.id] = await buildDeckPreview(deck, pairsById, maxCount);
  }
  return nextPreviews;
}
