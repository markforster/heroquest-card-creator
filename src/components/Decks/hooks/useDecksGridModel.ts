"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { DeckRecord, DeckSetRecord } from "@/api/decks";
import { apiClient } from "@/api/client";
import { useListDecks } from "@/api/hooks";
import type { PairRecord } from "@/api/pairs";
import { useDeckMutations } from "@/components/Decks/hooks/useDeckMutations";
import { getSelectedDeckId } from "@/components/Decks/selectors/deckDetailSelectors";

type UseDecksGridModelArgs = {
  previewFanCount: number;
  untitledDeckLabel: string;
};

export function useDecksGridModel({ previewFanCount, untitledDeckLabel }: UseDecksGridModelArgs) {
  const mutations = useDeckMutations();
  const decksQuery = useListDecks(
    { queries: {} },
    { enabled: true, staleTime: 0, refetchOnMount: "always" },
  );

  const [deckPreviews, setDeckPreviews] = useState<Record<string, string[]>>({});
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [isDeleteDeckOpen, setIsDeleteDeckOpen] = useState(false);
  const [deckTitleDraft, setDeckTitleDraft] = useState("");
  const [deckDescriptionDraft, setDeckDescriptionDraft] = useState("");

  const decks = decksQuery.data ?? [];
  const selectedDeckId = useMemo(() => getSelectedDeckId(selectedDeckIds), [selectedDeckIds]);

  const buildDeckPreview = useCallback(
    async (deck: DeckRecord, pairMap: Map<string, PairRecord>) => {
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
      const previewIds: string[] = [];
      const seen = new Set<string>();

      for (const group of orderedGroups) {
        const groupSets = setsByGroup.get(group.id) ?? [];
        for (const set of groupSets) {
          if (!seen.has(set.backFaceId)) {
            previewIds.push(set.backFaceId);
            seen.add(set.backFaceId);
          }
          if (previewIds.length >= previewFanCount) break;
        }
        if (previewIds.length >= previewFanCount) break;
      }

      for (const group of orderedGroups) {
        const groupSets = setsByGroup.get(group.id) ?? [];
        for (const set of groupSets) {
          const setEntries = await apiClient.listDeckEntries({ params: { setId: set.id } });
          const orderedEntries = [...setEntries].sort((a, b) => a.sortIndex - b.sortIndex);
          for (const entry of orderedEntries) {
            const pair = pairMap.get(entry.pairId);
            if (!pair?.frontFaceId) continue;
            if (seen.has(pair.frontFaceId)) continue;
            previewIds.push(pair.frontFaceId);
            seen.add(pair.frontFaceId);
            if (previewIds.length >= previewFanCount) break;
          }
          if (previewIds.length >= previewFanCount) break;
        }
        if (previewIds.length >= previewFanCount) break;
      }

      return previewIds.slice(0, previewFanCount);
    },
    [previewFanCount],
  );

  const refreshDeckPreviews = useCallback(
    async (deckList: DeckRecord[]) => {
      const pairMap = await mutations.listPairsMap();
      const nextPreviews: Record<string, string[]> = {};
      for (const deck of deckList) {
        nextPreviews[deck.id] = await buildDeckPreview(deck, pairMap);
      }
      setDeckPreviews(nextPreviews);
    },
    [buildDeckPreview, mutations],
  );

  const refresh = useCallback(async () => {
    const response = await decksQuery.refetch();
    const nextDecks = response.data ?? [];
    await refreshDeckPreviews(nextDecks);
    return nextDecks;
  }, [decksQuery, refreshDeckPreviews]);

  useEffect(() => {
    let active = true;
    refreshDeckPreviews(decks).catch(() => {
      if (!active) return;
      setDeckPreviews({});
    });
    return () => {
      active = false;
    };
  }, [decks, refreshDeckPreviews]);

  const selectDeck = useCallback((deckId: string, hasModifier: boolean) => {
    setSelectedDeckIds((prev) => {
      if (hasModifier) {
        const next = new Set(prev);
        if (next.has(deckId)) next.delete(deckId);
        else next.add(deckId);
        return next;
      }
      if (prev.size === 1 && prev.has(deckId)) return new Set();
      return new Set([deckId]);
    });
  }, []);

  const createDeck = useCallback(async () => {
    const createdId = await mutations.createDeck(deckTitleDraft, deckDescriptionDraft, untitledDeckLabel);
    await refresh();
    if (createdId) setSelectedDeckIds(new Set([createdId]));
    setDeckTitleDraft("");
    setDeckDescriptionDraft("");
    return createdId;
  }, [deckDescriptionDraft, deckTitleDraft, mutations, refresh, untitledDeckLabel]);

  const deleteSelectedDecks = useCallback(async () => {
    await mutations.deleteDecks(Array.from(selectedDeckIds));
    setSelectedDeckIds(new Set());
    await refresh();
  }, [mutations, refresh, selectedDeckIds]);

  const duplicateDeck = useCallback(
    async (deckId: string) => {
      const newDeckId = await mutations.duplicateDeck(deckId);
      await refresh();
      return newDeckId;
    },
    [mutations, refresh],
  );

  return {
    decks,
    deckPreviews,
    selectedDeckIds,
    selectedDeckId,
    isDeleteDeckOpen,
    setIsDeleteDeckOpen,
    deckTitleDraft,
    setDeckTitleDraft,
    deckDescriptionDraft,
    setDeckDescriptionDraft,
    selectDeck,
    createDeck,
    deleteSelectedDecks,
    duplicateDeck,
    refresh,
    isLoading: decksQuery.isLoading,
  };
}
