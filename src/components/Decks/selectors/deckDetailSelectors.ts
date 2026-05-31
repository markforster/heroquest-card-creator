import type { DeckEntryRecord, DeckGroupRecord, DeckSetRecord } from "@/api/decks";
import type { PairRecord } from "@/api/pairs";

export function getSelectedDeckId(selectedDeckIds: Set<string>): string | null {
  if (selectedDeckIds.size !== 1) return null;
  return Array.from(selectedDeckIds)[0] ?? null;
}

export function getSelectedGroup(
  groups: DeckGroupRecord[],
  selectedGroupId: string | null,
): DeckGroupRecord | null {
  if (!selectedGroupId) return null;
  return groups.find((group) => group.id === selectedGroupId) ?? null;
}

export function getSelectedSet(
  sets: DeckSetRecord[],
  activeSetId: string | null,
): DeckSetRecord | null {
  if (!activeSetId) return null;
  return sets.find((set) => set.id === activeSetId) ?? null;
}

export function getEntryFrontIdByEntryId(
  entries: DeckEntryRecord[],
  pairsById: Map<string, PairRecord>,
): Map<string, string> {
  const map = new Map<string, string>();
  entries.forEach((entry) => {
    const frontId = pairsById.get(entry.pairId)?.frontFaceId;
    if (frontId) map.set(entry.id, frontId);
  });
  return map;
}

export function getSetById(sets: DeckSetRecord[]): Map<string, DeckSetRecord> {
  return new Map(sets.map((set) => [set.id, set]));
}

export function getGroupBySetId(sets: DeckSetRecord[]): Map<string, string> {
  const map = new Map<string, string>();
  sets.forEach((set) => map.set(set.id, set.groupId));
  return map;
}

export function getOrderedGroups(groups: DeckGroupRecord[]): DeckGroupRecord[] {
  return [...groups].sort((a, b) => a.sortIndex - b.sortIndex);
}

export function getSelectedGroupSets(
  sets: DeckSetRecord[],
  selectedGroupId: string | null,
): DeckSetRecord[] {
  if (!selectedGroupId) return [];
  return sets
    .filter((set) => set.groupId === selectedGroupId)
    .sort((a, b) => a.sortIndex - b.sortIndex);
}

export function getPairedNotInSetFrontIds(
  entries: DeckEntryRecord[],
  pairsById: Map<string, PairRecord>,
  selectedSet: DeckSetRecord | null,
): string[] {
  if (!selectedSet) return [];
  const entryPairIds = new Set(entries.map((entry) => entry.pairId));
  const frontIds: string[] = [];
  pairsById.forEach((pair) => {
    if (!pair.frontFaceId || !pair.backFaceId) return;
    if (pair.backFaceId !== selectedSet.backFaceId) return;
    if (entryPairIds.has(pair.id)) return;
    frontIds.push(pair.frontFaceId);
  });
  return frontIds;
}
