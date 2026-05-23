import { apiClient } from "@/api/client";
import { listPairsMap } from "@/components/Decks/deck-preview";

import type { PrintComposition, SlotPair } from "@/lib/pdf-export/types";

export async function composeDeckSlotPairs(
  deckId: string,
  mode: "frontsOnly" | "frontAndBack",
): Promise<SlotPair[]> {
  const [groups, sets, pairMap] = await Promise.all([
    apiClient.listDeckGroups({ params: { deckId } }),
    apiClient.listDeckSets({ params: { deckId } }),
    listPairsMap(),
  ]);

  const groupOrder = new Map(groups.sort((a, b) => a.sortIndex - b.sortIndex).map((g, index) => [g.id, index]));

  const orderedSets = [...sets].sort((a, b) => {
    const groupA = groupOrder.get(a.groupId) ?? Number.MAX_SAFE_INTEGER;
    const groupB = groupOrder.get(b.groupId) ?? Number.MAX_SAFE_INTEGER;
    if (groupA !== groupB) return groupA - groupB;
    return a.sortIndex - b.sortIndex;
  });

  const slotPairs: SlotPair[] = [];

  for (const set of orderedSets) {
    const entries = await apiClient.listDeckEntries({ params: { setId: set.id } });
    const orderedEntries = [...entries].sort((a, b) => a.sortIndex - b.sortIndex);
    for (const entry of orderedEntries) {
      const frontId = pairMap.get(entry.pairId)?.frontFaceId ?? null;
      if (!frontId) continue;
      const count = Math.max(1, entry.count ?? 1);
      for (let copyIndex = 0; copyIndex < count; copyIndex += 1) {
        slotPairs.push({
          slotId: `${set.id}:${entry.id}:${copyIndex}`,
          frontId,
          backId: mode === "frontAndBack" ? set.backFaceId ?? null : null,
        });
      }
    }
  }

  return slotPairs;
}

export function composePrintComposition(slotPairs: SlotPair[], perPage: number): PrintComposition {
  if (perPage <= 0 || slotPairs.length === 0) {
    return { sheets: [], totalSlots: 0 };
  }

  const sheets: PrintComposition["sheets"] = [];
  for (let start = 0; start < slotPairs.length; start += perPage) {
    sheets.push({
      sheetIndex: sheets.length,
      slots: slotPairs.slice(start, start + perPage),
    });
  }

  return {
    sheets,
    totalSlots: slotPairs.length,
  };
}
