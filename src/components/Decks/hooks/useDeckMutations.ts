"use client";

import { useMemo } from "react";

import { apiClient } from "@/api/client";
import type { DeckMutationCommands } from "@/components/Decks/types/deck-route";
import type { PairRecord } from "@/api/pairs";

export function useDeckMutations(): DeckMutationCommands {
  return useMemo(
    () => ({
      createDeck: async (title, description, fallbackTitle) => {
        const trimmed = title.trim();
        const created = await apiClient.createDeck({
          title: trimmed || fallbackTitle,
          description: description || null,
        });
        return created?.id ?? null;
      },
      updateDeckTitle: async (deckId, title, fallbackTitle) => {
        void fallbackTitle;
        await apiClient.updateDeck(
          { title },
          { params: { deckId } },
        );
      },
      deleteDecks: async (ids) => {
        await Promise.all(ids.map((id) => apiClient.deleteDeck(undefined, { params: { deckId: id } })));
      },
      duplicateDeck: async (deckId) => {
        const result = await apiClient.duplicateDeck(undefined, { params: { deckId } });
        return result?.id ?? null;
      },
      createSetFromBackFace: async (deckId, groupId, backFaceId, defaultSetTitle) => {
        const createdSet = await apiClient.createDeckSet({
          deckId,
          groupId,
          title: defaultSetTitle,
          backFaceId,
          description: null,
        });
        const pairedFrontIds = (await apiClient.listPairs({ queries: { faceId: backFaceId } }))
          .filter((pair) => pair.backFaceId === backFaceId && pair.frontFaceId)
          .map((pair) => pair.frontFaceId as string);
        if (pairedFrontIds.length > 0) {
          await apiClient.addDeckEntries({ frontFaceIds: pairedFrontIds }, { params: { setId: createdSet.id } });
        }
        return createdSet;
      },
      addFrontToSetAndRefresh: async (setId, frontFaceId) => {
        await apiClient.addDeckEntries({ frontFaceIds: [frontFaceId] }, { params: { setId } });
        const [entries, pairsById] = await Promise.all([
          apiClient.listDeckEntries({ params: { setId } }),
          listPairsMap(),
        ]);
        return { entries, pairsById };
      },
      removeEntryAndRefresh: async (entryId, setId) => {
        await apiClient.removeDeckEntries({ entryIds: [entryId] }, { params: { setId } });
        return apiClient.listDeckEntries({ params: { setId } });
      },
      refreshEntriesAndPairs: async (setId) => {
        const [entries, pairsById] = await Promise.all([
          apiClient.listDeckEntries({ params: { setId } }),
          listPairsMap(),
        ]);
        return { entries, pairsById };
      },
      deleteSet: async (setId) => {
        await apiClient.deleteDeckSet(undefined, { params: { setId } });
      },
      deleteGroup: async (groupId) => {
        await apiClient.deleteDeckGroup(undefined, { params: { groupId } });
      },
      rebuildSetBack: async (setId, newBackFaceId, frontFaceIds) => {
        await apiClient.rebuildDeckSetBack({ newBackFaceId, frontFaceIds }, { params: { setId } });
      },
      reorderEntries: async (setId, orderedEntryIds) => {
        await apiClient.reorderDeckEntries({ orderedEntryIds }, { params: { setId } });
      },
      createGroup: async (deckId, defaultGroupTitle) =>
        apiClient.createDeckGroup({ title: defaultGroupTitle }, { params: { deckId } }),
      reorderGroups: async (deckId, orderedGroupIds) => {
        await apiClient.reorderDeckGroups({ orderedGroupIds }, { params: { deckId } });
      },
      reorderSets: async (setId, orderedSetIds) => {
        await apiClient.reorderDeckSets({ orderedSetIds }, { params: { setId } });
      },
      updateSetGroup: async (setId, groupId) => {
        await apiClient.updateDeckSet({ groupId }, { params: { setId } });
      },
      listPairsMap,
    }),
    [],
  );
}

async function listPairsMap(): Promise<Map<string, PairRecord>> {
  const pairs = await apiClient.listPairs();
  const map = new Map<string, PairRecord>();
  pairs.forEach((pair) => map.set(pair.id, pair));
  return map;
}
