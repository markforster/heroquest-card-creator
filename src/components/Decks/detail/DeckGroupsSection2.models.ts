"use client";

import { useMemo } from "react";

import { useDeckRightPanel } from "@/components/Decks/detail/context/DeckRightPanelContext";
import type { DeckDetailSelectionModel } from "@/components/Decks/hooks/useDeckDetailSelectionModel";
import type { DeckSetEntriesModel } from "@/components/Decks/hooks/useDeckSetEntriesModel";
import { useStockpileFilters } from "@/components/Stockpile/hooks/useStockpileFilters";

import type { BoardId, BoardModel } from "./DeckGroupsSection2";
import { toEntriesBoardModel, toGroupsBoardModel, toSourceBoardModel } from "./DeckGroupsSection2";

export function useDeckBoardsModels({
  selection,
  entries,
}: {
  selection: DeckDetailSelectionModel;
  entries: DeckSetEntriesModel;
}): Record<BoardId, BoardModel> {
  const rightPanel = useDeckRightPanel();

  const usedBackFaceIds = useMemo(
    () => new Set(selection.sets.map((set) => set.backFaceId)),
    [selection.sets],
  );
  const usedFrontFaceIds = useMemo(
    () =>
      new Set(
        entries.entries
          .map((entry) => entries.entryFrontIdByEntryId.get(entry.id) ?? null)
          .filter((id): id is string => Boolean(id)),
      ),
    [entries.entries, entries.entryFrontIdByEntryId],
  );

  const sourceCards = useMemo(
    () =>
      rightPanel.rightPanelFaceMode === "back"
        ? rightPanel.backCards.filter((card) => !usedBackFaceIds.has(card.id))
        : rightPanel.backCards.filter((card) => !usedFrontFaceIds.has(card.id)),
    [rightPanel.backCards, rightPanel.rightPanelFaceMode, usedBackFaceIds, usedFrontFaceIds],
  );
  const cardNameById = useMemo(
    () => new Map(rightPanel.backCards.map((card) => [card.id, card.name])),
    [rightPanel.backCards],
  );

  const { filteredCards } = useStockpileFilters({
    cards: sourceCards,
    collections: rightPanel.backCollections,
    search: rightPanel.sourceSearch,
    templateFilter: rightPanel.rightPanelFaceMode,
    activeFilter: rightPanel.backFilter,
    isPairMode: true,
    isPairBacks: rightPanel.rightPanelFaceMode === "back",
    showUnpairedOnly: false,
    showMissingArtworkOnly: false,
  });

  const groupsModel = useMemo(
    () =>
      toGroupsBoardModel({
        orderedGroups: selection.orderedGroups.map((group) => ({
          id: group.id,
          title: group.title,
        })),
        sets: selection.sets.map((set) => ({
          id: set.id,
          groupId: set.groupId,
          sortIndex: set.sortIndex,
          title: set.title,
          backFaceId: set.backFaceId,
        })),
        cardNameById,
      }),
    [cardNameById, selection.orderedGroups, selection.sets],
  );
  const entriesModel = useMemo(
    () =>
      toEntriesBoardModel({
        entriesSorted: entries.entriesSorted.map((entry) => ({
          id: entry.id,
          sortIndex: entry.sortIndex,
        })),
        entryFrontIdByEntryId: entries.entryFrontIdByEntryId,
        cardNameById,
      }),
    [cardNameById, entries.entriesSorted, entries.entryFrontIdByEntryId],
  );
  const sourceModel = useMemo(
    () =>
      toSourceBoardModel({
        cards: filteredCards.map((card) => ({ id: card.id, name: card.name })),
        sourceFaceMode: rightPanel.rightPanelFaceMode === "back" ? "back" : "front",
      }),
    [filteredCards, rightPanel.rightPanelFaceMode],
  );

  return {
    groups: groupsModel,
    entries: entriesModel,
    source: sourceModel,
  };
}
