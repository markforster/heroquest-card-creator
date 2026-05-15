"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/api/client";
import { listPairsMap } from "@/components/Decks/deck-preview";
import type { DeckMutationCommands } from "@/components/Decks/types/deck-route";

export function useDeckMutations(): DeckMutationCommands {
  const queryClient = useQueryClient();
  const isDeckScopedQuery = (query: { queryKey: ReadonlyArray<unknown> }, deckId: string) =>
    Array.isArray(query.queryKey) &&
    query.queryKey.some((segment) => {
      if (typeof segment === "string") {
        return segment.includes(`/decks/${deckId}`);
      }
      if (typeof segment !== "object" || segment === null || !("path" in segment)) {
        return false;
      }
      const path = (segment as { path?: unknown }).path;
      const params = (segment as { params?: unknown }).params;
      const paramDeckId =
        typeof params === "object" && params !== null && "deckId" in params
          ? (params as { deckId?: unknown }).deckId
          : undefined;
      if (path !== "/decks/:deckId" && path !== "/decks") return false;
      return typeof paramDeckId === "undefined" || paramDeckId === deckId;
    });

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
      updateDeck: async (deckId, title, description, fallbackTitle) => {
        const trimmedTitle = title.trim();
        const normalizedDescription = description.trim() === "" ? null : description;
        await apiClient.updateDeck(
          {
            title: trimmedTitle || fallbackTitle,
            description: normalizedDescription,
          },
          { params: { deckId } },
        );
      },
      updateDeckTitle: async (deckId, title, fallbackTitle) => {
        void fallbackTitle;
        await apiClient.updateDeck(
          { title },
          { params: { deckId } },
        );
      },
      setDeckKeySet: async (deckId, keySetId) => {
        queryClient.setQueriesData(
          {
            predicate: (query: { queryKey: ReadonlyArray<unknown> }) => isDeckScopedQuery(query, deckId),
          },
          (current: unknown) => {
            if (!current || typeof current !== "object") return current;
            return { ...(current as Record<string, unknown>), keySetId };
          },
        );
        await apiClient.updateDeck({ keySetId }, { params: { deckId } });
        await queryClient.invalidateQueries({
          predicate: (query: { queryKey: ReadonlyArray<unknown> }) => isDeckScopedQuery(query, deckId),
        });
        await queryClient.refetchQueries({
          predicate: (query: { queryKey: ReadonlyArray<unknown> }) => isDeckScopedQuery(query, deckId),
          type: "active",
        });
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
    [queryClient],
  );
}
