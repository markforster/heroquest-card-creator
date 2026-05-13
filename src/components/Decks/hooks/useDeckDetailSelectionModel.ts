"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DeckGroupRecord, DeckSetRecord } from "@/api/decks";
import { useListDeckGroups, useListDeckSets } from "@/api/hooks";
import { useQueryClient } from "@tanstack/react-query";

export type DeckDetailSelectionModel = {
  deckId: string | null;
  groups: DeckGroupRecord[];
  sets: DeckSetRecord[];
  orderedGroups: DeckGroupRecord[];
  groupBySetId: Map<string, string>;
  setById: Map<string, DeckSetRecord>;
  selectedGroupId: string | null;
  selectedSetId: string | null;
  selectedEntryId: string | null;
  setSelectedGroupId: (groupId: string | null) => void;
  setSelectedEntryId: (entryId: string | null) => void;
  clearSelection: () => void;
  selectGroup: (groupId: string) => void;
  selectSet: (set: DeckSetRecord) => void;
  reloadStructure: (preferredSetId?: string | null) => Promise<void>;
};

export function useDeckDetailSelectionModel(deckId: string | null): DeckDetailSelectionModel {
  const queryClient = useQueryClient();
  const preferredSetIdRef = useRef<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const deckStructureQueryPredicate = useCallback(
    (query: { queryKey: ReadonlyArray<unknown> }) =>
      Array.isArray(query.queryKey) &&
      query.queryKey.some(
        (segment) =>
          typeof segment === "object" &&
          segment !== null &&
          "path" in segment &&
          (segment.path === "/decks/:deckId/groups" || segment.path === "/decks/:deckId/sets"),
      ),
    [],
  );

  const groupsQuery = useListDeckGroups(
    { params: { deckId: deckId ?? "" } },
    { enabled: Boolean(deckId), staleTime: 0, refetchOnMount: "always" },
  );
  const setsQuery = useListDeckSets(
    { params: { deckId: deckId ?? "" } },
    { enabled: Boolean(deckId), staleTime: 0, refetchOnMount: "always" },
  );

  const groups = groupsQuery.data ?? [];
  const sets = setsQuery.data ?? [];
  const orderedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sortIndex - b.sortIndex),
    [groups],
  );
  const groupBySetId = useMemo(() => {
    const map = new Map<string, string>();
    sets.forEach((set) => map.set(set.id, set.groupId));
    return map;
  }, [sets]);
  const setById = useMemo(() => new Map(sets.map((set) => [set.id, set])), [sets]);

  useEffect(() => {
    if (!deckId) {
      setSelectedGroupId(null);
      setSelectedSetId(null);
      setSelectedEntryId(null);
      preferredSetIdRef.current = null;
      return;
    }

    const preferredSetId = preferredSetIdRef.current;
    const preferredSet = preferredSetId ? (setById.get(preferredSetId) ?? null) : null;
    if (preferredSetId) preferredSetIdRef.current = null;

    const nextGroupId =
      preferredSet?.groupId ??
      (selectedGroupId && orderedGroups.some((group) => group.id === selectedGroupId)
        ? selectedGroupId
        : null) ??
      orderedGroups[0]?.id ??
      null;

    const nextGroupSets = nextGroupId
      ? sets
          .filter((set) => set.groupId === nextGroupId)
          .sort((a, b) => a.sortIndex - b.sortIndex)
      : [];

    const nextSetId =
      preferredSet?.id ??
      (nextGroupSets.length === 1
        ? (nextGroupSets[0]?.id ?? null)
        : selectedSetId &&
            nextGroupId &&
            sets.some((set) => set.id === selectedSetId && set.groupId === nextGroupId)
          ? selectedSetId
          : null);

    if (nextGroupId !== selectedGroupId) setSelectedGroupId(nextGroupId);
    if (nextSetId !== selectedSetId) {
      setSelectedSetId(nextSetId);
      setSelectedEntryId(null);
    }
  }, [deckId, orderedGroups, selectedGroupId, selectedSetId, setById, sets]);

  const selectGroup = useCallback(
    (groupId: string) => {
      const groupSets = sets
        .filter((set) => set.groupId === groupId)
        .sort((a, b) => a.sortIndex - b.sortIndex);
      const nextSetId = groupSets.length === 1 ? (groupSets[0]?.id ?? null) : null;
      setSelectedGroupId(groupId);
      setSelectedSetId(nextSetId);
      setSelectedEntryId(null);
    },
    [sets],
  );

  const selectSet = useCallback((set: DeckSetRecord) => {
    setSelectedGroupId(set.groupId);
    setSelectedSetId(set.id);
    setSelectedEntryId(null);
  }, []);

  const clearSelection = useCallback(() => {
    preferredSetIdRef.current = null;
    setSelectedGroupId(null);
    setSelectedSetId(null);
    setSelectedEntryId(null);
  }, []);

  const reloadStructure = useCallback(
    async (preferredSetId?: string | null) => {
      preferredSetIdRef.current = preferredSetId ?? null;
      await queryClient.invalidateQueries({
        predicate: deckStructureQueryPredicate,
      });
      await queryClient.refetchQueries({
        predicate: deckStructureQueryPredicate,
        type: "active",
      });
    },
    [deckStructureQueryPredicate, queryClient],
  );

  return {
    deckId,
    groups,
    sets,
    orderedGroups,
    groupBySetId,
    setById,
    selectedGroupId,
    selectedSetId,
    selectedEntryId,
    setSelectedGroupId,
    setSelectedEntryId,
    clearSelection,
    selectGroup,
    selectSet,
    reloadStructure,
  };
}
