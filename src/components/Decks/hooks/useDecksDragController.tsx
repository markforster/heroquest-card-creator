"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import type { DeckEntryRecord, DeckGroupRecord, DeckSetRecord } from "@/api/decks";

type DragType = "set" | "group" | "back-face" | "front-face" | "entry" | null;

type DecksDragControllerArgs = {
  deckId: string | null;
  orderedGroups: DeckGroupRecord[];
  sets: DeckSetRecord[];
  groupBySetId: Map<string, string>;
  selectedGroupId: string | null;
  selectedSetId: string | null;
  activeSetId: string | null;
  entries: DeckEntryRecord[];
  entryFrontIdByEntryId: Map<string, string>;
  setSelectedGroupId: (groupId: string | null) => void;
  createSetFromBackFace: (
    deckId: string,
    groupId: string,
    backFaceId: string,
  ) => Promise<DeckSetRecord>;
  addFrontFaceToSet: (setId: string, frontFaceId: string) => Promise<DeckEntryRecord[]>;
  reorderSetEntries: (setId: string, orderedEntryIds: string[]) => Promise<void>;
  createDeckGroup: (deckId: string) => Promise<DeckGroupRecord>;
  reorderDeckGroups: (deckId: string, orderedGroupIds: string[]) => Promise<void>;
  reorderDeckSets: (setIdForParams: string, orderedSetIds: string[]) => Promise<void>;
  updateDeckSetGroup: (setId: string, groupId: string) => Promise<void>;
  deleteDeckSet: (setId: string) => Promise<void>;
  deleteDeckGroup: (groupId: string) => Promise<void>;
  reloadStructure: (preferredSetId?: string | null) => Promise<void>;
  refreshSetEntries: (setId: string) => Promise<void>;
};

export function useDecksDragController({
  deckId,
  orderedGroups,
  sets,
  groupBySetId,
  selectedGroupId,
  selectedSetId,
  activeSetId,
  entries,
  entryFrontIdByEntryId,
  setSelectedGroupId,
  createSetFromBackFace,
  addFrontFaceToSet,
  reorderSetEntries,
  createDeckGroup,
  reorderDeckGroups,
  reorderDeckSets,
  updateDeckSetGroup,
  deleteDeckSet,
  deleteDeckGroup,
  reloadStructure,
  refreshSetEntries,
}: DecksDragControllerArgs) {
  const [dragType, setDragType] = useState<DragType>(null);
  const [dragActiveSetId, setDragActiveSetId] = useState<string | null>(null);
  const [dragActiveGroupId, setDragActiveGroupId] = useState<string | null>(null);
  const [dragActiveBackFaceId, setDragActiveBackFaceId] = useState<string | null>(null);
  const [dragActiveFrontFaceId, setDragActiveFrontFaceId] = useState<string | null>(null);
  const [dragActiveEntryId, setDragActiveEntryId] = useState<string | null>(null);
  const [dragTargetGroupId, setDragTargetGroupId] = useState<string | null>(null);
  const [backFaceDropGroupId, setBackFaceDropGroupId] = useState<string | null>(null);
  const [backFaceDropIndex, setBackFaceDropIndex] = useState<number | null>(null);
  const [isBackFaceNewGroupEdgeTarget, setIsBackFaceNewGroupEdgeTarget] = useState(false);
  const [groupDropIndex, setGroupDropIndex] = useState<number | null>(null);
  const [setDropIndex, setSetDropIndex] = useState<number | null>(null);
  const [setDropGroupId, setSetDropGroupId] = useState<string | null>(null);
  const [entryDropIndex, setEntryDropIndex] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isGroupDropOver, setIsGroupDropOver] = useState(false);
  const [isFrontDropOver, setIsFrontDropOver] = useState(false);
  const [isEntriesDropOver, setIsEntriesDropOver] = useState(false);
  const [isRemoveZone, setIsRemoveZone] = useState(false);
  const [faceDropSucceeded, setFaceDropSucceeded] = useState(false);
  const groupRowRef = useRef<HTMLDivElement | null>(null);
  const entriesRowRef = useRef<HTMLDivElement | null>(null);
  const backFaceResetTimerRef = useRef<number | null>(null);
  const dragOverIdRef = useRef<string | null>(null);
  const isFrontDropOverRef = useRef(false);
  const isEntriesDropOverRef = useRef(false);
  const entryDropIndexRef = useRef<number | null>(null);
  const selectedSetIdRef = useRef<string | null>(selectedSetId);
  const selectedGroupIdRef = useRef<string | null>(selectedGroupId);
  const dragStartSelectedSetIdRef = useRef<string | null>(null);
  const dragStartSelectedGroupIdRef = useRef<string | null>(null);
  const frontDropInFlightRef = useRef(false);
  const frontDropInFlightKeyRef = useRef<string | null>(null);
  const rawOverIdRef = useRef<string | null>(null);
  const committedOverIdRef = useRef<string | null>(null);
  const overStabilityTimerRef = useRef<number | null>(null);
  const lastCommittedAtRef = useRef<number>(0);
  const lastCommittedPointerXRef = useRef<number | null>(null);
  const BACK_FACE_DROP_RETURN_MS = 180;
  const OVER_STABILITY_MS = 32;
  const FRONT_FACE_INDEX_SWITCH_MIN_PX = 14;
  const isEntriesOverTarget = useCallback(
    (overId: string | null, activeType: "front-face" | "entry", activeEntryId?: string | null) => {
      if (!overId) return false;
      if (overId === "entries-area" || overId === "entries-tail") return true;
      if (overId.startsWith("entry:")) return true;
      const orderedCurrent = entries
        .slice()
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .map((entry) => entry.id);
      const visibleOrdered =
        activeType === "entry" && activeEntryId
          ? orderedCurrent.filter((id) => id !== activeEntryId)
          : orderedCurrent;
      return visibleOrdered.includes(overId);
    },
    [entries],
  );
  const resolveEntryDropIndexFromOverId = useCallback(
    (overId: string | null, activeType: "front-face" | "entry", activeEntryId?: string | null) => {
      if (!overId) return null;
      const orderedCurrent = entries
        .slice()
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .map((entry) => entry.id);
      const visibleOrdered =
        activeType === "entry" && activeEntryId
          ? orderedCurrent.filter((id) => id !== activeEntryId)
          : orderedCurrent;
      if (overId.startsWith("entry:")) {
        const overEntryId = overId.replace("entry:", "");
        const index = visibleOrdered.indexOf(overEntryId);
        return index >= 0 ? index : visibleOrdered.length;
      }
      const plainIndex = visibleOrdered.indexOf(overId);
      if (plainIndex >= 0) {
        return plainIndex;
      }
      if (overId === "entries-tail" || overId === "entries-area") {
        return visibleOrdered.length;
      }
      return null;
    },
    [entries],
  );

  const resolveEntryDropIndexFromOverIdWithPointer = useCallback(
    (
      overId: string | null,
      activeType: "front-face" | "entry",
      activeEntryId: string | null | undefined,
      pointerX: number | null,
      overRect: { left: number; width: number } | null,
    ) => {
      const fallback = resolveEntryDropIndexFromOverId(overId, activeType, activeEntryId);
      if (activeType !== "entry" || !overId || pointerX == null || !overRect) {
        return fallback;
      }
      const overEntryId = overId.startsWith("entry:") ? overId.replace("entry:", "") : overId;
      const orderedCurrent = entries
        .slice()
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .map((entry) => entry.id);
      const visibleOrdered = activeEntryId
        ? orderedCurrent.filter((id) => id !== activeEntryId)
        : orderedCurrent;
      const baseIndex = visibleOrdered.indexOf(overEntryId);
      if (baseIndex < 0) return fallback;
      const overMidX = overRect.left + overRect.width / 2;
      const insertAfter = pointerX >= overMidX;
      return Math.max(0, Math.min(baseIndex + (insertAfter ? 1 : 0), visibleOrdered.length));
    },
    [entries, resolveEntryDropIndexFromOverId],
  );

  useEffect(() => {
    selectedSetIdRef.current = selectedSetId;
  }, [selectedSetId]);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  useEffect(
    () => () => {
      if (overStabilityTimerRef.current != null) {
        window.clearTimeout(overStabilityTimerRef.current);
        overStabilityTimerRef.current = null;
      }
    },
    [],
  );

  const resetDragState = useCallback(() => {
    setDragType(null);
    setDragActiveSetId(null);
    setDragActiveGroupId(null);
    setDragActiveBackFaceId(null);
    setDragActiveFrontFaceId(null);
    setDragActiveEntryId(null);
    setDragTargetGroupId(null);
    setBackFaceDropGroupId(null);
    setBackFaceDropIndex(null);
    setIsBackFaceNewGroupEdgeTarget(false);
    setGroupDropIndex(null);
    setSetDropIndex(null);
    setSetDropGroupId(null);
    setEntryDropIndex(null);
    entryDropIndexRef.current = null;
    setDragOverId(null);
    dragOverIdRef.current = null;
    rawOverIdRef.current = null;
    committedOverIdRef.current = null;
    lastCommittedAtRef.current = 0;
    lastCommittedPointerXRef.current = null;
    setIsGroupDropOver(false);
    setIsFrontDropOver(false);
    setIsEntriesDropOver(false);
    isEntriesDropOverRef.current = false;
    isFrontDropOverRef.current = false;
    setIsRemoveZone(false);
    dragStartSelectedSetIdRef.current = null;
    dragStartSelectedGroupIdRef.current = null;
    if (backFaceResetTimerRef.current != null) {
      window.clearTimeout(backFaceResetTimerRef.current);
      backFaceResetTimerRef.current = null;
    }
    if (overStabilityTimerRef.current != null) {
      window.clearTimeout(overStabilityTimerRef.current);
      overStabilityTimerRef.current = null;
    }
  }, []);

  const setEntryDropIndexState = useCallback((next: number | null) => {
    if (entryDropIndexRef.current === next) return;
    entryDropIndexRef.current = next;
    setEntryDropIndex(next);
  }, []);

  const onDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      const activeType = active.data?.current?.type;
      if (backFaceResetTimerRef.current != null) {
        window.clearTimeout(backFaceResetTimerRef.current);
        backFaceResetTimerRef.current = null;
      }
      setFaceDropSucceeded(false);
      rawOverIdRef.current = null;
      committedOverIdRef.current = null;
      lastCommittedAtRef.current = 0;
      lastCommittedPointerXRef.current = null;
      if (overStabilityTimerRef.current != null) {
        window.clearTimeout(overStabilityTimerRef.current);
        overStabilityTimerRef.current = null;
      }
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
        return;
      }
      if (activeType === "entry") {
        const entryId = active.data?.current?.entryId as string | undefined;
        setDragType("entry");
        setDragActiveEntryId(entryId ?? String(active.id));
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
        dragType !== "front-face" &&
        dragType !== "entry"
      ) {
        return;
      }
      if (dragType === "front-face" || dragType === "entry") {
        return;
      }
      const row = groupRowRef.current;
      if (!row) return;
      const tiles = Array.from(row.querySelectorAll("[data-group-id]"));
      const initialRect = event.active.rect.current.initial;
      const translatedRect = event.active.rect.current.translated;
      const pointerX =
        initialRect != null
          ? initialRect.left + initialRect.width / 2 + (event.delta?.x ?? 0)
          : translatedRect
            ? translatedRect.left + translatedRect.width / 2
            : null;
      const pointerY =
        initialRect != null
          ? initialRect.top + initialRect.height / 2 + (event.delta?.y ?? 0)
          : translatedRect
            ? translatedRect.top + translatedRect.height / 2
            : null;
      if (pointerX == null || pointerY == null) return;

      if (dragType === "back-face") {
        if (dragOverId === "groups-new-group-right-edge") {
          setBackFaceDropGroupId(null);
          setBackFaceDropIndex(null);
          setGroupDropIndex(orderedGroups.length);
          setIsBackFaceNewGroupEdgeTarget(true);
          return;
        }

        if (dragOverId?.startsWith("group:")) {
          const rawGroupId = dragOverId.replace("group:", "");
          const groupNode = row.querySelector(`[data-group-id=\"${rawGroupId}\"]`);
          if (!groupNode) {
            setBackFaceDropGroupId(null);
            setBackFaceDropIndex(null);
            setIsBackFaceNewGroupEdgeTarget(false);
            return;
          }
          const setNodes = Array.from(groupNode.querySelectorAll("[data-set-id]"));
          if (!setNodes.length) {
            setBackFaceDropGroupId(rawGroupId);
            setBackFaceDropIndex(0);
            setGroupDropIndex(null);
            setIsBackFaceNewGroupEdgeTarget(false);
            return;
          }
          const centers = setNodes.map((node) => {
            const rect = (node as Element).getBoundingClientRect();
            return rect.left + rect.width / 2;
          });
          let index = centers.findIndex((center) => pointerX < center);
          if (index < 0) index = centers.length;
          setBackFaceDropGroupId(rawGroupId);
          setBackFaceDropIndex(index);
          setGroupDropIndex(null);
          setIsBackFaceNewGroupEdgeTarget(false);
          return;
        }

        setBackFaceDropGroupId(null);
        setBackFaceDropIndex(null);
        setIsBackFaceNewGroupEdgeTarget(false);
      }

      if (dragType === "set") {
        // Phase 3B: do not treat outside-row drags as destructive deletes.
        // Placeholder targeting for set drags is derived from onDragOver droppable ids.
        setIsRemoveZone(false);
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
    [
      dragType,
      dragOverId,
      groupBySetId,
      orderedGroups.length,
    ],
  );

  const onDragOver = useCallback(
    ({ over, active, delta }: DragOverEvent) => {
      const overId = over ? String(over.id) : null;
      rawOverIdRef.current = overId;
      const activeType = active.data?.current?.type;
      const activeEntryId =
        activeType === "entry" ? ((active.data?.current?.entryId as string | undefined) ?? null) : null;
      const activeSetId =
        activeType === "set"
          ? ((active.data?.current?.setId as string | undefined) ?? String(active.id))
          : null;
      const normalizedActiveSetId =
        activeSetId && activeSetId.startsWith("set:") ? activeSetId.replace("set:", "") : activeSetId;
      const activeRectCurrent = active.rect?.current;
      const activeInitialRect = activeRectCurrent?.initial ?? null;
      const activeTranslatedRect = activeRectCurrent?.translated ?? null;
      const pointerX =
        activeInitialRect != null
          ? activeInitialRect.left + activeInitialRect.width / 2 + (delta?.x ?? 0)
          : activeTranslatedRect
            ? activeTranslatedRect.left + activeTranslatedRect.width / 2
            : null;
      setDragOverId((prev) => (prev === overId ? prev : overId));
      dragOverIdRef.current = overId;
      const nextDragTargetGroupId =
        activeType === "back-face" || activeType === "set" || activeType === "group"
          ? overId?.startsWith("group:")
            ? overId.replace("group:", "")
            : activeType === "set" && overId?.startsWith("set:")
              ? groupBySetId.get(overId.replace("set:", "")) ?? null
              : null
          : null;
      setDragTargetGroupId((prev) => (prev === nextDragTargetGroupId ? prev : nextDragTargetGroupId));
      const isOverGroupRow =
        activeType !== "front-face" &&
        Boolean(
          overId &&
            (overId === "groups-empty" ||
              overId === "groups-area" ||
              overId === "groups-new-group-right-edge" ||
              ((activeType === "group" || activeType === "set") && overId.startsWith("group:"))),
        );
      setIsGroupDropOver((prev) => (prev === isOverGroupRow ? prev : isOverGroupRow));
      const isFrontOrEntryDrag = activeType === "front-face" || activeType === "entry";
      const commitEntryOver = (nextCommittedOverId: string | null) => {
        committedOverIdRef.current = nextCommittedOverId;
        lastCommittedAtRef.current = Date.now();
        lastCommittedPointerXRef.current = pointerX;
        const activeKind: "front-face" | "entry" = activeType === "entry" ? "entry" : "front-face";
        const nextIndex = resolveEntryDropIndexFromOverIdWithPointer(
          nextCommittedOverId,
          activeKind,
          activeEntryId,
          pointerX,
          over?.rect ? { left: over.rect.left, width: over.rect.width } : null,
        );
        setEntryDropIndexState(nextIndex);
        const nextFront = Boolean(activeType === "front-face" && isEntriesOverTarget(nextCommittedOverId, "front-face"));
        const nextEntries = Boolean(
          isEntriesOverTarget(nextCommittedOverId, activeKind, activeEntryId),
        );
        setIsFrontDropOver((prev) => (prev === nextFront ? prev : nextFront));
        isFrontDropOverRef.current = nextFront;
        setIsEntriesDropOver((prev) => (prev === nextEntries ? prev : nextEntries));
        isEntriesDropOverRef.current = nextEntries;
      };
      if (isFrontOrEntryDrag) {
        const activeKind: "front-face" | "entry" = activeType === "entry" ? "entry" : "front-face";
        const validNow = isEntriesOverTarget(overId, activeKind, activeEntryId);
        if (overStabilityTimerRef.current != null) {
          window.clearTimeout(overStabilityTimerRef.current);
          overStabilityTimerRef.current = null;
        }
        if (validNow) {
          const nextIndex = resolveEntryDropIndexFromOverIdWithPointer(
            overId,
            activeKind,
            activeEntryId,
            pointerX,
            over?.rect ? { left: over.rect.left, width: over.rect.width } : null,
          );
          const currentIndex =
            entryDropIndexRef.current ??
            resolveEntryDropIndexFromOverIdWithPointer(
              committedOverIdRef.current,
              activeKind,
              activeEntryId,
              pointerX,
              over?.rect ? { left: over.rect.left, width: over.rect.width } : null,
            );
          const canSwitchIndexByPointer =
            activeType !== "front-face" ||
            pointerX == null ||
            lastCommittedPointerXRef.current == null ||
            Math.abs(pointerX - lastCommittedPointerXRef.current) >= FRONT_FACE_INDEX_SWITCH_MIN_PX;
          if (
            committedOverIdRef.current !== overId ||
            (nextIndex !== currentIndex && canSwitchIndexByPointer)
          ) {
            commitEntryOver(overId);
          }
        } else if (committedOverIdRef.current != null) {
          overStabilityTimerRef.current = window.setTimeout(() => {
            const latestRaw = rawOverIdRef.current;
            if (!isEntriesOverTarget(latestRaw, activeKind, activeEntryId)) {
              commitEntryOver(null);
            }
            overStabilityTimerRef.current = null;
          }, OVER_STABILITY_MS);
        } else {
          setEntryDropIndexState(null);
          setIsFrontDropOver((prev) => (prev ? false : prev));
          isFrontDropOverRef.current = false;
          setIsEntriesDropOver((prev) => (prev ? false : prev));
          isEntriesDropOverRef.current = false;
        }
      }
      if (!isFrontOrEntryDrag) {
        const nextFrontDropOver = Boolean(
          activeType === "front-face" &&
            isEntriesOverTarget(committedOverIdRef.current, "front-face"),
        );
        setIsFrontDropOver((prev) => (prev === nextFrontDropOver ? prev : nextFrontDropOver));
        isFrontDropOverRef.current = nextFrontDropOver;
        const nextEntriesDropOver = Boolean(
          (activeType === "front-face" || activeType === "entry") &&
            isEntriesOverTarget(
              committedOverIdRef.current,
              activeType === "entry" ? "entry" : "front-face",
              activeEntryId,
            ),
        );
        setIsEntriesDropOver((prev) => (prev === nextEntriesDropOver ? prev : nextEntriesDropOver));
        isEntriesDropOverRef.current = nextEntriesDropOver;
      }
      if (activeType === "set") {
        // Derive set placeholder from the hovered droppable target.
        // This keeps same-group reorder stable and independent of overlay offset.
        if (!overId) {
          setSetDropGroupId(null);
          setSetDropIndex(null);
          setGroupDropIndex(null);
          return;
        }
        if (
          overId === "groups-area" ||
          overId === "groups-empty" ||
          overId === "groups-new-group-right-edge"
        ) {
          setSetDropGroupId(null);
          setSetDropIndex(null);
          const row = groupRowRef.current;
          if (!row) {
            setGroupDropIndex(null);
            return;
          }
          const tiles = Array.from(row.querySelectorAll("[data-group-id]"));
          const pointerX =
            activeInitialRect != null
              ? activeInitialRect.left + activeInitialRect.width / 2 + (delta?.x ?? 0)
              : activeTranslatedRect
                ? activeTranslatedRect.left + activeTranslatedRect.width / 2
                : null;
          if (pointerX == null) {
            setGroupDropIndex(tiles.length);
            return;
          }
          const centers = tiles.map((node) => {
            const rect = (node as HTMLElement).getBoundingClientRect();
            return rect.left + rect.width / 2;
          });
          let index = centers.findIndex((center) => pointerX < center);
          if (index < 0) index = centers.length;
          setGroupDropIndex(index);
          return;
        }
        if (overId.startsWith("group:")) {
          const targetGroupId = overId.replace("group:", "");
          const targetOrdered = sets
            .filter((set) => set.groupId === targetGroupId)
            .sort((a, b) => a.sortIndex - b.sortIndex)
            .map((set) => set.id)
            .filter((setId) => setId !== normalizedActiveSetId);
          setSetDropGroupId(targetGroupId);
          setSetDropIndex(targetOrdered.length);
          setGroupDropIndex(null);
          return;
        }
        if (overId.startsWith("set:")) {
          const overSetId = overId.replace("set:", "");
          const targetGroupId = groupBySetId.get(overSetId) ?? null;
          if (!targetGroupId) {
            setSetDropGroupId(null);
            setSetDropIndex(null);
            setGroupDropIndex(null);
            return;
          }
          const targetOrdered = sets
            .filter((set) => set.groupId === targetGroupId)
            .sort((a, b) => a.sortIndex - b.sortIndex)
            .map((set) => set.id)
            .filter((setId) => setId !== normalizedActiveSetId);
          const baseIndex = Math.max(0, targetOrdered.indexOf(overSetId));
          const activeRectCurrent = active.rect?.current;
          const activeInitialRect = activeRectCurrent?.initial ?? null;
          const activeTranslatedRect = activeRectCurrent?.translated ?? null;
          const pointerX =
            activeInitialRect != null
              ? activeInitialRect.left + activeInitialRect.width / 2 + (delta?.x ?? 0)
              : activeTranslatedRect
                ? activeTranslatedRect.left + activeTranslatedRect.width / 2
                : null;
          const overMidX = over?.rect ? over.rect.left + over.rect.width / 2 : null;
          const insertAfter = pointerX != null && overMidX != null && pointerX >= overMidX;
          const nextIndex = baseIndex + (insertAfter ? 1 : 0);
          setSetDropGroupId(targetGroupId);
          setSetDropIndex(Math.max(0, Math.min(nextIndex, targetOrdered.length)));
          setGroupDropIndex(null);
          return;
        }
        setSetDropGroupId(null);
        setSetDropIndex(null);
        setGroupDropIndex(null);
      }
      if (activeType === "back-face" && overId === "groups-empty") {
        setBackFaceDropGroupId(null);
        setBackFaceDropIndex(null);
        setGroupDropIndex(0);
        setIsBackFaceNewGroupEdgeTarget(false);
      }
    },
    [groupBySetId, isEntriesOverTarget, resolveEntryDropIndexFromOverId, setEntryDropIndexState, sets],
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
        if (sets.some((set) => set.backFaceId === backFaceId)) {
          setFaceDropSucceeded(false);
          resetDragState();
          return;
        }
        const overId = String(over.id);
        const isSuccess =
          overId.startsWith("group:") ||
          overId === "groups-area" ||
          overId === "groups-empty" ||
          overId === "groups-new-group-right-edge";
        setFaceDropSucceeded(isSuccess);
        const targetGroupId = overId.startsWith("group:") ? overId.replace("group:", "") : null;
        if (targetGroupId) {
          const createdSet = await createSetFromBackFace(deckId, targetGroupId, backFaceId);
          if (backFaceDropGroupId === targetGroupId && backFaceDropIndex != null) {
            const targetOrdered = sets
              .filter((set) => set.groupId === targetGroupId)
              .sort((a, b) => a.sortIndex - b.sortIndex)
              .map((set) => set.id);
            const ordered = [...targetOrdered];
            const boundedIndex = Math.max(0, Math.min(backFaceDropIndex, ordered.length));
            ordered.splice(boundedIndex, 0, createdSet.id);
            await reorderDeckSets(createdSet.id, ordered);
          }
          resetDragState();
          await reloadStructure(createdSet.id);
          return;
        }
        if (
          overId === "groups-empty" ||
          overId === "groups-area" ||
          overId === "groups-new-group-right-edge"
        ) {
          const group = await createDeckGroup(deckId);
          try {
            if (groupDropIndex != null) {
              const orderedGroupIds = [...orderedGroups.map((entry) => entry.id)];
              const nextIndex = Math.max(0, Math.min(groupDropIndex, orderedGroupIds.length));
              orderedGroupIds.splice(nextIndex, 0, group.id);
              await reorderDeckGroups(deckId, orderedGroupIds);
            }
            const createdSet = await createSetFromBackFace(deckId, group.id, backFaceId);
            resetDragState();
            await reloadStructure(createdSet.id);
          } catch (error) {
            await deleteDeckGroup(group.id);
            await reloadStructure();
            throw error;
          }
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
        const overId = over ? String(over.id) : committedOverIdRef.current ?? dragOverIdRef.current;
        const isSuccess = Boolean(
          isEntriesOverTarget(overId, "front-face"),
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
          const prevEntries = entries.slice().sort((a, b) => a.sortIndex - b.sortIndex);
          const createdEntries = await addFrontFaceToSet(targetSetId, frontFaceId);
          if (!createdEntries.length) {
            await refreshSetEntries(targetSetId);
            console.debug("[decks:dnd] front drop add no-op", { targetSetId, frontFaceId, overId });
            resetDragState();
            return;
          }
          if (createdEntries.length > 1) {
            console.warn("[decks:dnd] front drop add returned multiple entries; using first", {
              targetSetId,
              frontFaceId,
              createdCount: createdEntries.length,
            });
          }
          const newEntryId = createdEntries[0]?.id ?? null;
          if (!newEntryId) {
            await refreshSetEntries(targetSetId);
            resetDragState();
            return;
          }
          const ordered = prevEntries.map((entry) => entry.id).filter((id) => id !== newEntryId);
          const resolvedDropIndex =
            entryDropIndexRef.current ?? resolveEntryDropIndexFromOverId(overId, "front-face");
          const dropIndex =
            resolvedDropIndex == null
              ? ordered.length
              : Math.max(0, Math.min(resolvedDropIndex, ordered.length));
          ordered.splice(dropIndex, 0, newEntryId);
          await reorderSetEntries(targetSetId, ordered);
          await refreshSetEntries(targetSetId);
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
      if (activeType === "entry") {
      const entryId = active.data?.current?.entryId as string | undefined;
        const targetSetId = selectedSetIdRef.current ?? activeSetId;
        if (!entryId || !targetSetId) {
          resetDragState();
          return;
        }
        const overId = over ? String(over.id) : committedOverIdRef.current ?? dragOverIdRef.current;
        const isSuccess = Boolean(
          isEntriesOverTarget(overId, "entry", entryId),
        );
        if (!isSuccess) {
          resetDragState();
          return;
        }
        const orderedCurrent = entries.slice().sort((a, b) => a.sortIndex - b.sortIndex).map((entry) => entry.id);
        const fromIndex = orderedCurrent.indexOf(entryId);
        if (fromIndex < 0) {
          resetDragState();
          return;
        }
        let overEntryId: string | null = null;
        if (overId?.startsWith("entry:")) {
          overEntryId = overId.replace("entry:", "");
        } else if (overId && orderedCurrent.includes(overId)) {
          overEntryId = overId;
        }
        let toIndex: number | null = null;
        if (overId === "entries-tail" || overId === "entries-area") {
          toIndex = Math.max(0, orderedCurrent.length - 1);
        } else if (overEntryId) {
          const overIndex = orderedCurrent.indexOf(overEntryId);
          toIndex = overIndex >= 0 ? overIndex : null;
        }
        if (toIndex == null) {
          resetDragState();
          return;
        }
        const next = [...orderedCurrent];
        const [moved] = next.splice(fromIndex, 1);
        const boundedTo = Math.max(0, Math.min(toIndex, next.length));
        next.splice(boundedTo, 0, moved);
        if (next.join("|") === orderedCurrent.join("|")) {
          resetDragState();
          return;
        }
        try {
          await reorderSetEntries(targetSetId, next);
          await refreshSetEntries(targetSetId);
        } catch {
          await refreshSetEntries(targetSetId);
        } finally {
          resetDragState();
        }
        return;
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
        await reloadStructure(selectedSetId);
        resetDragState();
        return;
      }
      const activeId = dragActiveSetId ?? String(active.id);
      const normalizedActiveId = activeId.startsWith("set:") ? activeId.replace("set:", "") : activeId;
      // Phase 3B: do not delete sets by dragging outside the row bounds.
      // Deletion is an explicit action (Phase 3A), not an implicit drag-outside behavior.
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
        : (groupBySetId.get(normalizedOverId) ?? null);
      const isNewGroupDropTarget =
        overId === "groups-area" ||
        overId === "groups-empty" ||
        overId === "groups-new-group-right-edge";
      if (!targetGroupId && !isNewGroupDropTarget) {
        resetDragState();
        return;
      }

      if (!targetGroupId && isNewGroupDropTarget && deckId) {
        const sourceOrdered = sets
          .filter((set) => set.groupId === sourceGroupId)
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((set) => set.id);
        const fromIndex = sourceOrdered.indexOf(normalizedActiveId);
        if (fromIndex < 0) {
          resetDragState();
          return;
        }
        const nextSource = [...sourceOrdered];
        nextSource.splice(fromIndex, 1);
        const group = await createDeckGroup(deckId);
        try {
          if (groupDropIndex != null) {
            const orderedGroupIds = [...orderedGroups.map((entry) => entry.id)];
            const nextIndex = Math.max(0, Math.min(groupDropIndex, orderedGroupIds.length));
            orderedGroupIds.splice(nextIndex, 0, group.id);
            await reorderDeckGroups(deckId, orderedGroupIds);
          }
          await updateDeckSetGroup(normalizedActiveId, group.id);
          await reorderDeckSets(normalizedActiveId, [normalizedActiveId]);
          if (nextSource.length > 0) {
            await reorderDeckSets(nextSource[0], nextSource);
          } else {
            await deleteDeckGroup(sourceGroupId);
          }
          if (normalizedActiveId === selectedSetId) {
            setSelectedGroupId(group.id);
          }
          await reloadStructure(normalizedActiveId);
        } catch (error) {
          await deleteDeckGroup(group.id);
          await reloadStructure(activeSetId);
          throw error;
        }
        setFaceDropSucceeded(false);
        resetDragState();
        return;
      }
      if (!targetGroupId) {
        resetDragState();
        return;
      }

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

      let toIndex =
        setDropGroupId === targetGroupId && setDropIndex != null
          ? setDropIndex
          : sourceGroupId === targetGroupId
            ? Math.max(0, targetOrdered.indexOf(normalizedOverId))
            : overId.startsWith("group:")
              ? targetOrdered.length
              : Math.max(0, targetOrdered.indexOf(normalizedOverId));
      if (sourceGroupId === targetGroupId && toIndex > fromIndex) {
        toIndex -= 1;
      }
      toIndex = Math.max(0, Math.min(toIndex, nextSource.length));
      const nextTarget = sourceGroupId === targetGroupId ? nextSource : [...targetOrdered];
      nextTarget.splice(toIndex, 0, normalizedActiveId);

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
          } else {
            await deleteDeckGroup(sourceGroupId);
          }
        }
        if (normalizedActiveId === selectedSetId && sourceGroupId !== targetGroupId) {
          setSelectedGroupId(targetGroupId);
        }
        await reloadStructure(sourceGroupId === targetGroupId ? normalizedActiveId : selectedSetId);
      } catch (error) {
        await reloadStructure(activeSetId);
        throw error;
      }
      setFaceDropSucceeded(false);
      resetDragState();
    },
    [
      resetDragState,
      deckId,
      groupDropIndex,
      backFaceDropGroupId,
      backFaceDropIndex,
      dragActiveGroupId,
      setDropIndex,
      setDropGroupId,
      entryDropIndex,
      isRemoveZone,
      isEntriesDropOver,
      orderedGroups,
      groupBySetId,
      sets,
      selectedSetId,
      selectedGroupId,
      activeSetId,
      setSelectedGroupId,
      createSetFromBackFace,
      addFrontFaceToSet,
      createDeckGroup,
      reorderDeckGroups,
      reorderDeckSets,
      updateDeckSetGroup,
      deleteDeckSet,
      deleteDeckGroup,
      reloadStructure,
      entries,
      entryFrontIdByEntryId,
      reorderSetEntries,
      refreshSetEntries,
      resolveEntryDropIndexFromOverId,
      resolveEntryDropIndexFromOverIdWithPointer,
    ],
  );

  const dragState = useMemo(
    () => ({
      dragActiveSetId,
      dragActiveGroupId,
      dragActiveBackFaceId,
      dragActiveFrontFaceId,
      dragActiveEntryId,
      dragTargetGroupId,
      backFaceDropGroupId,
      backFaceDropIndex,
      isBackFaceNewGroupEdgeTarget,
      groupDropIndex,
      setDropIndex,
      setDropGroupId,
      entryDropIndex,
      isGroupDropOver,
      isFrontDropOver,
      isEntriesDropOver,
      isRemoveZone,
      isBackFaceDragActive: dragType === "back-face",
      isFrontFaceDragActive: dragType === "front-face",
      isEntryDragActive: dragType === "entry",
      isGroupDragActive: dragType === "group",
      isSetDragActive: dragType === "set",
      faceDropSucceeded,
    }),
    [
      dragActiveSetId,
      dragActiveGroupId,
      dragActiveBackFaceId,
      dragActiveFrontFaceId,
      dragActiveEntryId,
      dragTargetGroupId,
      backFaceDropGroupId,
      backFaceDropIndex,
      isBackFaceNewGroupEdgeTarget,
      groupDropIndex,
      setDropIndex,
      setDropGroupId,
      entryDropIndex,
      isGroupDropOver,
      isFrontDropOver,
      isEntriesDropOver,
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
  const entriesRowRefSetter = useCallback((node: HTMLDivElement | null) => {
    entriesRowRef.current = node;
  }, []);

  return {
    dragState,
    dndHandlers,
    groupRowRef: groupRowRefSetter,
    entriesRowRef: entriesRowRefSetter,
  };
}
