"use client";

import { move } from "@dnd-kit/helpers";
import {
  DragDropProvider,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  canRouteDrag,
  collectLabels,
  computeAffordanceByBoard,
  createDnDStateFromModels,
  emptyAffordanceState,
  extractGroupIdFromOperationEntity,
  findGroupIdBySetId,
  getBlockedBoundaries,
  resolveBoardIdFromOperationEntity,
  resolveSourceDragToken,
} from "@/components/Decks/detail/boards/deck-board-adapters";
import {
  countRenderableSets,
  createEmptySlotEphemeralSetId,
  findContainerByItemId,
  isEmptySlotEphemeralSetId,
  moveEphemeralToContainer,
  normalizeAfterDrop,
  stripEphemeralItems,
  withManagedEmptySlots,
} from "@/components/Decks/detail/boards/deck-board-dnd-state";
import type {
  BoardConfig,
  BoardModel,
  BoardRoutingMeta,
  DnDState,
  SourceItemFace,
  UiItem,
} from "@/components/Decks/detail/boards/deck-board-internal-types";
import type {
  BoardId,
  GroupId,
  SetId,
} from "@/components/Decks/detail/boards/deck-board-types";
import { OverlayCard } from "@/components/Decks/detail/boards/DeckBoardCards";
import {
  DefaultSetThumbnailContent,
} from "@/components/Decks/detail/boards/DeckSortableBoardView";
import type { DeckSortableBoardViewModel } from "@/components/Decks/detail/boards/DeckSortableBoardView";
import { useI18n } from "@/i18n/I18nProvider";

import styles from "../DeckGroupsSection2.module.css";

export type {
  BoardId,
  GroupId,
  GroupVisualContext,
  SetHoverContext,
  SetId,
  SetRenderState,
  SetToolbarContext,
} from "@/components/Decks/detail/boards/deck-board-types";
export type { BoardModel } from "@/components/Decks/detail/boards/deck-board-internal-types";
export {
  DeckSortableBoardView,
  DefaultSetThumbnailContent,
} from "@/components/Decks/detail/boards/DeckSortableBoardView";
export type {
  DeckSortableBoardViewModel,
  LayoutMode,
} from "@/components/Decks/detail/boards/DeckSortableBoardView";

type BoardInfoPillProps = {
  icon?: ReactNode;
  label: ReactNode;
  bgColor?: string;
  borderColor?: string;
};

type DeckDnDEventBase = {
  dragId: string;
  timestamp: number;
  sourceBoardId: BoardId;
  targetBoardId: BoardId;
};

type GroupsReorderSetsEvent = DeckDnDEventBase & {
  kind: "GROUPS_REORDER_SETS";
  setId: string;
  sourceGroupId: string;
  targetGroupId: string;
  orderedTargetSetIds: string[];
  orderedSourceSetIds: string[];
  sourceGroupEmptyAfterDrop: boolean;
};

type GroupsReorderGroupsEvent = DeckDnDEventBase & {
  kind: "GROUPS_REORDER_GROUPS";
  orderedGroupIds: string[];
};

type GroupsDropSetToNewGroupEvent = DeckDnDEventBase & {
  kind: "GROUPS_DROP_SET_TO_NEW_GROUP";
  setId: string;
  sourceGroupId: string;
  targetGroupIndex: number;
  orderedSourceSetIds: string[];
  sourceGroupEmptyAfterDrop: boolean;
};

type GroupsDropSourceCardToGroupEvent = DeckDnDEventBase & {
  kind: "GROUPS_DROP_SOURCE_CARD_TO_GROUP";
  backFaceId: string;
  targetGroupId: string;
  targetIndex: number;
};

type GroupsDropSourceCardToNewGroupEvent = DeckDnDEventBase & {
  kind: "GROUPS_DROP_SOURCE_CARD_TO_NEW_GROUP";
  backFaceId: string;
  targetGroupIndex: number;
};

type EntriesReorderEvent = DeckDnDEventBase & {
  kind: "ENTRIES_REORDER";
  orderedEntryIds: string[];
};

type EntriesDropSourceToEntriesEvent = DeckDnDEventBase & {
  kind: "ENTRIES_DROP_SOURCE_TO_ENTRIES";
  frontFaceId: string;
  targetIndex: number;
};

export type DeckDnDEvent =
  | GroupsReorderGroupsEvent
  | GroupsReorderSetsEvent
  | GroupsDropSetToNewGroupEvent
  | GroupsDropSourceCardToGroupEvent
  | GroupsDropSourceCardToNewGroupEvent
  | EntriesReorderEvent
  | EntriesDropSourceToEntriesEvent;

export type DeckDnDEventResult = {
  handled: boolean;
  success: boolean;
  fatal?: boolean;
  reason?: string;
};

export type DeckDropHandler = (event: DeckDnDEvent) => Promise<DeckDnDEventResult | null>;

type DeckMockDndContextValue = {
  state: DnDState;
  setLabelsById: Record<SetId, string>;
  setCardIdById: Record<SetId, string>;
  groupLabelsById: Record<GroupId, string>;
  activeSetId: SetId | null;
  activeGroupId: GroupId | null;
  activeTargetBoardId: BoardId | null;
  dragAffordanceByBoard: Record<BoardId, boolean>;
  hoverBoundaryByBoard: Record<BoardId, number | null>;
  registerGroupRef: (groupId: GroupId, node: HTMLElement | null) => void;
  handleHoverBoundary: (boardId: BoardId, clientX: number) => void;
  handleLeaveBoard: (boardId: BoardId) => void;
  setBoundaryHoverState: (boardId: BoardId, index: number, isHovered: boolean) => void;
  createGroupAtIndex: (boardId: BoardId, index: number) => void;
  registerDropHandler: (controllerId: string, handler: DeckDropHandler) => () => void;
};

const BOARD_CONFIGS: Record<BoardId, BoardConfig> = {
  groups: {
    boardId: "groups",
    title: "decks.boards.groups",
    allowMultipleGroups: true,
    allowGroupCreate: true,
    allowInGroupSort: true,
    allowDropTarget: true,
  },
  entries: {
    boardId: "entries",
    title: "decks.boards.entries",
    allowMultipleGroups: false,
    allowGroupCreate: false,
    allowInGroupSort: true,
    allowDropTarget: true,
  },
  source: {
    boardId: "source",
    title: "decks.boards.source",
    allowMultipleGroups: false,
    allowGroupCreate: false,
    allowInGroupSort: false,
    allowDropTarget: false,
  },
};

const GROUP_BOUNDARY_EDGE_PCT = 0.1;
const GROUP_BOUNDARY_EDGE_MIN_PX = 12;
const GROUP_BOUNDARY_EDGE_MAX_PX = 28;
const GROUP_BOUNDARY_GAP_SNAP_MAX_PX = 14;
const GROUP_BOUNDARY_STICKY_HOLD_PX = 26;

export const BOARD_ROUTING_META_BY_ID: Record<BoardId, BoardRoutingMeta> = {
  groups: { emitToken: "set", acceptTokens: ["source-back"] },
  entries: { emitToken: "entry", acceptTokens: ["source-front"] },
  source: { emitToken: "source", acceptTokens: [] },
};

const DeckMockDndContext = createContext<DeckMockDndContextValue | null>(null);

export function useDeckMockDnd() {
  const ctx = useContext(DeckMockDndContext);
  if (!ctx) {
    throw new Error("Deck mock DnD components must be rendered inside DeckMockDndProvider");
  }
  return ctx;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function BoardInfoPill({
  icon,
  label,
  bgColor,
  borderColor,
}: BoardInfoPillProps) {
  return (
    <span
      className={styles.boardInfoPill}
      style={
        {
          "--board-pill-bg": bgColor ?? "var(--hq-surface-900)",
          "--board-pill-border": borderColor ?? "var(--hq-border-strong)",
        } as CSSProperties
      }
    >
      {icon ? <span className={styles.boardInfoPillIcon}>{icon}</span> : null}
      <span className={styles.boardInfoPillLabel}>{label}</span>
    </span>
  );
}

export function DeckMockDndProvider({
  children,
  boardModels,
}: {
  children: React.ReactNode;
  boardModels: Record<BoardId, BoardModel>;
}) {
  const initialState = useMemo(
    () => createDnDStateFromModels(boardModels, BOARD_CONFIGS),
    [boardModels],
  );
  const initialLabels = useMemo(() => collectLabels(boardModels), [boardModels]);
  const [state, setState] = useState<DnDState>(initialState);
  const [groupLabelsById, setGroupLabelsById] = useState<Record<GroupId, string>>(
    initialLabels.groupLabelsById,
  );
  const [setLabelsById, setSetLabelsById] = useState<Record<SetId, string>>(
    initialLabels.setLabelsById,
  );
  const [setCardIdById, setSetCardIdById] = useState<Record<SetId, string>>(
    initialLabels.setCardIdById,
  );
  const [activeSetId, setActiveSetId] = useState<SetId | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<GroupId | null>(null);
  const [activeTargetBoardId, setActiveTargetBoardId] = useState<BoardId | null>(null);
  const [dragAffordanceByBoard, setDragAffordanceByBoard] = useState<Record<BoardId, boolean>>(
    emptyAffordanceState(),
  );
  const [hoverBoundaryByBoard, setHoverBoundaryByBoard] = useState<Record<BoardId, number | null>>({
    groups: null,
    entries: null,
    source: null,
  });
  const [hoveredBoundaryByBoard, setHoveredBoundaryByBoard] = useState<
    Record<BoardId, number | null>
  >({
    groups: null,
    entries: null,
    source: null,
  });
  const [ephemeralEmptyGroupId, setEphemeralEmptyGroupId] = useState<GroupId | null>(null);
  const sourceItemFaceBySetIdRef = useRef<Record<SetId, SourceItemFace>>(
    boardModels.source.sourceItemFaceBySetId ?? {},
  );
  const boardRoutingById = useRef<Record<BoardId, BoardRoutingMeta>>({
    groups: {
      emitToken: boardModels.groups.emitToken,
      acceptTokens: boardModels.groups.acceptTokens,
    },
    entries: {
      emitToken: boardModels.entries.emitToken,
      acceptTokens: boardModels.entries.acceptTokens,
    },
    source: {
      emitToken: boardModels.source.emitToken,
      acceptTokens: boardModels.source.acceptTokens,
    },
  });

  const previousState = useRef<DnDState>(initialState);
  const sourceGroupIdAtDragStartRef = useRef<GroupId | null>(null);
  const dragSourceEmptySlotGroupIdRef = useRef<GroupId | null>(null);
  const activeEphemeralIdRef = useRef<SetId | null>(null);
  const nextGroupIdRef = useRef<number>(1);
  const groupRefs = useRef<Map<GroupId, HTMLElement>>(new Map());
  const handlersRef = useRef<Map<string, DeckDropHandler>>(new Map());
  const lastPublishedDragIdRef = useRef<string | null>(null);
  const dragSequenceRef = useRef<number>(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    boardRoutingById.current = {
      groups: {
        emitToken: boardModels.groups.emitToken,
        acceptTokens: boardModels.groups.acceptTokens,
      },
      entries: {
        emitToken: boardModels.entries.emitToken,
        acceptTokens: boardModels.entries.acceptTokens,
      },
      source: {
        emitToken: boardModels.source.emitToken,
        acceptTokens: boardModels.source.acceptTokens,
      },
    };
    setGroupLabelsById(initialLabels.groupLabelsById);
    setSetLabelsById(initialLabels.setLabelsById);
    setSetCardIdById(initialLabels.setCardIdById);
    sourceItemFaceBySetIdRef.current = boardModels.source.sourceItemFaceBySetId ?? {};
    if (activeSetId) return;
    const normalizedInitialState = withManagedEmptySlots(
      initialState,
      initialState.groupOrderByBoard.groups ?? [],
    );
    setState(normalizedInitialState);
    previousState.current = normalizedInitialState;
  }, [
    activeSetId,
    boardModels,
    initialLabels.groupLabelsById,
    initialLabels.setLabelsById,
    initialLabels.setCardIdById,
    initialState,
  ]);

  const registerGroupRef = (groupId: GroupId, node: HTMLElement | null) => {
    if (node) {
      groupRefs.current.set(groupId, node);
    } else {
      groupRefs.current.delete(groupId);
    }
  };

  const resolveBoundaryForBoard = (
    boardId: BoardId,
    clientX: number,
    currentBoundary: number | null = null,
  ): number | null => {
    const groups = state.groupOrderByBoard[boardId]
      .map((groupId, index) => ({ index, node: groupRefs.current.get(groupId) }))
      .filter((entry): entry is { index: number; node: HTMLElement } => Boolean(entry.node))
      .map(({ index, node }) => ({ index, rect: node.getBoundingClientRect() }));

    if (groups.length === 0) return null;

    for (let i = 0; i < groups.length; i += 1) {
      const { index, rect } = groups[i];
      const edgeSize = clamp(
        rect.width * GROUP_BOUNDARY_EDGE_PCT,
        GROUP_BOUNDARY_EDGE_MIN_PX,
        GROUP_BOUNDARY_EDGE_MAX_PX,
      );
      const leftEdgeZoneEnd = rect.left + edgeSize;
      const rightEdgeZoneStart = rect.right - edgeSize;
      if (clientX >= rect.left && clientX <= leftEdgeZoneEnd) return index;
      if (clientX >= rightEdgeZoneStart && clientX <= rect.right) return index + 1;
    }

    // Pointer is in a middle-zone or inter-group gap: optionally snap only when very near an edge.
    let bestBoundary = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < groups.length; i += 1) {
      const { index, rect } = groups[i];
      const leftDistance = Math.abs(clientX - rect.left);
      if (leftDistance < bestDistance) {
        bestDistance = leftDistance;
        bestBoundary = index;
      }
      const rightDistance = Math.abs(clientX - rect.right);
      if (rightDistance < bestDistance) {
        bestDistance = rightDistance;
        bestBoundary = index + 1;
      }
    }
    const snappedBoundary =
      bestDistance <= GROUP_BOUNDARY_GAP_SNAP_MAX_PX ? bestBoundary : null;
    if (snappedBoundary != null) return snappedBoundary;

    // Hysteresis: keep current boundary while pointer remains near that boundary's adjacent edges.
    if (currentBoundary != null) {
      let stickyDistance = Number.POSITIVE_INFINITY;
      if (currentBoundary > 0) {
        const leftNeighbor = groups[currentBoundary - 1];
        if (leftNeighbor) {
          stickyDistance = Math.min(stickyDistance, Math.abs(clientX - leftNeighbor.rect.right));
        }
      }
      if (currentBoundary < groups.length) {
        const rightNeighbor = groups[currentBoundary];
        if (rightNeighbor) {
          stickyDistance = Math.min(stickyDistance, Math.abs(clientX - rightNeighbor.rect.left));
        }
      }
      if (stickyDistance <= GROUP_BOUNDARY_STICKY_HOLD_PX) {
        return currentBoundary;
      }
    }

    return null;
  };

  const handleHoverBoundary = (boardId: BoardId, clientX: number) => {
    if (activeSetId || activeGroupId) return;
    setHoverBoundaryByBoard((current) => {
      const hoveredBoundary = hoveredBoundaryByBoard[boardId];
      if (hoveredBoundary != null) {
        if (hoveredBoundary === current[boardId]) return current;
        return {
          ...current,
          [boardId]: hoveredBoundary,
        };
      }
      const nextBoundary = resolveBoundaryForBoard(boardId, clientX, current[boardId]);
      if (nextBoundary === current[boardId]) return current;
      return {
        ...current,
        [boardId]: nextBoundary,
      };
    });
  };

  const handleLeaveBoard = (boardId: BoardId) => {
    if (activeSetId || activeGroupId) return;
    setHoverBoundaryByBoard((current) => {
      if (hoveredBoundaryByBoard[boardId] != null) return current;
      if (current[boardId] == null) return current;
      return { ...current, [boardId]: null };
    });
  };

  const setBoundaryHoverState = (boardId: BoardId, index: number, isHovered: boolean) => {
    setHoveredBoundaryByBoard((current) => {
      const nextValue = isHovered ? index : current[boardId] === index ? null : current[boardId];
      if (current[boardId] === nextValue) return current;
      return {
        ...current,
        [boardId]: nextValue,
      };
    });
    setHoverBoundaryByBoard((current) => {
      if (isHovered) {
        return current[boardId] === index ? current : { ...current, [boardId]: index };
      }
      return current[boardId] === index ? { ...current, [boardId]: null } : current;
    });
  };

  const createGroupAtIndex = (boardId: BoardId, index: number) => {
    const config = BOARD_CONFIGS[boardId];
    if (!config.allowGroupCreate || !config.allowMultipleGroups) return;

    const blocked = getBlockedBoundaries(state.groupOrderByBoard[boardId], state.itemsByGroup);
    if (blocked.has(index)) return;

    const newGroupId = `${boardId}:N${nextGroupIdRef.current}`;
    nextGroupIdRef.current += 1;
    // Boundary button can unmount before mouseleave fires; clear hover-latch to avoid stale lock.
    setHoveredBoundaryByBoard((current) =>
      current[boardId] == null ? current : { ...current, [boardId]: null },
    );
    setHoverBoundaryByBoard((current) =>
      current[boardId] == null ? current : { ...current, [boardId]: null },
    );

    setState((current) => {
      const nextGroupOrderByBoard = { ...current.groupOrderByBoard };
      const nextItemsByGroup = { ...current.itemsByGroup };
      const nextGroupToBoard = { ...current.groupToBoard };
      const nextContainersById = { ...current.containersById };
      const nextItemsById: Record<SetId, UiItem> = { ...current.itemsById };
      const preCleanupGroups = nextGroupOrderByBoard[boardId] ?? [];
      const leftAnchorId = preCleanupGroups[index - 1] ?? null;
      const rightAnchorId = preCleanupGroups[index] ?? null;

      // Keep at most one placeholder-only group by removing all existing empty ephemeral groups first.
      const groupsBoardGroups = nextGroupOrderByBoard.groups ?? [];
      const ephemeralGroupsToRemove = groupsBoardGroups.filter((groupId) => {
        if (nextGroupToBoard[groupId] !== "groups") return false;
        return countRenderableSets(nextItemsByGroup[groupId] ?? []) === 0;
      });
      if (ephemeralGroupsToRemove.length > 0) {
        const removeSet = new Set(ephemeralGroupsToRemove);
        nextGroupOrderByBoard.groups = groupsBoardGroups.filter((groupId) => !removeSet.has(groupId));
        ephemeralGroupsToRemove.forEach((groupId) => {
          (nextItemsByGroup[groupId] ?? []).forEach((setId) => {
            if (isEmptySlotEphemeralSetId(setId)) {
              delete nextItemsById[setId];
            }
          });
          delete nextItemsByGroup[groupId];
          delete nextGroupToBoard[groupId];
          delete nextContainersById[groupId];
        });
      }

      const nextBoardGroups = nextGroupOrderByBoard[boardId].slice();
      const leftAnchorIndex = leftAnchorId ? nextBoardGroups.indexOf(leftAnchorId) : -1;
      const rightAnchorIndex = rightAnchorId ? nextBoardGroups.indexOf(rightAnchorId) : -1;
      let insertionIndex = clamp(index, 0, nextBoardGroups.length);
      if (leftAnchorIndex >= 0 && rightAnchorIndex >= 0 && leftAnchorIndex < rightAnchorIndex) {
        insertionIndex = leftAnchorIndex + 1;
      } else if (leftAnchorIndex >= 0) {
        insertionIndex = leftAnchorIndex + 1;
      } else if (rightAnchorIndex >= 0) {
        insertionIndex = rightAnchorIndex;
      }
      nextBoardGroups.splice(insertionIndex, 0, newGroupId);
      nextGroupOrderByBoard[boardId] = nextBoardGroups;
      const emptySlotId = createEmptySlotEphemeralSetId(newGroupId);
      nextItemsByGroup[newGroupId] = [emptySlotId];
      nextGroupToBoard[newGroupId] = boardId;
      nextContainersById[newGroupId] = {
        id: newGroupId,
        boardId,
        role: "group",
        allowSortWithin: BOARD_CONFIGS[boardId].allowInGroupSort,
        accepts: boardRoutingById.current[boardId].acceptTokens,
      };
      nextItemsById[emptySlotId] = {
        uiItemId: emptySlotId,
        kind: "set",
        ephemeralKind: "empty-slot",
        face: "back",
        sourceCardId: null,
        persistedId: null,
        isEphemeral: true,
      };

      return {
        groupOrderByBoard: nextGroupOrderByBoard,
        itemsByGroup: nextItemsByGroup,
        groupToBoard: nextGroupToBoard,
        containerOrderByBoard: nextGroupOrderByBoard,
        itemsByContainer: nextItemsByGroup,
        containersById: nextContainersById,
        itemsById: nextItemsById,
      };
    });

    setEphemeralEmptyGroupId(newGroupId);
  };

  const registerDropHandler = (controllerId: string, handler: DeckDropHandler) => {
    handlersRef.current.set(controllerId, handler);
    return () => {
      handlersRef.current.delete(controllerId);
    };
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (event.operation.source?.type === "group") {
      previousState.current = state;
      setActiveGroupId(
        extractGroupIdFromOperationEntity(event.operation.source) ||
          String(event.operation.source.id ?? "") ||
          null,
      );
      return;
    }
    if (event.operation.source?.type !== "set") return;
    const sourceSetId = String(event.operation.source.id);
    const sourceGroupId =
      extractGroupIdFromOperationEntity(event.operation.source) ||
      findGroupIdBySetId(state.itemsByGroup, sourceSetId) ||
      null;
    sourceGroupIdAtDragStartRef.current = sourceGroupId;
    dragSourceEmptySlotGroupIdRef.current = null;
    if (sourceGroupId && state.groupToBoard[sourceGroupId] === "groups") {
      const sourceGroupItems = state.itemsByGroup[sourceGroupId] ?? [];
      if (countRenderableSets(sourceGroupItems) === 1) {
        dragSourceEmptySlotGroupIdRef.current = sourceGroupId;
      }
    }
    previousState.current = state;
    setActiveSetId(String(event.operation.source.id));
    setActiveTargetBoardId(null);
    const sourceBoardId = sourceGroupId ? (state.groupToBoard[sourceGroupId] ?? null) : null;
    const sourceRouting = sourceBoardId ? boardRoutingById.current[sourceBoardId] : null;
    const sourceEmitToken = resolveSourceDragToken({
      sourceBoardId,
      sourceSetId,
      sourceRoutingToken: sourceRouting?.emitToken ?? null,
      sourceItemFaceBySetId: sourceItemFaceBySetIdRef.current,
    });
    setDragAffordanceByBoard(
      computeAffordanceByBoard({
        sourceBoardId,
        sourceEmitToken,
        routingById: boardRoutingById.current,
        boardConfigs: BOARD_CONFIGS,
      }),
    );
    setHoverBoundaryByBoard({ groups: null, entries: null, source: null });
    setHoveredBoundaryByBoard({ groups: null, entries: null, source: null });
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.operation.source?.type === "group") {
      const sourceGroupId =
        extractGroupIdFromOperationEntity(event.operation.source) ||
        String(event.operation.source.id ?? "");
      const targetId = String(event.operation.target?.id ?? "");
      const targetGroupId =
        event.operation.target?.type === "group"
          ? extractGroupIdFromOperationEntity(event.operation.target) || targetId
          : extractGroupIdFromOperationEntity(event.operation.target) ||
            (targetId ? findContainerByItemId(state, targetId) || "" : "");
      if (!sourceGroupId || !targetGroupId || sourceGroupId === targetGroupId) return;
      const sourceBoardId = state.groupToBoard[sourceGroupId] ?? null;
      const targetBoardId = state.groupToBoard[targetGroupId] ?? null;
      if (!sourceBoardId || sourceBoardId !== targetBoardId) return;
      setState((current) => {
        const currentOrder = current.groupOrderByBoard[sourceBoardId] ?? [];
        const sourceIndex = currentOrder.indexOf(sourceGroupId);
        const targetIndex = currentOrder.indexOf(targetGroupId);
        if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
        const nextOrder = currentOrder.slice();
        const [moved] = nextOrder.splice(sourceIndex, 1);
        nextOrder.splice(targetIndex, 0, moved);
        const nextGroupOrderByBoard = {
          ...current.groupOrderByBoard,
          [sourceBoardId]: nextOrder,
        };
        return {
          ...current,
          groupOrderByBoard: nextGroupOrderByBoard,
          containerOrderByBoard: nextGroupOrderByBoard,
        };
      });
      return;
    }
    if (event.operation.source?.type !== "set") return;

    const sourceSetId = String(event.operation.source.id);
    const sourceItem = state.itemsById[sourceSetId] ?? null;
    const sourceGroupId =
      extractGroupIdFromOperationEntity(event.operation.source) ||
      findContainerByItemId(state, sourceSetId) ||
      "";
    const targetId = String(event.operation.target?.id ?? "");
    let targetGroupId =
      event.operation.target?.type === "group"
        ? targetId
        : extractGroupIdFromOperationEntity(event.operation.target) ||
          (targetId ? findContainerByItemId(state, targetId) || "" : "");

    // Keep temp-group targeting stable for source-template drags even if pointer briefly misses.
    if (
      sourceItem?.kind === "source-template" &&
      !targetGroupId &&
      ephemeralEmptyGroupId &&
      state.groupToBoard[ephemeralEmptyGroupId] === "groups"
    ) {
      targetGroupId = ephemeralEmptyGroupId;
    }
    if (sourceItem?.kind === "source-template" && !targetGroupId) {
      const targetBoardHint = resolveBoardIdFromOperationEntity(event.operation.target);
      if (targetBoardHint === "entries") {
        targetGroupId = state.groupOrderByBoard.entries[0] ?? "";
      }
    }

    if (!sourceGroupId || !targetGroupId) {
      setActiveTargetBoardId(null);
      return;
    }
    const sourceBoardId = state.groupToBoard[sourceGroupId] ?? null;
    const targetBoardId = state.groupToBoard[targetGroupId] ?? null;
    const targetContainer = targetGroupId ? state.containersById[targetGroupId] ?? null : null;
    const sourceBoardConfig = sourceBoardId ? BOARD_CONFIGS[sourceBoardId] : null;
    const targetBoardConfig = targetBoardId ? BOARD_CONFIGS[targetBoardId] : null;
    const sourceRouting = sourceBoardId ? boardRoutingById.current[sourceBoardId] : null;
    const targetRouting = targetBoardId ? boardRoutingById.current[targetBoardId] : null;
    const sourceEmitToken = resolveSourceDragToken({
      sourceBoardId,
      sourceSetId,
      sourceRoutingToken: sourceRouting?.emitToken ?? null,
      sourceItemFaceBySetId: sourceItemFaceBySetIdRef.current,
    });
    const canRoute = canRouteDrag({
      sourceBoardId,
      sourceGroupId,
      targetBoardId,
      targetGroupId,
      sameGroup: sourceGroupId === targetGroupId,
      sourceAllowInGroupSort: sourceBoardConfig?.allowInGroupSort ?? false,
      targetAllowDropTarget: targetBoardConfig?.allowDropTarget ?? false,
      sourceEmitToken,
      targetAcceptTokens: targetRouting?.acceptTokens ?? null,
      sourceItem,
      targetContainer,
    });
    if (!canRoute) {
      event.preventDefault?.();
      if (activeEphemeralIdRef.current) {
        setState((current) =>
          withManagedEmptySlots(stripEphemeralItems(current), [
            ephemeralEmptyGroupId,
            dragSourceEmptySlotGroupIdRef.current,
          ]),
        );
      }
      setActiveTargetBoardId(null);
      return;
    }
    setActiveTargetBoardId(targetBoardId);
    if (sourceItem?.kind === "source-template") {
      const sourceCardId = sourceItem.sourceCardId ?? sourceSetId.replace(/^source:/, "");
      const ephemeralId = activeEphemeralIdRef.current ?? `ephemeral:source:${sourceCardId}`;
      activeEphemeralIdRef.current = ephemeralId;
      const targetItems = (state.itemsByGroup[targetGroupId] ?? []).filter(
        (id) => id !== ephemeralId,
      );
      const targetIndex =
        event.operation.target?.type === "group"
          ? targetItems.length
          : Math.max(0, targetItems.indexOf(targetId));
      setState((current) => {
        const withItem: DnDState =
          current.itemsById[ephemeralId] != null
            ? current
            : {
                ...current,
                itemsById: {
                  ...current.itemsById,
                  [ephemeralId]: {
                    uiItemId: ephemeralId,
                    kind: "source-template" as const,
                    ephemeralKind: "source",
                    face: sourceItem.face,
                    sourceCardId,
                    persistedId: null,
                    isEphemeral: true,
                  },
                },
              };
        return withManagedEmptySlots(
          moveEphemeralToContainer(withItem, ephemeralId, targetGroupId, targetIndex),
          [ephemeralEmptyGroupId, dragSourceEmptySlotGroupIdRef.current],
        );
      });
      setSetLabelsById((current) => ({
        ...current,
        [ephemeralId]: current[sourceSetId] ?? setLabelsById[sourceSetId] ?? "",
      }));
      setSetCardIdById((current) => ({
        ...current,
        [ephemeralId]: sourceCardId,
      }));
      return;
    }

    const moved = move(state.itemsByGroup, event) as Record<GroupId, SetId[]>;
    setState((current) =>
      withManagedEmptySlots(
        {
          ...current,
          itemsByGroup: moved,
          itemsByContainer: moved,
        },
        [ephemeralEmptyGroupId, dragSourceEmptySlotGroupIdRef.current],
      ),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.operation.source?.type === "group") {
      setActiveGroupId(null);
      if (event.canceled) {
        dragSourceEmptySlotGroupIdRef.current = null;
        setState(previousState.current);
        return;
      }
      const sourceGroupId =
        extractGroupIdFromOperationEntity(event.operation.source) ||
        String(event.operation.source.id ?? "");
      const sourceBoardId = sourceGroupId ? (state.groupToBoard[sourceGroupId] ?? null) : null;
      if (sourceBoardId === "groups" && handlersRef.current.size > 0) {
        const orderedGroupIds = (state.groupOrderByBoard.groups ?? [])
          .map((groupUiId) => groupUiId.replace(/^group:/, ""))
          .filter(Boolean);
        const dragId = `drag:${Date.now()}:${++dragSequenceRef.current}:${sourceGroupId}`;
        const eventPayload: DeckDnDEvent = {
          kind: "GROUPS_REORDER_GROUPS",
          dragId,
          timestamp: Date.now(),
          sourceBoardId: "groups",
          targetBoardId: "groups",
          orderedGroupIds,
        };
        void (async () => {
          const handlers = [...handlersRef.current.values()];
          const settled = await Promise.allSettled(handlers.map((handler) => handler(eventPayload)));
          const hasFatal = settled.some(
            (result) =>
              result.status === "rejected" ||
              (result.status === "fulfilled" &&
                result.value !== null &&
                result.value.handled &&
                !result.value.success &&
                result.value.fatal),
          );
          if (hasFatal) {
            setState(previousState.current);
          }
        })();
      }
      return;
    }
    if (event.operation.source?.type !== "set") {
      dragSourceEmptySlotGroupIdRef.current = null;
      setActiveGroupId(null);
      setActiveSetId(null);
      setActiveTargetBoardId(null);
      setDragAffordanceByBoard(emptyAffordanceState());
      return;
    }

    if (event.canceled) {
      setActiveGroupId(null);
      setState(
        withManagedEmptySlots(stripEphemeralItems(previousState.current), [
          ephemeralEmptyGroupId,
          dragSourceEmptySlotGroupIdRef.current,
        ]),
      );
      setActiveSetId(null);
      setActiveTargetBoardId(null);
      setDragAffordanceByBoard(emptyAffordanceState());
      activeEphemeralIdRef.current = null;
      sourceGroupIdAtDragStartRef.current = null;
      dragSourceEmptySlotGroupIdRef.current = null;
      return;
    }

    const sourceSetId = String(event.operation.source.id);
    const sourceItem = state.itemsById[sourceSetId] ?? null;
    const sourceGroupId =
      sourceGroupIdAtDragStartRef.current ||
      extractGroupIdFromOperationEntity(event.operation.source) ||
      findContainerByItemId(state, sourceSetId) ||
      "";
    const finalTargetBoardHint = resolveBoardIdFromOperationEntity(event.operation.target);
    const targetId = String(event.operation.target?.id ?? "");
    let targetGroupId =
      event.operation.target?.type === "group"
        ? targetId
        : extractGroupIdFromOperationEntity(event.operation.target) ||
          (targetId ? findContainerByItemId(state, targetId) || "" : "");

    if (sourceItem?.kind === "source-template" && activeEphemeralIdRef.current) {
      const isFinalTargetCommittable =
        finalTargetBoardHint === "entries" ||
        finalTargetBoardHint === "groups" ||
        event.operation.target?.type === "group" ||
        event.operation.target?.type === "set";
      if (!isFinalTargetCommittable || finalTargetBoardHint === "source") {
        setState(
          withManagedEmptySlots(stripEphemeralItems(state), [
            ephemeralEmptyGroupId,
            dragSourceEmptySlotGroupIdRef.current,
          ]),
        );
        setActiveSetId(null);
        setActiveGroupId(null);
        setActiveTargetBoardId(null);
        setDragAffordanceByBoard(emptyAffordanceState());
        activeEphemeralIdRef.current = null;
        sourceGroupIdAtDragStartRef.current = null;
        dragSourceEmptySlotGroupIdRef.current = null;
        return;
      }
      const ephContainer = findContainerByItemId(state, activeEphemeralIdRef.current);
      if (ephContainer) {
        targetGroupId = ephContainer;
      } else if (ephemeralEmptyGroupId) {
        targetGroupId = ephemeralEmptyGroupId;
      } else {
        const targetBoardHint = resolveBoardIdFromOperationEntity(event.operation.target);
        if (targetBoardHint === "entries") {
          targetGroupId = state.groupOrderByBoard.entries[0] ?? "";
        }
      }
    }

    const sourceBoardIdAtDrop = sourceGroupId ? (state.groupToBoard[sourceGroupId] ?? null) : null;
    const targetBoardIdAtDrop = targetGroupId ? (state.groupToBoard[targetGroupId] ?? null) : null;
    const canApplyMoveAtDrop =
      sourceBoardIdAtDrop !== "source" &&
      Boolean(sourceGroupId) &&
      Boolean(targetGroupId) &&
      (sourceBoardIdAtDrop === targetBoardIdAtDrop || targetBoardIdAtDrop !== null);
    const movedItemsByGroup = canApplyMoveAtDrop
      ? (move(state.itemsByGroup, event) as Record<GroupId, SetId[]>)
      : state.itemsByGroup;

    const postDropStateBeforeNormalize: DnDState = {
      ...state,
      itemsByGroup: movedItemsByGroup,
      itemsByContainer: movedItemsByGroup,
    };
    const targetGroupIndexBeforeCleanup = postDropStateBeforeNormalize.groupOrderByBoard.groups.findIndex(
      (groupId) => groupId === targetGroupId,
    );
    const postDropWithoutEphemeral = stripEphemeralItems(postDropStateBeforeNormalize);
    const postDropState = withManagedEmptySlots(
      normalizeAfterDrop(postDropWithoutEphemeral, ephemeralEmptyGroupId, BOARD_CONFIGS),
      [ephemeralEmptyGroupId, dragSourceEmptySlotGroupIdRef.current],
    );
    setState(postDropState);
    if (ephemeralEmptyGroupId && !(ephemeralEmptyGroupId in postDropState.itemsByGroup)) {
      setEphemeralEmptyGroupId(null);
    } else if (
      ephemeralEmptyGroupId &&
      (postDropState.itemsByGroup[ephemeralEmptyGroupId]?.length ?? 0) > 0
    ) {
      setEphemeralEmptyGroupId(null);
    }

    setActiveSetId(null);
    setActiveGroupId(null);
    setActiveTargetBoardId(null);
    setDragAffordanceByBoard(emptyAffordanceState());
    activeEphemeralIdRef.current = null;
    sourceGroupIdAtDragStartRef.current = null;
    dragSourceEmptySlotGroupIdRef.current = null;

    const normalizedSetId = sourceSetId.startsWith("set:") ? sourceSetId.slice(4) : "";
    const normalizedSourceGroupId = sourceGroupId.startsWith("group:")
      ? sourceGroupId.slice(6)
      : "";
    const normalizedTargetGroupId = targetGroupId.startsWith("group:")
      ? targetGroupId.slice(6)
      : "";
    const isTempTargetGroup = targetGroupId.startsWith("groups:N");
    const sourceBoardId = sourceGroupId
      ? (postDropWithoutEphemeral.groupToBoard[sourceGroupId] ?? null)
      : null;
    const targetBoardId = targetGroupId
      ? (postDropWithoutEphemeral.groupToBoard[targetGroupId] ?? null)
      : null;
    const sourceRouting = sourceBoardId ? boardRoutingById.current[sourceBoardId] : null;
    const targetRouting = targetBoardId ? boardRoutingById.current[targetBoardId] : null;
    const sourceEmitToken = resolveSourceDragToken({
      sourceBoardId,
      sourceSetId,
      sourceRoutingToken: sourceRouting?.emitToken ?? null,
      sourceItemFaceBySetId: sourceItemFaceBySetIdRef.current,
    });
    const targetGroupIndex = postDropState.groupOrderByBoard.groups.findIndex(
      (groupId) => groupId === targetGroupId,
    );
    const normalizedTargetSetIds = (postDropState.itemsByGroup[targetGroupId] ?? [])
      .filter((id) => id.startsWith("set:"))
      .map((id) => id.slice(4));
    const normalizedSourceSetIds = (postDropState.itemsByGroup[sourceGroupId] ?? [])
      .filter((id) => id.startsWith("set:"))
      .map((id) => id.slice(4));

    dragSequenceRef.current += 1;
    const dragId = `drag:${Date.now()}:${dragSequenceRef.current}:${sourceSetId}`;
    if (lastPublishedDragIdRef.current === dragId) return;
    lastPublishedDragIdRef.current = dragId;

    const events: DeckDnDEvent[] = [];
    const eventBase =
      sourceBoardId && targetBoardId
        ? ({
            dragId,
            timestamp: Date.now(),
            sourceBoardId,
            targetBoardId,
          } as const)
        : null;

    if (eventBase) {
      if (
        isTempTargetGroup &&
        sourceBoardId === "groups" &&
        targetBoardId === "groups" &&
        normalizedSetId &&
        normalizedSourceGroupId
      ) {
        events.push({
          kind: "GROUPS_DROP_SET_TO_NEW_GROUP",
          ...eventBase,
          setId: normalizedSetId,
          sourceGroupId: normalizedSourceGroupId,
          targetGroupIndex:
            targetGroupIndexBeforeCleanup >= 0
              ? targetGroupIndexBeforeCleanup
              : targetGroupIndex < 0
                ? postDropState.groupOrderByBoard.groups.length
                : targetGroupIndex,
          orderedSourceSetIds: normalizedSourceSetIds,
          sourceGroupEmptyAfterDrop: normalizedSourceSetIds.length === 0,
        });
      } else if (
        normalizedSetId &&
        normalizedSourceGroupId &&
        normalizedTargetGroupId &&
        sourceBoardId === "groups" &&
        targetBoardId === "groups"
      ) {
        events.push({
          kind: "GROUPS_REORDER_SETS",
          ...eventBase,
          setId: normalizedSetId,
          sourceGroupId: normalizedSourceGroupId,
          targetGroupId: normalizedTargetGroupId,
          orderedTargetSetIds: normalizedTargetSetIds,
          orderedSourceSetIds:
            normalizedSourceGroupId === normalizedTargetGroupId
              ? normalizedTargetSetIds
              : normalizedSourceSetIds,
          sourceGroupEmptyAfterDrop:
            normalizedSourceGroupId !== normalizedTargetGroupId &&
            normalizedSourceSetIds.length === 0,
        });
      }

      const normalizedBackFaceId =
        sourceItem?.sourceCardId ?? (sourceSetId.startsWith("source:") ? sourceSetId.slice(7) : "");
      if (
        normalizedBackFaceId &&
        sourceBoardId === "source" &&
        targetBoardId === "groups" &&
        normalizedTargetGroupId &&
        sourceEmitToken === "source-back" &&
        targetRouting?.acceptTokens.includes("source-back") &&
        !isTempTargetGroup
      ) {
        const targetItemsWithoutPending = postDropWithoutEphemeral.itemsByGroup[targetGroupId] ?? [];
        events.push({
          kind: "GROUPS_DROP_SOURCE_CARD_TO_GROUP",
          ...eventBase,
          backFaceId: normalizedBackFaceId,
          targetGroupId: normalizedTargetGroupId,
          targetIndex:
            event.operation.target?.type === "group"
              ? targetItemsWithoutPending.length
              : Math.max(0, targetItemsWithoutPending.indexOf(targetId)),
        });
      }

      if (
        normalizedBackFaceId &&
        sourceBoardId === "source" &&
        targetBoardId === "groups" &&
        sourceEmitToken === "source-back" &&
        targetRouting?.acceptTokens.includes("source-back") &&
        isTempTargetGroup
      ) {
        events.push({
          kind: "GROUPS_DROP_SOURCE_CARD_TO_NEW_GROUP",
          ...eventBase,
          backFaceId: normalizedBackFaceId,
          targetGroupIndex:
            targetGroupIndexBeforeCleanup >= 0
              ? targetGroupIndexBeforeCleanup
              : targetGroupIndex < 0
                ? postDropState.groupOrderByBoard.groups.length
                : targetGroupIndex,
        });
      }

      if (sourceBoardId === "entries" && targetBoardId === "entries") {
        const orderedEntryIds = (postDropState.itemsByGroup[targetGroupId] ?? [])
          .filter((id) => !isEmptySlotEphemeralSetId(id))
          .map((id) => id.replace(/^entry:/, ""))
          .filter(Boolean);
        events.push({
          kind: "ENTRIES_REORDER",
          ...eventBase,
          orderedEntryIds,
        });
      }

      if (
        normalizedBackFaceId &&
        sourceBoardId === "source" &&
        targetBoardId === "entries" &&
        sourceEmitToken === "source-front" &&
        targetRouting?.acceptTokens.includes("source-front")
      ) {
        const targetItems = state.itemsByGroup[targetGroupId] ?? [];
        const fallbackIndex = targetItems.length;
        const targetIndex =
          event.operation.target?.type === "group"
            ? fallbackIndex
            : Math.max(0, targetItems.indexOf(targetId));
        events.push({
          kind: "ENTRIES_DROP_SOURCE_TO_ENTRIES",
          ...eventBase,
          frontFaceId: normalizedBackFaceId,
          targetIndex,
        });
      }
    }

    if (events.length === 0 || handlersRef.current.size === 0) return;

    void (async () => {
      const handlers = [...handlersRef.current.values()];
      const settled = await Promise.allSettled(
        handlers.flatMap((handler) => events.map((eventPayload) => handler(eventPayload))),
      );
      const hasFatal = settled.some(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" &&
            result.value !== null &&
            result.value.handled &&
            !result.value.success &&
            result.value.fatal),
      );
      if (hasFatal) {
        setState(previousState.current);
      }
    })();
  };

  return (
    <DeckMockDndContext.Provider
      value={{
        state,
        setLabelsById,
        setCardIdById,
        groupLabelsById,
        activeSetId,
        activeGroupId,
        activeTargetBoardId,
        dragAffordanceByBoard,
        hoverBoundaryByBoard,
        registerGroupRef,
        handleHoverBoundary,
        handleLeaveBoard,
        setBoundaryHoverState,
        createGroupAtIndex,
        registerDropHandler,
      }}
    >
      <DragDropProvider
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {children}
        {isClient
          ? createPortal(
              <DragOverlay>
                {activeSetId ? (
                  <OverlayCard
                    setId={activeSetId}
                    groupId={findGroupIdBySetId(state.itemsByGroup, activeSetId) ?? ""}
                    label={setLabelsById[activeSetId]}
                    cardId={setCardIdById[activeSetId]}
                    renderContent={({ setId, label, cardId, state: renderState }) => (
                      <DefaultSetThumbnailContent
                        setId={setId}
                        cardId={cardId ?? setCardIdById[setId]}
                        label={label}
                        state={renderState}
                      />
                    )}
                  />
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </DragDropProvider>
    </DeckMockDndContext.Provider>
  );
}

export function useDeckSortableBoardViewModel(
  boardId: BoardId,
  routing: BoardRoutingMeta,
  options?: {
    title?: ReactNode;
    allowGroupReorder?: boolean;
    onSetClick?: (setUiId: SetId, groupUiId: GroupId, options?: { additive: boolean }) => void;
    onSetHoverChange?: DeckSortableBoardViewModel["onSetHoverChange"];
    renderSetContent?: DeckSortableBoardViewModel["renderSetContent"];
    renderTopToolbar?: DeckSortableBoardViewModel["renderTopToolbar"];
    renderBottomToolbar?: DeckSortableBoardViewModel["renderBottomToolbar"];
    isSetSelected?: DeckSortableBoardViewModel["isSetSelected"];
    resolveGroupClassName?: DeckSortableBoardViewModel["resolveGroupClassName"];
    resolveGroupStyle?: DeckSortableBoardViewModel["resolveGroupStyle"];
    resolveGroupBodyClassName?: DeckSortableBoardViewModel["resolveGroupBodyClassName"];
    resolveGroupBodyStyle?: DeckSortableBoardViewModel["resolveGroupBodyStyle"];
    resolveSetShellClassName?: DeckSortableBoardViewModel["resolveSetShellClassName"];
    resolveSetShellStyle?: DeckSortableBoardViewModel["resolveSetShellStyle"];
    renderGroupOverlay?: DeckSortableBoardViewModel["renderGroupOverlay"];
    renderBoardHeaderActions?: DeckSortableBoardViewModel["renderBoardHeaderActions"];
    emptyMessage?: string | null;
  },
): DeckSortableBoardViewModel {
  const { t } = useI18n();
  const {
    state,
    setLabelsById,
    setCardIdById,
    groupLabelsById,
    activeSetId,
    activeGroupId,
    activeTargetBoardId,
    dragAffordanceByBoard,
    hoverBoundaryByBoard,
    registerGroupRef,
    handleHoverBoundary,
    handleLeaveBoard,
    setBoundaryHoverState,
    createGroupAtIndex,
  } = useDeckMockDnd();

  return {
    config: {
      ...BOARD_CONFIGS[boardId],
      title:
        options?.title ??
        (boardId === "groups"
          ? t("decks.boards.groups")
          : boardId === "entries"
            ? t("decks.boards.entries")
            : t("decks.boards.source")),
    },
    emitToken: routing.emitToken,
    acceptTokens: routing.acceptTokens,
    groupIds: state.groupOrderByBoard[boardId],
    itemsByGroup: state.itemsByGroup,
    groupLabelsById,
    setLabelsById,
    setCardIdById,
    activeSetId,
    activeGroupId,
    activeTargetBoardId,
    showDropAffordance: dragAffordanceByBoard[boardId] ?? false,
    hoverBoundaryIndex: hoverBoundaryByBoard[boardId],
    onHoverBoundary: (clientX: number) => handleHoverBoundary(boardId, clientX),
    onLeaveBoard: () => handleLeaveBoard(boardId),
    onBoundaryHoverChange: (index: number, isHovered: boolean) =>
      setBoundaryHoverState(boardId, index, isHovered),
    onCreateGroupAtIndex: (index: number) => createGroupAtIndex(boardId, index),
    registerGroupRef,
    allowGroupReorder: options?.allowGroupReorder ?? false,
    onSetClick: options?.onSetClick,
    onSetHoverChange: options?.onSetHoverChange,
    renderTopToolbar: options?.renderTopToolbar,
    renderBottomToolbar: options?.renderBottomToolbar,
    isSetSelected: options?.isSetSelected,
    resolveGroupClassName: options?.resolveGroupClassName,
    resolveGroupStyle: options?.resolveGroupStyle,
    resolveGroupBodyClassName: options?.resolveGroupBodyClassName,
    resolveGroupBodyStyle: options?.resolveGroupBodyStyle,
    resolveSetShellClassName: options?.resolveSetShellClassName,
    resolveSetShellStyle: options?.resolveSetShellStyle,
    renderGroupOverlay: options?.renderGroupOverlay,
    renderBoardHeaderActions: options?.renderBoardHeaderActions,
    renderSetContent:
      options?.renderSetContent ??
      (({ setId, label, cardId, state: renderState }) => (
        <DefaultSetThumbnailContent
          setId={setId}
          cardId={cardId ?? setCardIdById[setId]}
          label={label}
          state={renderState}
        />
      )),
    emptyMessage: options?.emptyMessage ?? null,
  };
}

type GroupsAdapterInput = {
  orderedGroups: Array<{ id: string; title: string }>;
  sets: Array<{
    id: string;
    groupId: string;
    sortIndex: number;
    title: string;
    backFaceId: string;
  }>;
  cardNameById: Map<string, string>;
};

type EntriesAdapterInput = {
  entriesSorted: Array<{ id: string; sortIndex: number }>;
  entryFrontIdByEntryId: Map<string, string>;
  cardNameById: Map<string, string>;
  laneLabel?: string;
};

type SourceAdapterInput = {
  cards: Array<{ id: string; name: string }>;
  sourceFaceMode: SourceItemFace;
  laneLabel?: string;
};

export function toGroupsBoardModel(input: GroupsAdapterInput): BoardModel {
  const groupIds = input.orderedGroups.map((group) => `group:${group.id}`);
  const groupLabelsById: Record<GroupId, string> = {};
  const itemsByGroup: Record<GroupId, SetId[]> = {};
  const setLabelsById: Record<SetId, string> = {};
  const setCardIdById: Record<SetId, string> = {};

  input.orderedGroups.forEach((group) => {
    const gid = `group:${group.id}`;
    groupLabelsById[gid] = group.id;
    itemsByGroup[gid] = input.sets
      .filter((set) => set.groupId === group.id)
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map((set) => {
        const sid = `set:${set.id}`;
        setCardIdById[sid] = set.backFaceId;
        setLabelsById[sid] =
          input.cardNameById.get(set.backFaceId)?.trim() || set.title?.trim() || set.id;
        return sid;
      });
  });

  return {
    boardId: "groups",
    groupIds,
    itemsByGroup,
    groupLabelsById,
    setLabelsById,
    setCardIdById,
    emitToken: "set",
    acceptTokens: ["source-back"],
  };
}

export function toEntriesBoardModel(input: EntriesAdapterInput): BoardModel {
  const groupId = "entries:lane";
  const setLabelsById: Record<SetId, string> = {};
  const setCardIdById: Record<SetId, string> = {};
  const itemIds = input.entriesSorted.map((entry) => {
    const sid = `entry:${entry.id}`;
    const frontId = input.entryFrontIdByEntryId.get(entry.id);
    if (frontId) setCardIdById[sid] = frontId;
    const frontTitle = frontId ? (input.cardNameById.get(frontId)?.trim() ?? "") : "";
    if (frontTitle) {
      setLabelsById[sid] = frontTitle;
    } else if (frontId) {
      setLabelsById[sid] = frontId.slice(0, 8);
    } else {
      setLabelsById[sid] = entry.id.slice(0, 8);
    }
    return sid;
  });
  if (itemIds.length === 0) {
    itemIds.push(createEmptySlotEphemeralSetId(groupId));
  }

  return {
    boardId: "entries",
    groupIds: [groupId],
    itemsByGroup: { [groupId]: itemIds },
    groupLabelsById: { [groupId]: input.laneLabel ?? "Entries" },
    setLabelsById,
    setCardIdById,
    emitToken: "entry",
    acceptTokens: ["source-front"],
  };
}

export function toSourceBoardModel(input: SourceAdapterInput): BoardModel {
  const groupId = "source:lane";
  const setLabelsById: Record<SetId, string> = {};
  const setCardIdById: Record<SetId, string> = {};
  const sourceItemFaceBySetId: Record<SetId, SourceItemFace> = {};
  const itemIds = input.cards.map((card) => {
    const sid = `source:${card.id}`;
    setLabelsById[sid] = card.name?.trim() || card.id;
    setCardIdById[sid] = card.id;
    sourceItemFaceBySetId[sid] = input.sourceFaceMode;
    return sid;
  });

  return {
    boardId: "source",
    groupIds: [groupId],
    itemsByGroup: { [groupId]: itemIds },
    groupLabelsById: { [groupId]: input.laneLabel ?? "Cards" },
    setLabelsById,
    setCardIdById,
    sourceItemFaceBySetId,
    emitToken: "source",
    acceptTokens: [],
  };
}
