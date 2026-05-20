"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gem, Trash2 } from "lucide-react";
import { useDeckDetailSelection } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import { useDeckMutations } from "@/components/Decks/hooks/useDeckMutations";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "../DeckGroupsSection2.module.css";
import {
  BOARD_ROUTING_META_BY_ID,
  BoardInfoPill,
  DefaultSetThumbnailContent,
  DeckSortableBoardView,
  type DeckSortableBoardViewModel,
  useDeckMockDnd,
  useDeckSortableBoardViewModel,
} from "./DeckBoardsCore";
import {
  FAN_CARD_HEIGHT,
  FAN_CARD_WIDTH,
  resolveFanFrame,
  type GroupFanMode,
} from "./deckGroupFanMath";

const FAN_SHELL_TOOLBAR_TOP_PX = 16;
const EMPTY_GROUP_MIN_WIDTH_PX = 112 + 24;
const EMPTY_GROUP_MIN_HEIGHT_PX = Math.ceil(FAN_CARD_HEIGHT) + 24;
const normalizeGroupId = (groupId: string) => (groupId.startsWith("group:") ? groupId.slice(6) : groupId);
const isTransientEphemeralGroupId = (groupId: string) => /^groups:N\d+$/.test(groupId);

export default function DeckGroupsBoardController({
  deckId,
  keySetId,
  enableFanLayout = false,
  onRequestDeleteSet,
}: {
  deckId: string | null;
  keySetId: string | null;
  enableFanLayout?: boolean;
  onRequestDeleteSet?: (setId: string) => Promise<void>;
}) {
  const mutations = useDeckMutations();
  const { t } = useI18n();
  let selection: ReturnType<typeof useDeckDetailSelection> | null = null;
  try {
    selection = useDeckDetailSelection();
  } catch {
    selection = null;
  }
  const { registerDropHandler } = useDeckMockDnd();
  const selectedSetGroupId =
    selection?.selectedSetId ? selection.setById.get(selection.selectedSetId)?.groupId ?? null : null;
  const selectedGroupId = selection?.selectedGroupId ?? null;
  const [persistedOpenGroupId, setPersistedOpenGroupId] = useState<string | null>(null);
  const resolveGroupMode = useCallback(
    (groupUiId: string, isHovered: boolean, hasSelectedSet: boolean, setCount: number): GroupFanMode => {
      const groupId = normalizeGroupId(groupUiId);
      if (setCount <= 1) return "expanded";
      if (hasSelectedSet || selectedSetGroupId === groupId) return "expanded";
      if (persistedOpenGroupId === groupId) return "expanded";
      if (isHovered) return "partial";
      return "collapsed";
    },
    [persistedOpenGroupId, selectedSetGroupId],
  );
  const setCountByGroupId = useMemo(() => {
    const counts = new Map<string, number>();
    selection?.sets.forEach((set) => {
      counts.set(set.groupId, (counts.get(set.groupId) ?? 0) + 1);
    });
    return counts;
  }, [selection]);
  const canSortGroups = false;

  const desiredModeByGroupRef = useRef<Record<string, GroupFanMode>>({});
  const rafByGroupRef = useRef<Record<string, number>>({});
  const revealRequestIdRef = useRef(0);
  const revealRafRef = useRef<number | null>(null);
  const revealTimeoutRef = useRef<number | null>(null);
  const lastRevealSetIdRef = useRef<string | null>(null);
  const [transitionByGroup, setTransitionByGroup] = useState<
    Record<string, { from: GroupFanMode; to: GroupFanMode; progress: number }>
  >({});
  const easeOutCubic = useCallback((value: number) => 1 - (1 - value) ** 3, []);
  const noteDesiredMode = useCallback((groupId: string, mode: GroupFanMode) => {
    desiredModeByGroupRef.current[groupId] = mode;
  }, []);
  const cancelGroupAnimation = useCallback((groupId: string) => {
    const handle = rafByGroupRef.current[groupId];
    if (!handle) return;
    cancelAnimationFrame(handle);
    delete rafByGroupRef.current[groupId];
  }, []);

  const startGroupAnimation = useCallback(
    (groupId: string, from: GroupFanMode, to: GroupFanMode) => {
      cancelGroupAnimation(groupId);
      if (from === to) return;
      const start = performance.now();
      const durationMs = 100;
      const tick = (now: number) => {
        const linearProgress = Math.min(1, Math.max(0, (now - start) / durationMs));
        const easedProgress = easeOutCubic(linearProgress);
        setTransitionByGroup((current) => {
          const existing = current[groupId];
          if (!existing || existing.from !== from || existing.to !== to) return current;
          return { ...current, [groupId]: { ...existing, progress: easedProgress } };
        });
        if (linearProgress >= 1) {
          delete rafByGroupRef.current[groupId];
          return;
        }
        rafByGroupRef.current[groupId] = requestAnimationFrame(tick);
      };
      rafByGroupRef.current[groupId] = requestAnimationFrame(tick);
    },
    [cancelGroupAnimation, easeOutCubic],
  );

  useEffect(() => {
    if (!enableFanLayout) {
      setTransitionByGroup({});
      Object.keys(rafByGroupRef.current).forEach((groupId) => cancelGroupAnimation(groupId));
      desiredModeByGroupRef.current = {};
      return;
    }
    const desiredModeByGroup = desiredModeByGroupRef.current;
    desiredModeByGroupRef.current = {};
    const entries = Object.entries(desiredModeByGroup);
    if (entries.length === 0) return;
    setTransitionByGroup((current) => {
      const next: typeof current = { ...current };
      let didChange = false;
      const desiredIds = new Set<string>();
      entries.forEach(([groupId, targetMode]) => {
        desiredIds.add(groupId);
        const existing = current[groupId];
        if (!existing) {
          next[groupId] = { from: targetMode, to: targetMode, progress: 1 };
          didChange = true;
          return;
        }
        if (existing.to === targetMode) return;
        const fromMode = existing.progress >= 0.5 ? existing.to : existing.from;
        next[groupId] = { from: fromMode, to: targetMode, progress: 0 };
        didChange = true;
        startGroupAnimation(groupId, fromMode, targetMode);
      });
      Object.keys(next).forEach((groupId) => {
        if (desiredIds.has(groupId)) return;
        cancelGroupAnimation(groupId);
        delete next[groupId];
        didChange = true;
      });
      return didChange ? next : current;
    });
  });

  useEffect(
    () => () => {
      if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current);
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
      Object.keys(rafByGroupRef.current).forEach((groupId) => {
        const handle = rafByGroupRef.current[groupId];
        if (handle) cancelAnimationFrame(handle);
      });
      rafByGroupRef.current = {};
    },
    [],
  );

  const resolveAnimatedFrame = useCallback(
    (groupId: string, mode: GroupFanMode, setCount: number) => {
      const transition = transitionByGroup[groupId];
      if (!transition) {
        return resolveFanFrame({
          fromMode: mode,
          toMode: mode,
          progress: 1,
          count: setCount,
        });
      }
      return resolveFanFrame({
        fromMode: transition.from,
        toMode: transition.to,
        progress: transition.progress,
        count: setCount,
      });
    },
    [transitionByGroup],
  );
  const sharedFanMinHeightPx = useMemo(() => {
    if (!enableFanLayout || !selection) return null;
    const setCountByGroupId = new Map<string, number>();
    selection.sets.forEach((set) => {
      setCountByGroupId.set(set.groupId, (setCountByGroupId.get(set.groupId) ?? 0) + 1);
    });
    const maxFrameHeight = selection.orderedGroups.reduce((maxHeight, group) => {
      const setCount = setCountByGroupId.get(group.id) ?? 0;
      const frame = resolveFanFrame({
        fromMode: "partial",
        toMode: "partial",
        progress: 1,
        count: setCount,
      });
      return Math.max(maxHeight, frame.requiredHeightPx);
    }, 0);
    return Math.ceil(maxFrameHeight);
  }, [enableFanLayout, selection]);
  const resolveFanShellPresentation = useCallback(
    (mode: GroupFanMode, frame: ReturnType<typeof resolveFanFrame>, setIndex: number) => {
      const fan = frame.cards[setIndex];
      if (!fan) return null;
      const frameHeightPx = Math.ceil(frame.requiredHeightPx);
      const effectiveBodyHeight = Math.max(frameHeightPx, sharedFanMinHeightPx ?? 0);
      const expandedVerticalCenterOffset =
        mode === "expanded" ? Math.max(0, Math.round((effectiveBodyHeight - frameHeightPx) / 2)) : 0;
      return {
        left: `${fan.pivotX - FAN_CARD_WIDTH / 2}px`,
        top: `${fan.pivotY - FAN_CARD_HEIGHT - FAN_SHELL_TOOLBAR_TOP_PX + expandedVerticalCenterOffset}px`,
        transform: `rotate(${fan.rotateDeg}deg)`,
        transformOrigin: "50% 100%",
        zIndex: fan.zIndex,
      } as const;
    },
    [sharedFanMinHeightPx],
  );

  useEffect(() => {
    if (!persistedOpenGroupId || !selection) return;
    const stillExists = selection.orderedGroups.some((group) => group.id === persistedOpenGroupId);
    if (!stillExists) setPersistedOpenGroupId(null);
  }, [persistedOpenGroupId, selection]);

  useEffect(() => {
    if (!selectedSetGroupId) return;
    if (persistedOpenGroupId === selectedSetGroupId) return;
    setPersistedOpenGroupId(selectedSetGroupId);
  }, [persistedOpenGroupId, selectedSetGroupId]);

  useEffect(() => {
    const selectedSetId = selection?.selectedSetId ?? null;
    if (!selectedSetId) {
      lastRevealSetIdRef.current = null;
      return;
    }
    const selectedSetUiId = `set:${selectedSetId}`;
    if (lastRevealSetIdRef.current === selectedSetUiId) return;
    const selectedGroupId = selection?.setById.get(selectedSetId)?.groupId ?? null;
    const selectedGroupTransition = selectedGroupId ? transitionByGroup[selectedGroupId] : undefined;
    const waitingForExpanded =
      enableFanLayout &&
      Boolean(selectedGroupTransition) &&
      selectedGroupTransition?.to === "expanded" &&
      selectedGroupTransition.progress < 1;
    if (waitingForExpanded) return;

    if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current);
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    const requestId = ++revealRequestIdRef.current;
    const reveal = () => {
      if (requestId !== revealRequestIdRef.current) return;
      const groupsRow = document.querySelector(`[data-testid="groups-row-groups"]`) as HTMLElement | null;
      const selectedSetNode = document.querySelector(
        `[data-testid="set-${selectedSetUiId}"]`,
      ) as HTMLElement | null;
      if (!groupsRow || !selectedSetNode) return;
      const rowRect = groupsRow.getBoundingClientRect();
      const setRect = selectedSetNode.getBoundingClientRect();
      const withinRow =
        setRect.left >= rowRect.left &&
        setRect.right <= rowRect.right &&
        setRect.top >= rowRect.top &&
        setRect.bottom <= rowRect.bottom;
      const withinViewport =
        setRect.left >= 0 &&
        setRect.right <= window.innerWidth &&
        setRect.top >= 0 &&
        setRect.bottom <= window.innerHeight;
      if (!withinRow || !withinViewport) {
        selectedSetNode.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
      lastRevealSetIdRef.current = selectedSetUiId;
    };
    revealRafRef.current = requestAnimationFrame(() => {
      revealRafRef.current = requestAnimationFrame(reveal);
    });
    revealTimeoutRef.current = window.setTimeout(() => {
      if (requestId !== revealRequestIdRef.current) return;
      reveal();
    }, 140);
  }, [enableFanLayout, selection, transitionByGroup]);
  const renderSetContent = useCallback<DeckSortableBoardViewModel["renderSetContent"]>(
    ({ setId, label, cardId, state }) => {
      if (setId.startsWith("ephemeral:empty-slot:group:")) {
        return <div className={styles.setContentEmptySlot} aria-hidden="true" />;
      }
      const rawSetId = setId.startsWith("set:") ? setId.slice(4) : null;
      const resolvedCardId = rawSetId ? selection?.setById.get(rawSetId)?.backFaceId : cardId;
      return (
        <DefaultSetThumbnailContent
          setId={setId}
          cardId={resolvedCardId ?? undefined}
          label={label}
          state={state}
        />
      );
    },
    [selection],
  );
  const model = useDeckSortableBoardViewModel("groups", BOARD_ROUTING_META_BY_ID.groups, {
    allowGroupReorder: canSortGroups,
    renderSetContent,
    renderTopToolbar: ({ setId, isDragging, isGhost }) => {
      if (!setId.startsWith("set:") || isDragging || isGhost) return null;
      if (enableFanLayout) {
        const groupId = selection?.setById.get(setId.slice(4))?.groupId;
        const setCount = groupId ? (setCountByGroupId.get(groupId) ?? 0) : 0;
        const hasSelectedSet = Boolean(groupId && selectedSetGroupId === groupId);
        const mode = groupId
          ? resolveGroupMode(groupId, false, hasSelectedSet, setCount)
          : "collapsed";
        if (mode !== "expanded") return null;
      }
      const resolvedSetId = setId.slice(4);
      const isKeySet = keySetId === resolvedSetId;
      const stopPropagation = (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
      };
      return (
        <>
          {!isKeySet ? (
            <button
              type="button"
              className={[styles.toolbarIconButton, styles.toolbarIconButtonKey].join(" ")}
              aria-label={t("decks.sets.actions.setKeyCard")}
              title={t("decks.sets.actions.setKeyCard")}
              onPointerDown={stopPropagation}
              onClick={async (event) => {
                stopPropagation(event);
                if (!deckId) return;
                await mutations.setDeckKeySet(deckId, resolvedSetId);
                await selection?.reloadStructure(selection.selectedSetId);
              }}
            >
              <Gem size={12} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className={[styles.toolbarIconButton, styles.toolbarIconButtonDelete].join(" ")}
            aria-label={t("decks.sets.actions.delete")}
            title={t("decks.sets.actions.delete")}
            onPointerDown={stopPropagation}
            onClick={async (event) => {
              stopPropagation(event);
              const wasSelected = selection?.selectedSetId === resolvedSetId;
              const deletedSetGroupId = selection?.setById.get(resolvedSetId)?.groupId ?? null;
              if (wasSelected && deletedSetGroupId) {
                setPersistedOpenGroupId(deletedSetGroupId);
              }
              if (onRequestDeleteSet) {
                await onRequestDeleteSet(resolvedSetId);
                return;
              }
              await mutations.deleteSet(resolvedSetId);
              await selection?.reloadStructure(
                wasSelected ? null : selection?.selectedSetId,
                wasSelected && deletedSetGroupId
                  ? { suppressSingleSetAutoSelectGroupId: deletedSetGroupId }
                  : undefined,
              );
            }}
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </>
      );
    },
    renderBottomToolbar: ({ boardId, setId, isDragging, isGhost }) => {
      if (isDragging || isGhost) return null;
      if (!setId.startsWith("set:")) return null;
      const resolvedSetId = setId.slice(4);
      const isKeySet = keySetId === resolvedSetId;
      if (!isKeySet) return null;
      if (enableFanLayout && boardId === "groups") return null;
      return (
          <BoardInfoPill
            icon={<Gem size={11} aria-hidden="true" />}
            label={t("decks.sets.badge.keyCard")}
            bgColor="color-mix(in srgb, #2a73ff 35%, var(--hq-surface-900) 65%)"
            borderColor="color-mix(in srgb, #2a73ff 55%, var(--hq-border-strong) 45%)"
          />
      );
    },
    isSetSelected: (setUiId) => {
      if (!selection?.selectedSetId) return false;
      return setUiId === `set:${selection.selectedSetId}`;
    },
    onSetClick: (setUiId, groupUiId) => {
      if (!selection) return;
      if (!setUiId.startsWith("set:")) return;
      if (!groupUiId.startsWith("group:")) return;
      const setId = setUiId.slice(4);
      const groupId = groupUiId.slice(6);
      const setRecord = selection.setById.get(setId);
      if (!setRecord) return;
      setPersistedOpenGroupId(groupId);
      selection.selectGroup(groupId);
      selection.selectSet(setRecord);
    },
    resolveGroupClassName: ({ boardId, groupId, isHovered, hasSelectedSet, setCount }) => {
      if (!enableFanLayout || boardId !== "groups") return null;
      const mode = resolveGroupMode(groupId, isHovered, hasSelectedSet, setCount);
      noteDesiredMode(groupId, mode);
      const normalizedGroupId = normalizeGroupId(groupId);
      const modeClassName =
        mode === "expanded"
          ? styles.groupVisualExpanded
          : mode === "partial"
            ? styles.groupVisualPartial
            : styles.groupVisualCollapsed;
      const isActiveGroup = normalizedGroupId === (selectedSetGroupId ?? selectedGroupId);
      const isEphemeralGroup = setCount === 0 && isTransientEphemeralGroupId(normalizedGroupId);
      return [
        modeClassName,
        isActiveGroup ? styles.groupActiveBorder : "",
        isEphemeralGroup ? styles.groupEphemeralPulse : "",
      ]
        .filter(Boolean)
        .join(" ");
    },
    resolveGroupStyle: ({ boardId, groupId, isHovered, hasSelectedSet, setCount }) => {
      if (!enableFanLayout || boardId !== "groups") return undefined;
      const mode = resolveGroupMode(groupId, isHovered, hasSelectedSet, setCount);
      noteDesiredMode(groupId, mode);
      const frame = resolveAnimatedFrame(groupId, mode, setCount);
      const minWidth = Math.max(
        Math.ceil(frame.requiredWidthPx),
        setCount === 0 ? EMPTY_GROUP_MIN_WIDTH_PX : 0,
      );
      const minHeight = Math.max(
        Math.ceil(frame.requiredHeightPx),
        sharedFanMinHeightPx ?? 0,
        setCount === 0 ? EMPTY_GROUP_MIN_HEIGHT_PX : 0,
      );
      return {
        minWidth: `${minWidth}px`,
        minHeight: `${minHeight}px`,
        zIndex: setCount === 0 ? 9 : undefined,
      };
    },
    resolveGroupBodyClassName: ({ boardId }) =>
      enableFanLayout && boardId === "groups" ? styles.groupBodyFanCanvas : null,
    resolveGroupBodyStyle: ({ boardId, groupId, isHovered, hasSelectedSet, setCount }) => {
      if (!enableFanLayout || boardId !== "groups") return undefined;
      const mode = resolveGroupMode(groupId, isHovered, hasSelectedSet, setCount);
      noteDesiredMode(groupId, mode);
      const frame = resolveAnimatedFrame(groupId, mode, setCount);
      const effectiveBodyHeight = Math.max(Math.ceil(frame.requiredHeightPx), sharedFanMinHeightPx ?? 0);
      const effectiveBodyWidth = Math.max(
        Math.ceil(frame.requiredWidthPx),
        setCount === 0 ? EMPTY_GROUP_MIN_WIDTH_PX : 0,
      );
      return {
        width: `${effectiveBodyWidth}px`,
        height: `${Math.max(effectiveBodyHeight, setCount === 0 ? EMPTY_GROUP_MIN_HEIGHT_PX : 0)}px`,
      };
    },
    resolveSetShellClassName: ({ boardId, groupId, isHovered, hasSelectedSet, setCount, setId }) => {
      if (!enableFanLayout || boardId !== "groups") return null;
      if (setId.startsWith("ephemeral:empty-slot:group:")) {
        return `${styles.setShellFanExpanded} ${styles.setShellEmptySlot}`;
      }
      const mode = resolveGroupMode(groupId, isHovered, hasSelectedSet, setCount);
      const shellModeClassName =
        mode === "expanded" ? styles.setShellFanExpanded : mode === "partial" ? styles.setShellFanPartial : styles.setShellFanCollapsed;
      const isCollapsedKeySet = mode === "collapsed" && keySetId != null && setId === `set:${keySetId}`;
      return [shellModeClassName, isCollapsedKeySet ? styles.keyCardSetShellCollapsed : ""].filter(Boolean).join(" ");
    },
    resolveSetShellStyle: ({ boardId, groupId, isHovered, hasSelectedSet, setCount, setIndex, setId }) => {
      if (!enableFanLayout || boardId !== "groups") return undefined;
      if (setId.startsWith("ephemeral:empty-slot:group:")) {
        return {
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 8,
        };
      }
      const mode = resolveGroupMode(groupId, isHovered, hasSelectedSet, setCount);
      noteDesiredMode(groupId, mode);
      const frame = resolveAnimatedFrame(groupId, mode, setCount);
      return resolveFanShellPresentation(mode, frame, setIndex) ?? undefined;
    },
    renderGroupOverlay: ({ boardId, groupId, isHovered, hasSelectedSet, setCount, setIds }) => {
      if (!enableFanLayout || boardId !== "groups") return null;
      if (!keySetId) return null;
      if (setIds.length <= 0) return null;
      const keySetUiId = `set:${keySetId}`;
      const setIndex = setIds.indexOf(keySetUiId);
      if (setIndex < 0) return null;
      const mode = resolveGroupMode(groupId, isHovered, hasSelectedSet, setCount);
      const frame = resolveAnimatedFrame(groupId, mode, setCount);
      const shellStyle = resolveFanShellPresentation(mode, frame, setIndex);
      if (!shellStyle) return null;
      const rotateDeg = frame.cards[setIndex]?.rotateDeg ?? 0;
      return (
        <div
          className={styles.keyCardOverlayAnchor}
          data-testid={`key-card-overlay-${groupId}`}
          style={{
            left: shellStyle.left,
            top: shellStyle.top,
            transform: shellStyle.transform,
            transformOrigin: shellStyle.transformOrigin,
            zIndex: Math.max(20, shellStyle.zIndex + 10),
          }}
        >
          <div className={styles.setShell}>
            <div className={styles.keyCardOverlayShellSpacer} aria-hidden="true" />
            <div
              className={styles.keyCardOverlayPillAnchor}
              style={{ transform: `translate(-50%, 0) rotate(${-rotateDeg}deg)` }}
            >
              <BoardInfoPill
                icon={<Gem size={11} aria-hidden="true" />}
                label={t("decks.sets.badge.keyCard")}
                bgColor="color-mix(in srgb, #2a73ff 35%, var(--hq-surface-900) 65%)"
                borderColor="color-mix(in srgb, #2a73ff 55%, var(--hq-border-strong) 45%)"
              />
            </div>
          </div>
        </div>
      );
    },
  });

  useEffect(() => {
    if (!selection) return () => undefined;
    const deleteGroupIfEmpty = async (groupId: string, isEmpty: boolean): Promise<void> => {
      if (!isEmpty || !groupId) return;
      try {
        await mutations.deleteGroup(groupId);
      } catch {
        // Non-fatal; reload will re-sync.
      }
    };
    return registerDropHandler("groups-controller", async (event) => {
      if (event.kind === "GROUPS_REORDER_GROUPS") {
        if (!deckId || event.orderedGroupIds.length <= 1) {
          return { handled: true, success: true };
        }
        await mutations.reorderGroups(deckId, event.orderedGroupIds);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_REORDER_SETS") {
        const isCrossGroup = event.sourceGroupId !== event.targetGroupId;
        if (isCrossGroup) {
          await mutations.updateSetGroup(event.setId, event.targetGroupId);
        }
        if (event.orderedTargetSetIds.length > 0) {
          await mutations.reorderSets(event.orderedTargetSetIds[0], event.orderedTargetSetIds);
        }
        if (isCrossGroup && event.orderedSourceSetIds.length > 0) {
          await mutations.reorderSets(event.orderedSourceSetIds[0], event.orderedSourceSetIds);
        }
        await deleteGroupIfEmpty(event.sourceGroupId, event.sourceGroupEmptyAfterDrop);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SET_TO_NEW_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const createdGroup = await mutations.createGroup(deckId, t("decks.defaultGroupTitle"));
        const orderedGroupIds = selection.orderedGroups.map((group) => group.id);
        const insertionIndex = Math.max(0, Math.min(event.targetGroupIndex, orderedGroupIds.length));
        const nextGroupOrder = orderedGroupIds.slice();
        nextGroupOrder.splice(insertionIndex, 0, createdGroup.id);
        await mutations.reorderGroups(deckId, nextGroupOrder);
        await mutations.updateSetGroup(event.setId, createdGroup.id);
        await mutations.reorderSets(event.setId, [event.setId]);
        if (event.orderedSourceSetIds.length > 0) {
          await mutations.reorderSets(event.orderedSourceSetIds[0], event.orderedSourceSetIds);
        }
        await deleteGroupIfEmpty(event.sourceGroupId, event.sourceGroupEmptyAfterDrop);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SOURCE_CARD_TO_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const created = await mutations.createSetFromBackFace(
          deckId,
          event.targetGroupId,
          event.backFaceId,
          t("decks.defaultSetTitle"),
        );
        const orderedTargetSetIds = selection.sets
          .filter((set) => set.groupId === event.targetGroupId)
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((set) => set.id);
        const clampedIndex = Math.max(0, Math.min(event.targetIndex, orderedTargetSetIds.length));
        const nextOrdered = orderedTargetSetIds.slice();
        nextOrdered.splice(clampedIndex, 0, created.id);
        await mutations.reorderSets(created.id, nextOrdered);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SOURCE_CARD_TO_NEW_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const createdGroup = await mutations.createGroup(deckId, t("decks.defaultGroupTitle"));
        const orderedGroupIds = selection.orderedGroups.map((group) => group.id);
        const insertionIndex = Math.max(0, Math.min(event.targetGroupIndex, orderedGroupIds.length));
        const nextGroupOrder = orderedGroupIds.slice();
        nextGroupOrder.splice(insertionIndex, 0, createdGroup.id);
        await mutations.reorderGroups(deckId, nextGroupOrder);
        const createdSet = await mutations.createSetFromBackFace(
          deckId,
          createdGroup.id,
          event.backFaceId,
          t("decks.defaultSetTitle"),
        );
        await mutations.reorderSets(createdSet.id, [createdSet.id]);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      return null;
    });
  }, [deckId, mutations, registerDropHandler, selection, t]);

  return <DeckSortableBoardView model={model} layoutMode="content" />;
}
