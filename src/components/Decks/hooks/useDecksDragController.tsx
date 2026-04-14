"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type {
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import type { DeckGroupRecord, DeckSetRecord } from "@/api/decks";

type DragType = "set" | "group" | "back-face" | "front-face" | null;

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
  addFrontFaceToSet: (setId: string, frontFaceId: string) => Promise<void>;
  createDeckGroup: (deckId: string) => Promise<DeckGroupRecord>;
  reorderDeckGroups: (deckId: string, orderedGroupIds: string[]) => Promise<void>;
  reorderDeckSets: (setIdForParams: string, orderedSetIds: string[]) => Promise<void>;
  updateDeckSetGroup: (setId: string, groupId: string) => Promise<void>;
  deleteDeckSet: (setId: string) => Promise<void>;
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
  addFrontFaceToSet,
  createDeckGroup,
  reorderDeckGroups,
  reorderDeckSets,
  updateDeckSetGroup,
  deleteDeckSet,
  loadDeckDetail,
}: DecksDragControllerArgs) {
  const [dragType, setDragType] = useState<DragType>(null);
  const [dragActiveSetId, setDragActiveSetId] = useState<string | null>(null);
  const [dragActiveGroupId, setDragActiveGroupId] = useState<string | null>(null);
  const [dragActiveBackFaceId, setDragActiveBackFaceId] = useState<string | null>(null);
  const [dragActiveFrontFaceId, setDragActiveFrontFaceId] = useState<string | null>(null);
  const [groupDropIndex, setGroupDropIndex] = useState<number | null>(null);
  const [setDropIndex, setSetDropIndex] = useState<number | null>(null);
  const [setDropGroupId, setSetDropGroupId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isGroupDropOver, setIsGroupDropOver] = useState(false);
  const [isFrontDropOver, setIsFrontDropOver] = useState(false);
  const [isRemoveZone, setIsRemoveZone] = useState(false);
  const [faceDropSucceeded, setFaceDropSucceeded] = useState(false);
  const groupRowRef = useRef<HTMLDivElement | null>(null);
  const backFaceResetTimerRef = useRef<number | null>(null);
  const dragOverIdRef = useRef<string | null>(null);
  const isFrontDropOverRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const selectedSetIdRef = useRef<string | null>(selectedSetId);
  const selectedGroupIdRef = useRef<string | null>(selectedGroupId);
  const dragStartSelectedSetIdRef = useRef<string | null>(null);
  const dragStartSelectedGroupIdRef = useRef<string | null>(null);
  const frontDropInFlightRef = useRef(false);
  const frontDropInFlightKeyRef = useRef<string | null>(null);
  const BACK_FACE_DROP_RETURN_MS = 180;

  useEffect(() => {
    selectedSetIdRef.current = selectedSetId;
  }, [selectedSetId]);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  const resetDragState = useCallback(() => {
    setDragType(null);
    setDragActiveSetId(null);
    setDragActiveGroupId(null);
    setDragActiveBackFaceId(null);
    setDragActiveFrontFaceId(null);
    setGroupDropIndex(null);
    setSetDropIndex(null);
    setSetDropGroupId(null);
    setDragOverId(null);
    dragOverIdRef.current = null;
    setIsGroupDropOver(false);
    setIsFrontDropOver(false);
    isFrontDropOverRef.current = false;
    setIsRemoveZone(false);
    dragStartSelectedSetIdRef.current = null;
    dragStartSelectedGroupIdRef.current = null;
    lastPointerRef.current = null;
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
      setFaceDropSucceeded(false);
      if (activeType === "back-face") {
        const backFaceId = active.data?.current?.backFaceId as string | undefined;
        setDragType("back-face");
        setDragActiveBackFaceId(backFaceId ?? null);
        setIsGroupDropOver(true);
        setGroupDropIndex(orderedGroups.length);
        return;
      }
      if (activeType === "front-face") {
        const frontFaceId = active.data?.current?.frontFaceId as string | undefined;
        setDragType("front-face");
        setDragActiveFrontFaceId(frontFaceId ?? null);
        dragStartSelectedSetIdRef.current = selectedSetIdRef.current;
        dragStartSelectedGroupIdRef.current = selectedGroupIdRef.current;
        const activeRect = active.rect.current.translated ?? active.rect.current.initial;
        if (activeRect) {
          lastPointerRef.current = {
            x: activeRect.left + activeRect.width / 2,
            y: activeRect.top + activeRect.height / 2,
          };
        }
        return;
      }
      if (activeType === "group") {
        const groupId = active.data?.current?.groupId as string | undefined;
        setDragType("group");
        setDragActiveGroupId(groupId ?? String(active.id));
        const nextIndex = orderedGroups.findIndex((group) => group.id === (groupId ?? String(active.id)));
        setGroupDropIndex(nextIndex >= 0 ? nextIndex : null);
        return;
      }
      setDragType("set");
      const setId = active.data?.current?.setId as string | undefined;
      setDragActiveSetId(setId ?? String(active.id));
      setIsRemoveZone(false);
      setSetDropIndex(null);
      setSetDropGroupId(null);
    },
    [orderedGroups],
  );

  const onDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (
        dragType !== "back-face" &&
        dragType !== "group" &&
        dragType !== "set" &&
        dragType !== "front-face"
      ) {
        return;
      }
      if (dragType === "front-face") {
        const activeRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
        if (activeRect) {
          lastPointerRef.current = {
            x: activeRect.left + activeRect.width / 2,
            y: activeRect.top + activeRect.height / 2,
          };
        }
        return;
      }
      const row = groupRowRef.current;
      if (!row) return;
      const tiles = Array.from(row.querySelectorAll("[data-group-id]"));
      const activeRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
      if (!activeRect) return;
      const pointerX = activeRect.left + activeRect.width / 2;
      const pointerY = activeRect.top + activeRect.height / 2;

      if (dragType === "set") {
        const rowRect = row.getBoundingClientRect();
        const outside =
          pointerX < rowRect.left ||
          pointerX > rowRect.right ||
          pointerY < rowRect.top ||
          pointerY > rowRect.bottom;
        setIsRemoveZone(outside);
        if (outside) {
          setSetDropIndex(null);
          setSetDropGroupId(null);
          return;
        }
        const overId = dragOverId;
        const rawGroupId =
          overId && overId.startsWith("group:")
            ? overId.replace("group:", "")
            : overId && overId.startsWith("set:")
              ? groupBySetId.get(overId.replace("set:", "")) ?? null
              : overId
                ? groupBySetId.get(overId) ?? null
                : null;
        if (!rawGroupId) {
          setSetDropIndex(null);
          setSetDropGroupId(null);
          return;
        }
        const groupNode = row.querySelector(`[data-group-id=\"${rawGroupId}\"]`);
        if (!groupNode) {
          setSetDropIndex(null);
          setSetDropGroupId(null);
          return;
        }
        const setNodes = Array.from(groupNode.querySelectorAll("[data-set-id]"));
        if (!setNodes.length) {
          setSetDropIndex(0);
          setSetDropGroupId(rawGroupId);
          return;
        }
        const centers = setNodes.map((node) => {
          const rect = (node as Element).getBoundingClientRect();
          return rect.left + rect.width / 2;
        });
        let index = centers.findIndex((center) => pointerX < center);
        if (index < 0) index = centers.length;
        setSetDropIndex(index);
        setSetDropGroupId(rawGroupId);
        return;
      }

      if (!tiles.length) {
        setGroupDropIndex(0);
        return;
      }
      const centers = tiles.map((node) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        return rect.left + rect.width / 2;
      });
      let index = centers.findIndex((center) => pointerX < center);
      if (index < 0) index = centers.length;
      setGroupDropIndex(index);
    },
    [dragType, dragOverId, groupBySetId],
  );

  const onDragOver = useCallback(
    ({ over, active }: DragOverEvent) => {
      const overId = over ? String(over.id) : null;
      const activeType = active.data?.current?.type;
      setDragOverId(overId);
      dragOverIdRef.current = overId;
      const isOverGroupRow =
        activeType !== "front-face" &&
        Boolean(
          overId &&
            (overId === "groups-empty" ||
              overId === "groups-area" ||
              (activeType === "group" && overId.startsWith("group:"))),
        );
      setIsGroupDropOver(isOverGroupRow);
      const nextFrontDropOver = Boolean(
        activeType === "front-face" && overId?.startsWith("entries-area"),
      );
      setIsFrontDropOver(nextFrontDropOver);
      isFrontDropOverRef.current = nextFrontDropOver;
      if (activeType === "back-face" && overId === "groups-empty") {
        setGroupDropIndex(0);
      }
      if ((activeType === "set" || activeType === "group") && overId?.startsWith("group:")) {
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
          setFaceDropSucceeded(false);
          backFaceResetTimerRef.current = window.setTimeout(() => {
            resetDragState();
          }, BACK_FACE_DROP_RETURN_MS);
          return;
        }
        const overId = String(over.id);
        const isSuccess =
          overId.startsWith("group:") || overId === "groups-area" || overId === "groups-empty";
        setFaceDropSucceeded(isSuccess);
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
      if (activeType === "front-face") {
        const frontFaceId = active.data?.current?.frontFaceId as string | undefined;
        const currentSelectedSetId = selectedSetIdRef.current;
        const currentSelectedGroupId = selectedGroupIdRef.current;
        const dragStartSelectedSetId = dragStartSelectedSetIdRef.current;
        const dragStartSelectedGroupId = dragStartSelectedGroupIdRef.current;
        const fallbackSetId =
          activeSetId &&
          currentSelectedGroupId &&
          currentSelectedGroupId === dragStartSelectedGroupId &&
          groupBySetId.get(activeSetId) === currentSelectedGroupId
            ? activeSetId
            : null;
        const targetSetId = dragStartSelectedSetId ?? currentSelectedSetId ?? fallbackSetId;
        if (!targetSetId || !frontFaceId) {
          console.debug("[decks:dnd] front drop ignored: missing target/front", {
            targetSetId,
            frontFaceId,
          });
          setFaceDropSucceeded(false);
          backFaceResetTimerRef.current = window.setTimeout(() => {
            resetDragState();
          }, BACK_FACE_DROP_RETURN_MS);
          return;
        }
        const overId = over ? String(over.id) : dragOverIdRef.current;
        const activeRect = active.rect.current.translated ?? active.rect.current.initial;
        const pointerX = activeRect
          ? activeRect.left + activeRect.width / 2
          : (lastPointerRef.current?.x ?? null);
        const pointerY = activeRect
          ? activeRect.top + activeRect.height / 2
          : (lastPointerRef.current?.y ?? null);
        const isPointerOverEntries =
          pointerX != null &&
          pointerY != null &&
          typeof document !== "undefined" &&
          document
            .elementsFromPoint(pointerX, pointerY)
            .some((el) => Boolean(el.closest('[data-deck-entries-dropzone="true"]')));
        const isSuccess = Boolean(
          (overId && overId.startsWith("entries-area")) ||
            isFrontDropOverRef.current ||
            isPointerOverEntries,
        );
        setFaceDropSucceeded(isSuccess);
        if (!isSuccess) {
          console.debug("[decks:dnd] front drop ignored: invalid target", { overId });
          backFaceResetTimerRef.current = window.setTimeout(() => {
            resetDragState();
          }, BACK_FACE_DROP_RETURN_MS);
          return;
        }
        const inFlightKey = `${targetSetId}:${frontFaceId}`;
        if (frontDropInFlightRef.current && frontDropInFlightKeyRef.current === inFlightKey) {
          resetDragState();
          return;
        }
        frontDropInFlightRef.current = true;
        frontDropInFlightKeyRef.current = inFlightKey;
        try {
          console.debug("[decks:dnd] front drop add start", { targetSetId, frontFaceId, overId });
          await addFrontFaceToSet(targetSetId, frontFaceId);
          console.debug("[decks:dnd] front drop add success", { targetSetId, frontFaceId });
          resetDragState();
          return;
        } catch (error) {
          console.error("[decks:dnd] Failed to add front face to set on drop", {
            targetSetId,
            frontFaceId,
            overId,
            error,
          });
          setFaceDropSucceeded(false);
          resetDragState();
          return;
        } finally {
          frontDropInFlightRef.current = false;
          frontDropInFlightKeyRef.current = null;
        }
      }
      if (activeType === "group") {
        if (!over || !deckId || !dragActiveGroupId) {
          resetDragState();
          return;
        }
        const orderedGroupIds = orderedGroups.map((entry) => entry.id);
        const fromIndex = orderedGroupIds.indexOf(dragActiveGroupId);
        if (fromIndex < 0) {
          resetDragState();
          return;
        }
        const next = orderedGroupIds.filter((id) => id !== dragActiveGroupId);
        let insertIndex = groupDropIndex ?? next.length;
        insertIndex = Math.max(0, Math.min(insertIndex, next.length));
        if (insertIndex > fromIndex) insertIndex -= 1;
        next.splice(insertIndex, 0, dragActiveGroupId);
        await reorderDeckGroups(deckId, next);
        await loadDeckDetail(deckId, selectedSetId);
        resetDragState();
        return;
      }
      const activeId = dragActiveSetId ?? String(active.id);
      const normalizedActiveId = activeId.startsWith("set:") ? activeId.replace("set:", "") : activeId;
      if (isRemoveZone && normalizedActiveId) {
        await deleteDeckSet(normalizedActiveId);
        if (deckId) {
          await loadDeckDetail(deckId);
        }
        setFaceDropSucceeded(false);
        resetDragState();
        return;
      }
      if (!over) {
        resetDragState();
        return;
      }
      const overId = String(over.id);
      if (activeId === overId) return;
      const sourceGroupId = groupBySetId.get(normalizedActiveId);
      if (!sourceGroupId) return;
      const normalizedOverId = overId.startsWith("set:") ? overId.replace("set:", "") : overId;
      const targetGroupId = overId.startsWith("group:")
        ? overId.replace("group:", "")
        : groupBySetId.get(normalizedOverId);
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

      const fromIndex = sourceOrdered.indexOf(normalizedActiveId);
      if (fromIndex < 0) return;
      const nextSource = [...sourceOrdered];
      nextSource.splice(fromIndex, 1);

      const toIndex =
        setDropGroupId === targetGroupId && setDropIndex != null
          ? setDropIndex
          : sourceGroupId === targetGroupId
            ? Math.max(0, targetOrdered.indexOf(normalizedOverId))
            : overId.startsWith("group:")
              ? targetOrdered.length
              : Math.max(0, targetOrdered.indexOf(normalizedOverId));
      const nextTarget = sourceGroupId === targetGroupId ? nextSource : [...targetOrdered];
      nextTarget.splice(toIndex, 0, normalizedActiveId);

      const sourceSortIndexMap = new Map(nextSource.map((id, index) => [id, index]));
      const targetSortIndexMap = new Map(nextTarget.map((id, index) => [id, index]));

      setSets((prev) =>
        prev.map((set) => {
          if (set.id === normalizedActiveId) {
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
          await updateDeckSetGroup(normalizedActiveId, targetGroupId);
        }
        if (sourceGroupId === targetGroupId) {
          await reorderDeckSets(normalizedActiveId, nextTarget);
        } else {
          await reorderDeckSets(normalizedActiveId, nextTarget);
          if (nextSource.length > 0) {
            await reorderDeckSets(nextSource[0], nextSource);
          }
        }
        if (normalizedActiveId === selectedSetId && sourceGroupId !== targetGroupId) {
          setSelectedGroupId(targetGroupId);
        }
      } catch (error) {
        if (deckId) {
          await loadDeckDetail(deckId, activeSetId);
        }
        throw error;
      }
      setFaceDropSucceeded(false);
      resetDragState();
    },
    [
      resetDragState,
      deckId,
      groupDropIndex,
      dragActiveGroupId,
      setDropIndex,
      setDropGroupId,
      isRemoveZone,
      orderedGroups,
      groupBySetId,
      sets,
      selectedSetId,
      selectedGroupId,
      activeSetId,
      setSets,
      setSelectedGroupId,
      createSetFromBackFace,
      addFrontFaceToSet,
      createDeckGroup,
      reorderDeckGroups,
      reorderDeckSets,
      updateDeckSetGroup,
      deleteDeckSet,
      loadDeckDetail,
    ],
  );

  const dragState = useMemo(
    () => ({
      dragActiveSetId,
      dragActiveGroupId,
      dragActiveBackFaceId,
      dragActiveFrontFaceId,
      groupDropIndex,
      setDropIndex,
      setDropGroupId,
      isGroupDropOver,
      isFrontDropOver,
      isRemoveZone,
      isBackFaceDragActive: dragType === "back-face",
      isFrontFaceDragActive: dragType === "front-face",
      isGroupDragActive: dragType === "group",
      isSetDragActive: dragType === "set",
      faceDropSucceeded,
    }),
    [
      dragActiveSetId,
      dragActiveGroupId,
      dragActiveBackFaceId,
      dragActiveFrontFaceId,
      groupDropIndex,
      setDropIndex,
      setDropGroupId,
      isGroupDropOver,
      isFrontDropOver,
      isRemoveZone,
      dragType,
      faceDropSucceeded,
    ],
  );

  const onDragCancel = useCallback(() => {
    setFaceDropSucceeded(false);
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
