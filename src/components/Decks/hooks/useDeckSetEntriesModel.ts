"use client";

import { useCallback, useMemo } from "react";

import { apiClient } from "@/api/client";
import type { DeckEntryRecord } from "@/api/decks";
import type { PairRecord } from "@/api/pairs";
import { useGetDeckSet, useListDeckEntries, useListPairs } from "@/api/hooks";
import { useQueryClient } from "@tanstack/react-query";

export type DeckSetEntriesModel = {
  setId: string | null;
  backFaceId: string | null;
  entries: DeckEntryRecord[];
  entriesSorted: DeckEntryRecord[];
  pairsById: Map<string, PairRecord>;
  entryFrontIdByEntryId: Map<string, string>;
  pairedNotInSetFrontIds: string[];
  addFront: (frontFaceId: string, targetSetId?: string | null) => Promise<DeckEntryRecord[]>;
  removeEntry: (entryId: string, targetSetId?: string | null) => Promise<void>;
  reorderEntries: (orderedEntryIds: string[], targetSetId?: string | null) => Promise<void>;
  reorderEntriesOptimistic: (
    orderedEntryIds: string[],
    targetSetId?: string | null,
  ) => Promise<void>;
  updateEntryCount: (
    entryId: string,
    count: number,
    targetSetId?: string | null,
  ) => Promise<void>;
  refreshEntries: (targetSetId?: string | null) => Promise<void>;
};

function resolveTargetSetId(currentSetId: string | null, targetSetId?: string | null): string | null {
  return targetSetId ?? currentSetId;
}

export function useDeckSetEntriesModel(setId: string | null): DeckSetEntriesModel {
  const queryClient = useQueryClient();
  const deckEntriesQueryPredicate = useCallback(
    (query: { queryKey: ReadonlyArray<unknown> }) =>
      Array.isArray(query.queryKey) &&
      query.queryKey.some(
        (segment) =>
          typeof segment === "object" &&
          segment !== null &&
          "path" in segment &&
          segment.path === "/deckSets/:setId/entries",
      ),
    [],
  );
  const deckEntriesForSetQueryPredicate = useCallback(
    (resolvedSetId: string) =>
      (query: { queryKey: ReadonlyArray<unknown> }) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some(
          (segment) =>
            typeof segment === "object" &&
            segment !== null &&
            "path" in segment &&
            segment.path === "/deckSets/:setId/entries" &&
            "params" in segment &&
            typeof segment.params === "object" &&
            segment.params !== null &&
            "setId" in segment.params &&
            segment.params.setId === resolvedSetId,
        ),
    [],
  );
  const pairsQueryPredicate = useCallback(
    (query: { queryKey: ReadonlyArray<unknown> }) =>
      Array.isArray(query.queryKey) &&
      query.queryKey.some(
        (segment) =>
          typeof segment === "object" &&
          segment !== null &&
          "path" in segment &&
          segment.path === "/pairs",
      ),
    [],
  );

  const setQuery = useGetDeckSet(
    { params: { setId: setId ?? "" } },
    { enabled: Boolean(setId) },
  );
  const entriesQuery = useListDeckEntries(
    { params: { setId: setId ?? "" } },
    {
      enabled: Boolean(setId),
      staleTime: 0,
      refetchOnMount: "always",
    },
  );

  const backFaceId = setQuery.data?.backFaceId ?? null;
  const pairsQuery = useListPairs(
    { queries: { faceId: backFaceId ?? "" } },
    {
      enabled: Boolean(backFaceId),
      staleTime: 0,
    },
  );

  const entries = entriesQuery.data ?? [];
  const entriesSorted = useMemo(
    () => entries.slice().sort((a, b) => a.sortIndex - b.sortIndex),
    [entries],
  );

  const pairsById = useMemo(() => {
    const map = new Map<string, PairRecord>();
    (pairsQuery.data ?? []).forEach((pair) => {
      map.set(pair.id, pair);
    });
    return map;
  }, [pairsQuery.data]);

  const entryFrontIdByEntryId = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((entry) => {
      const frontId = pairsById.get(entry.pairId)?.frontFaceId;
      if (frontId) map.set(entry.id, frontId);
    });
    return map;
  }, [entries, pairsById]);

  const pairedNotInSetFrontIds = useMemo(() => {
    if (!backFaceId) return [];
    const entryPairIds = new Set(entries.map((entry) => entry.pairId));
    const frontIds: string[] = [];
    pairsById.forEach((pair) => {
      if (!pair.frontFaceId || !pair.backFaceId) return;
      if (pair.backFaceId !== backFaceId) return;
      if (entryPairIds.has(pair.id)) return;
      frontIds.push(pair.frontFaceId);
    });
    return frontIds;
  }, [backFaceId, entries, pairsById]);

  const invalidateEntriesForSet = useCallback(
    async () => {
      await queryClient.invalidateQueries({
        predicate: deckEntriesQueryPredicate,
      });
      await queryClient.invalidateQueries({
        predicate: pairsQueryPredicate,
      });
      await queryClient.refetchQueries({
        predicate: deckEntriesQueryPredicate,
        type: "active",
      });
      await queryClient.refetchQueries({
        predicate: pairsQueryPredicate,
        type: "active",
      });
    },
    [deckEntriesQueryPredicate, pairsQueryPredicate, queryClient],
  );

  const refreshEntries = useCallback(
    async (targetSetId?: string | null) => {
      const resolved = resolveTargetSetId(setId, targetSetId);
      if (!resolved) return;
      await invalidateEntriesForSet();
    },
    [invalidateEntriesForSet, setId],
  );

  const addFront = useCallback(
    async (frontFaceId: string, targetSetId?: string | null) => {
      const resolved = resolveTargetSetId(setId, targetSetId);
      if (!resolved) return [];
      const nextEntries = await apiClient.addDeckEntries(
        { frontFaceIds: [frontFaceId] },
        { params: { setId: resolved } },
      );
      await invalidateEntriesForSet();
      return nextEntries ?? [];
    },
    [invalidateEntriesForSet, setId],
  );

  const removeEntry = useCallback(
    async (entryId: string, targetSetId?: string | null) => {
      const resolved = resolveTargetSetId(setId, targetSetId);
      if (!resolved) return;
      await apiClient.removeDeckEntries(
        { entryIds: [entryId] },
        { params: { setId: resolved } },
      );
      await invalidateEntriesForSet();
    },
    [invalidateEntriesForSet, setId],
  );

  const reorderEntries = useCallback(
    async (orderedEntryIds: string[], targetSetId?: string | null) => {
      const resolved = resolveTargetSetId(setId, targetSetId);
      if (!resolved) return;
      await apiClient.reorderDeckEntries(
        { orderedEntryIds },
        { params: { setId: resolved } },
      );
      await invalidateEntriesForSet();
    },
    [invalidateEntriesForSet, setId],
  );

  const reorderEntriesOptimistic = useCallback(
    async (orderedEntryIds: string[], targetSetId?: string | null) => {
      const resolved = resolveTargetSetId(setId, targetSetId);
      if (!resolved) return;
      const predicate = deckEntriesForSetQueryPredicate(resolved);
      const snapshots = queryClient.getQueriesData<DeckEntryRecord[]>({
        predicate,
      });

      queryClient.setQueriesData<DeckEntryRecord[]>({ predicate }, (old) => {
        if (!Array.isArray(old) || old.length === 0) return old;
        const byId = new Map(old.map((entry) => [entry.id, entry]));
        const reordered: DeckEntryRecord[] = [];
        orderedEntryIds.forEach((id, index) => {
          const current = byId.get(id);
          if (!current) return;
          reordered.push({ ...current, sortIndex: index });
        });
        if (reordered.length === 0) return old;
        return reordered;
      });

      try {
        await apiClient.reorderDeckEntries(
          { orderedEntryIds },
          { params: { setId: resolved } },
        );
      } catch (error) {
        snapshots.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        await invalidateEntriesForSet();
        throw error;
      }

      await invalidateEntriesForSet();
    },
    [deckEntriesForSetQueryPredicate, invalidateEntriesForSet, queryClient, setId],
  );

  const updateEntryCount = useCallback(
    async (entryId: string, count: number, targetSetId?: string | null) => {
      const resolved = resolveTargetSetId(setId, targetSetId);
      if (!resolved) return;
      await apiClient.updateDeckEntryCount(
        { entryId, count },
        { params: { setId: resolved } },
      );
      await invalidateEntriesForSet();
    },
    [invalidateEntriesForSet, setId],
  );

  return {
    setId,
    backFaceId,
    entries,
    entriesSorted,
    pairsById,
    entryFrontIdByEntryId,
    pairedNotInSetFrontIds,
    addFront,
    removeEntry,
    reorderEntries,
    reorderEntriesOptimistic,
    updateEntryCount,
    refreshEntries,
  };
}
