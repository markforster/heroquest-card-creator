"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type {
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import type { DeckGroupRecord, DeckSetRecord } from "@/api/decks";

type DragType = "set" | "group" | "back-face" | null;

type DecksDragControllerArgs = {
  deckId: string | null;
  orderedGroups: DeckGroupRecord[];
  sets: DeckSetRecord[];
  groupBySetId: Map<string, string>;
  selectedGroupId: string | null;
  selectedSetId: string | null;
  activeSetId: string | null;
  setSets: Dispatch<SetStateAction<DeckSetRecord[]>>;
  setSelectedGroupId: (groupId: string | null) => void;
  createSetFromBackFace: (deckId: string, groupId: string, backFaceId: string) => Promise<void>;
  createDeckGroup: (deckId: string) => Promise<DeckGroupRecord>;
  reorderDeckGroups: (deckId: string, orderedGroupIds: string[]) => Promise<void>;
  reorderDeckSets: (setIdForParams: string, orderedSetIds: string[]) => Promise<void>;
  updateDeckSetGroup: (setId: string, groupId: string) => Promise<void>;
  loadDeckDetail: (deckId: string, preferredSetId?: string | null) => Promise<void>;
};

export function useDecksDragController({
  deckId,
  orderedGroups,
  sets,
  groupBySetId,
  selectedGroupId,
  selectedSetId,
  activeSetId,
  setSets,
  setSelectedGroupId,
  createSetFromBackFace,
  createDeckGroup,
  reorderDeckGroups,
  reorderDeckSets,
  updateDeckSetGroup,
  loadDeckDetail,
}: DecksDragControllerArgs) {
  const [dragType, setDragType] = useState<DragType>(null);
  const [dragActiveSetId, setDragActiveSetId] = useState<string | null>(null);
  const [dragActiveBackFaceId, setDragActiveBackFaceId] = useState<string | null>(null);
  const [groupDropIndex, setGroupDropIndex] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isGroupDropOver, setIsGroupDropOver] = useState(false);
  const [backFaceDropSucceeded, setBackFaceDropSucceeded] = useState(false);
  const groupRowRef = useRef<HTMLDivElement | null>(null);
  const backFaceResetTimerRef = useRef<number | null>(null);
  const BACK_FACE_DROP_RETURN_MS = 180;

  const resetDragState = useCallback(() => {
    setDragType(null);
    setDragActiveSetId(null);
    setDragActiveBackFaceId(null);
    setGroupDropIndex(null);
    setDragOverId(null);
    setIsGroupDropOver(false);
    if (backFaceResetTimerRef.current != null) {
      window.clearTimeout(backFaceResetTimerRef.current);
      backFaceResetTimerRef.current = null;
    }
  }, []);

  const onDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      const activeType = active.data?.current?.type;
      if (backFaceResetTimerRef.current != null) {
        window.clearTimeout(backFaceResetTimerRef.current);
        backFaceResetTimerRef.current = null;
      }
      setBackFaceDropSucceeded(false);
      if (activeType === "back-face") {
        const backFaceId = active.data?.current?.backFaceId as string | undefined;
        setDragType("back-face");
        setDragActiveBackFaceId(backFaceId ?? null);
        setIsGroupDropOver(true);
        setGroupDropIndex(orderedGroups.length);
        return;
      }
      setDragType("set");
      setDragActiveSetId(String(active.id));
    },
    [orderedGroups.length],
  );

  const onDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (dragType !== "back-face") return;
      const row = groupRowRef.current;
      if (!row) return;
      const tiles = Array.from(row.querySelectorAll("[data-group-id]"));
      if (!tiles.length) {
        setGroupDropIndex(0);
        return;
      }
      const activeRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
      if (!activeRect) return;
      const pointerX = activeRect.left + activeRect.width / 2;
      const centers = tiles.map((node) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        return rect.left + rect.width / 2;
      });
      let index = centers.findIndex((center) => pointerX < center);
      if (index < 0) index = centers.length;
      setGroupDropIndex(index);
    },
    [dragType],
  );

  const onDragOver = useCallback(
    ({ over, active }: DragOverEvent) => {
      const overId = over ? String(over.id) : null;
      const activeType = active.data?.current?.type;
      setDragOverId(overId);
      setIsGroupDropOver(Boolean(overId && (overId === "groups-empty" || overId === "groups-area")));
      if (activeType === "back-face" && overId === "groups-empty") {
        setGroupDropIndex(0);
      }
      if (activeType !== "back-face" && overId?.startsWith("group:")) {
        const groupId = overId.replace("group:", "");
        if (groupId && groupId !== selectedGroupId) {
          setSelectedGroupId(groupId);
        }
      }
    },
    [selectedGroupId, setSelectedGroupId],
  );

  const onDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      const activeType = active.data?.current?.type;
      const backFaceId = active.data?.current?.backFaceId as string | undefined;
      if (activeType === "back-face") {
        if (!over || !deckId || !backFaceId) {
          setBackFaceDropSucceeded(false);
          backFaceResetTimerRef.current = window.setTimeout(() => {
            resetDragState();
          }, BACK_FACE_DROP_RETURN_MS);
          return;
        }
        const overId = String(over.id);
        const isSuccess =
          overId.startsWith("group:") || overId === "groups-area" || overId === "groups-empty";
        setBackFaceDropSucceeded(isSuccess);
        const targetGroupId = overId.startsWith("group:") ? overId.replace("group:", "") : null;
        if (targetGroupId) {
          await createSetFromBackFace(deckId, targetGroupId, backFaceId);
          resetDragState();
          return;
        }
        if (overId === "groups-empty" || overId === "groups-area") {
          const group = await createDeckGroup(deckId);
          if (groupDropIndex != null) {
            const orderedGroupIds = [...orderedGroups.map((entry) => entry.id)];
            const nextIndex = Math.max(0, Math.min(groupDropIndex, orderedGroupIds.length));
            orderedGroupIds.splice(nextIndex, 0, group.id);
            await reorderDeckGroups(deckId, orderedGroupIds);
          }
          await createSetFromBackFace(deckId, group.id, backFaceId);
          await loadDeckDetail(deckId);
        }
        resetDragState();
        return;
      }
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;
      const sourceGroupId = groupBySetId.get(activeId);
      if (!sourceGroupId) return;
      const targetGroupId = overId.startsWith("group:")
        ? overId.replace("group:", "")
        : groupBySetId.get(overId);
      if (!targetGroupId) return;

      const sourceOrdered = sets
        .filter((set) => set.groupId === sourceGroupId)
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .map((set) => set.id);
      const targetOrdered =
        sourceGroupId === targetGroupId
          ? sourceOrdered
          : sets
              .filter((set) => set.groupId === targetGroupId)
              .sort((a, b) => a.sortIndex - b.sortIndex)
              .map((set) => set.id);

      const fromIndex = sourceOrdered.indexOf(activeId);
      if (fromIndex < 0) return;
      const nextSource = [...sourceOrdered];
      nextSource.splice(fromIndex, 1);

      const toIndex =
        sourceGroupId === targetGroupId
          ? Math.max(0, targetOrdered.indexOf(overId))
          : overId.startsWith("group:")
            ? targetOrdered.length
            : Math.max(0, targetOrdered.indexOf(overId));
      const nextTarget = sourceGroupId === targetGroupId ? nextSource : [...targetOrdered];
      nextTarget.splice(toIndex, 0, activeId);

      const sourceSortIndexMap = new Map(nextSource.map((id, index) => [id, index]));
      const targetSortIndexMap = new Map(nextTarget.map((id, index) => [id, index]));

      setSets((prev) =>
        prev.map((set) => {
          if (set.id === activeId) {
            return {
              ...set,
              groupId: targetGroupId,
              sortIndex: targetSortIndexMap.get(set.id) ?? set.sortIndex,
            };
          }
          if (set.groupId === sourceGroupId && sourceSortIndexMap.has(set.id)) {
            return { ...set, sortIndex: sourceSortIndexMap.get(set.id) ?? set.sortIndex };
          }
          if (set.groupId === targetGroupId && targetSortIndexMap.has(set.id)) {
            return { ...set, sortIndex: targetSortIndexMap.get(set.id) ?? set.sortIndex };
          }
          return set;
        }),
      );

      try {
        if (sourceGroupId !== targetGroupId) {
          await updateDeckSetGroup(activeId, targetGroupId);
        }
        if (sourceGroupId === targetGroupId) {
          await reorderDeckSets(activeId, nextTarget);
        } else {
          await reorderDeckSets(activeId, nextTarget);
          if (nextSource.length > 0) {
            await reorderDeckSets(nextSource[0], nextSource);
          }
        }
        if (activeId === selectedSetId && sourceGroupId !== targetGroupId) {
          setSelectedGroupId(targetGroupId);
        }
      } catch (error) {
        if (deckId) {
          await loadDeckDetail(deckId, activeSetId);
        }
        throw error;
      }
      setBackFaceDropSucceeded(false);
      resetDragState();
    },
    [
      resetDragState,
      deckId,
      groupDropIndex,
      orderedGroups,
      groupBySetId,
      sets,
      selectedSetId,
      selectedGroupId,
      activeSetId,
      setSets,
      setSelectedGroupId,
      createSetFromBackFace,
      createDeckGroup,
      reorderDeckGroups,
      reorderDeckSets,
      updateDeckSetGroup,
      loadDeckDetail,
    ],
  );

  const dragState = useMemo(
    () => ({
      dragActiveSetId,
      dragActiveBackFaceId,
      groupDropIndex,
      isGroupDropOver,
      isBackFaceDragActive: dragType === "back-face",
      backFaceDropSucceeded,
    }),
    [
      dragActiveSetId,
      dragActiveBackFaceId,
      groupDropIndex,
      isGroupDropOver,
      dragType,
      backFaceDropSucceeded,
    ],
  );

  const onDragCancel = useCallback(() => {
    setBackFaceDropSucceeded(false);
    resetDragState();
  }, [resetDragState]);

  const dndHandlers = useMemo(
    () => ({
      onDragStart,
      onDragMove,
      onDragOver,
      onDragEnd,
      onDragCancel,
    }),
    [onDragStart, onDragMove, onDragOver, onDragEnd, onDragCancel],
  );

  const groupRowRefSetter = useCallback((node: HTMLDivElement | null) => {
    groupRowRef.current = node;
  }, []);

  return {
    dragState,
    dndHandlers,
    groupRowRef: groupRowRefSetter,
  };
}
