"use client";

import { move } from "@dnd-kit/helpers";
import {
  DragDropProvider,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
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

import CardThumbnail from "@/components/common/CardThumbnail";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

import styles from "../DeckGroupsSection2.module.css";

export type BoardId = "groups" | "entries" | "source";
type GroupId = string;
type SetId = string;
export type LayoutMode = "content" | "fill-parent";
type DragRouteToken = string;
type SetRenderState = "idle" | "dragging" | "ghost" | "dropTarget" | "pending" | "overlay";
type SourceItemFace = "front" | "back";
type SetToolbarContext = {
  boardId: BoardId;
  setId: SetId;
  groupId: GroupId;
  cardId?: string;
  isSelected: boolean;
  isDragging: boolean;
  isGhost: boolean;
  isDropTarget: boolean;
};

type BoardInfoPillProps = {
  icon?: ReactNode;
  label: ReactNode;
  bgColor?: string;
  borderColor?: string;
};

type BoardConfig = {
  boardId: BoardId;
  title: string;
  allowMultipleGroups: boolean;
  allowGroupCreate: boolean;
  allowInGroupSort: boolean;
  allowDropTarget: boolean;
};

type UiContainer = {
  id: GroupId;
  boardId: BoardId;
  role: "group" | "entries-lane" | "source-lane";
  allowSortWithin: boolean;
  accepts: DragRouteToken[];
};

type UiItem = {
  uiItemId: SetId;
  kind: "set" | "entry" | "source-template";
  face: SourceItemFace | null;
  sourceCardId: string | null;
  persistedId: string | null;
  isEphemeral: boolean;
};

type DnDState = {
  groupOrderByBoard: Record<BoardId, GroupId[]>;
  itemsByGroup: Record<GroupId, SetId[]>;
  groupToBoard: Record<GroupId, BoardId>;
  containerOrderByBoard: Record<BoardId, GroupId[]>;
  itemsByContainer: Record<GroupId, SetId[]>;
  containersById: Record<GroupId, UiContainer>;
  itemsById: Record<SetId, UiItem>;
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

export type BoardModel = {
  boardId: BoardId;
  groupIds: GroupId[];
  itemsByGroup: Record<GroupId, SetId[]>;
  groupLabelsById: Record<GroupId, string>;
  setLabelsById: Record<SetId, string>;
  setCardIdById: Record<SetId, string>;
  sourceItemFaceBySetId?: Record<SetId, SourceItemFace>;
  emitToken: DragRouteToken;
  acceptTokens: DragRouteToken[];
};

type DeckMockDndContextValue = {
  state: DnDState;
  setLabelsById: Record<SetId, string>;
  setCardIdById: Record<SetId, string>;
  groupLabelsById: Record<GroupId, string>;
  activeSetId: SetId | null;
  activeTargetBoardId: BoardId | null;
  dragAffordanceByBoard: Record<BoardId, boolean>;
  hoverBoundaryByBoard: Record<BoardId, number | null>;
  registerGroupRef: (groupId: GroupId, node: HTMLElement | null) => void;
  handleHoverBoundary: (boardId: BoardId, clientX: number) => void;
  handleLeaveBoard: (boardId: BoardId) => void;
  createGroupAtIndex: (boardId: BoardId, index: number) => void;
  registerDropHandler: (controllerId: string, handler: DeckDropHandler) => () => void;
};

export type DeckSortableBoardViewModel = {
  config: BoardConfig;
  emitToken: DragRouteToken;
  acceptTokens: DragRouteToken[];
  groupIds: GroupId[];
  itemsByGroup: Record<GroupId, SetId[]>;
  groupLabelsById: Record<GroupId, string>;
  setLabelsById: Record<SetId, string>;
  setCardIdById: Record<SetId, string>;
  activeSetId: SetId | null;
  activeTargetBoardId: BoardId | null;
  showDropAffordance: boolean;
  hoverBoundaryIndex: number | null;
  onHoverBoundary: (clientX: number) => void;
  onLeaveBoard: () => void;
  onCreateGroupAtIndex: (index: number) => void;
  registerGroupRef: (groupId: GroupId, node: HTMLElement | null) => void;
  onSetClick?: (setUiId: SetId, groupUiId: GroupId) => void;
  renderSetContent: (args: {
    setId: SetId;
    groupId: GroupId;
    label?: string;
    cardId?: string;
    state: SetRenderState;
  }) => React.ReactNode;
  renderTopToolbar?: (args: SetToolbarContext) => React.ReactNode;
  renderBottomToolbar?: (args: SetToolbarContext) => React.ReactNode;
  isSetSelected?: (setId: SetId, groupId: GroupId) => boolean;
  emptyMessage?: string | null;
};

export type BoardRoutingMeta = {
  emitToken: DragRouteToken;
  acceptTokens: DragRouteToken[];
};

const BOARD_CONFIGS: Record<BoardId, BoardConfig> = {
  groups: {
    boardId: "groups",
    title: "Groups",
    allowMultipleGroups: true,
    allowGroupCreate: true,
    allowInGroupSort: true,
    allowDropTarget: true,
  },
  entries: {
    boardId: "entries",
    title: "Entries",
    allowMultipleGroups: false,
    allowGroupCreate: false,
    allowInGroupSort: true,
    allowDropTarget: true,
  },
  source: {
    boardId: "source",
    title: "Source",
    allowMultipleGroups: false,
    allowGroupCreate: false,
    allowInGroupSort: false,
    allowDropTarget: false,
  },
};

const SHOW_GROUP_HEADINGS = false;

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

function parseGroupLabel(groupId: GroupId): string {
  return groupId.split(":")[1] ?? groupId;
}

function parseSetLabel(setId: SetId): string {
  if (setId.startsWith("g-")) return setId.slice(2).toUpperCase();
  return setId.toUpperCase();
}

function isEphemeralSetId(setId: SetId): boolean {
  return setId.startsWith("ephemeral:source:");
}

function stripEphemeralItems(state: DnDState): DnDState {
  const nextItemsByContainer: Record<GroupId, SetId[]> = {};
  Object.keys(state.itemsByContainer).forEach((containerId) => {
    nextItemsByContainer[containerId] = (state.itemsByContainer[containerId] ?? []).filter(
      (id) => !state.itemsById[id]?.isEphemeral,
    );
  });
  const nextItemsById: Record<SetId, UiItem> = {};
  Object.keys(state.itemsById).forEach((itemId) => {
    if (!state.itemsById[itemId]?.isEphemeral) {
      nextItemsById[itemId] = state.itemsById[itemId];
    }
  });
  return {
    ...state,
    itemsByGroup: nextItemsByContainer,
    itemsByContainer: nextItemsByContainer,
    itemsById: nextItemsById,
  };
}

function findContainerByItemId(state: DnDState, setId: SetId): GroupId | null {
  const containerId = Object.keys(state.itemsByContainer).find((candidate) =>
    state.itemsByContainer[candidate]?.includes(setId),
  );
  return containerId ?? null;
}

function moveEphemeralToContainer(
  state: DnDState,
  ephemeralId: SetId,
  targetContainerId: GroupId,
  targetIndex: number,
): DnDState {
  const nextItemsByContainer: Record<GroupId, SetId[]> = {};
  Object.keys(state.itemsByContainer).forEach((containerId) => {
    nextItemsByContainer[containerId] = (state.itemsByContainer[containerId] ?? []).filter(
      (id) => id !== ephemeralId,
    );
  });
  const targetItems = nextItemsByContainer[targetContainerId] ?? [];
  const index = clamp(targetIndex, 0, targetItems.length);
  targetItems.splice(index, 0, ephemeralId);
  nextItemsByContainer[targetContainerId] = targetItems;
  return {
    ...state,
    itemsByGroup: nextItemsByContainer,
    itemsByContainer: nextItemsByContainer,
  };
}

function createDnDStateFromModels(boardModels: Record<BoardId, BoardModel>): DnDState {
  const containerOrderByBoard: Record<BoardId, GroupId[]> = {
    groups: boardModels.groups.groupIds.slice(),
    entries: boardModels.entries.groupIds.slice(),
    source: boardModels.source.groupIds.slice(),
  };
  const itemsByContainer: Record<GroupId, SetId[]> = {};
  const containersById: Record<GroupId, UiContainer> = {};
  const itemsById: Record<SetId, UiItem> = {};

  (Object.keys(boardModels) as BoardId[]).forEach((boardId) => {
    const model = boardModels[boardId];
    model.groupIds.forEach((groupId) => {
      itemsByContainer[groupId] = (model.itemsByGroup[groupId] ?? []).slice();
      containersById[groupId] = {
        id: groupId,
        boardId,
        role:
          boardId === "groups" ? "group" : boardId === "entries" ? "entries-lane" : "source-lane",
        allowSortWithin: BOARD_CONFIGS[boardId].allowInGroupSort,
        accepts: model.acceptTokens,
      };
      (model.itemsByGroup[groupId] ?? []).forEach((setId) => {
        if (itemsById[setId]) return;
        if (boardId === "groups") {
          itemsById[setId] = {
            uiItemId: setId,
            kind: "set",
            face: "back",
            sourceCardId: model.setCardIdById[setId] ?? null,
            persistedId: setId.startsWith("set:") ? setId.slice(4) : null,
            isEphemeral: false,
          };
          return;
        }
        if (boardId === "entries") {
          itemsById[setId] = {
            uiItemId: setId,
            kind: "entry",
            face: "front",
            sourceCardId: model.setCardIdById[setId] ?? null,
            persistedId: setId.startsWith("entry:") ? setId.slice(6) : null,
            isEphemeral: false,
          };
          return;
        }
        itemsById[setId] = {
          uiItemId: setId,
          kind: "source-template",
          face: model.sourceItemFaceBySetId?.[setId] ?? null,
          sourceCardId: model.setCardIdById[setId] ?? (setId.startsWith("source:") ? setId.slice(7) : null),
          persistedId: null,
          isEphemeral: false,
        };
      });
    });
  });

  return {
    groupOrderByBoard: containerOrderByBoard,
    itemsByGroup: itemsByContainer,
    groupToBoard: Object.fromEntries(
      Object.keys(containersById).map((containerId) => [containerId, containersById[containerId].boardId]),
    ) as Record<GroupId, BoardId>,
    containerOrderByBoard,
    itemsByContainer,
    containersById,
    itemsById,
  };
}

function collectLabels(boardModels: Record<BoardId, BoardModel>) {
  const groupLabelsById: Record<GroupId, string> = {};
  const setLabelsById: Record<SetId, string> = {};
  const setCardIdById: Record<SetId, string> = {};

  (Object.keys(boardModels) as BoardId[]).forEach((boardId) => {
    Object.assign(groupLabelsById, boardModels[boardId].groupLabelsById);
    Object.assign(setLabelsById, boardModels[boardId].setLabelsById);
    Object.assign(setCardIdById, boardModels[boardId].setCardIdById);
  });

  return { groupLabelsById, setLabelsById, setCardIdById };
}

function canRouteDrag({
  sourceBoardId,
  sourceGroupId,
  targetBoardId,
  targetGroupId,
  sameGroup,
  sourceAllowInGroupSort,
  targetAllowDropTarget,
  sourceEmitToken,
  targetAcceptTokens,
  sourceItem,
  targetContainer,
}: {
  sourceBoardId: BoardId | null;
  sourceGroupId: GroupId | null;
  targetBoardId: BoardId | null;
  targetGroupId: GroupId | null;
  sameGroup: boolean;
  sourceAllowInGroupSort: boolean;
  targetAllowDropTarget: boolean;
  sourceEmitToken: DragRouteToken | null;
  targetAcceptTokens: DragRouteToken[] | null;
  sourceItem: UiItem | null;
  targetContainer: UiContainer | null;
}): boolean {
  if (!sourceBoardId || !sourceGroupId || !targetBoardId || !targetGroupId) return false;
  if (sameGroup) return sourceAllowInGroupSort;
  if (sourceBoardId === targetBoardId) {
    return sourceAllowInGroupSort && targetAllowDropTarget;
  }
  if (!targetAllowDropTarget) return false;
  if (!sourceEmitToken) return false;
  if (!targetAcceptTokens) return false;
  if (!targetAcceptTokens.includes(sourceEmitToken)) return false;
  if (sourceItem?.kind === "source-template" && targetContainer) {
    if (sourceItem.face === "back" && !targetContainer.accepts.includes("source-back")) return false;
    if (sourceItem.face === "front" && !targetContainer.accepts.includes("source-front")) return false;
  }
  return true;
}

function resolveSourceDragToken({
  sourceBoardId,
  sourceSetId,
  sourceRoutingToken,
  sourceItemFaceBySetId,
}: {
  sourceBoardId: BoardId | null;
  sourceSetId: SetId;
  sourceRoutingToken: DragRouteToken | null;
  sourceItemFaceBySetId: Record<SetId, SourceItemFace>;
}): DragRouteToken | null {
  if (sourceBoardId !== "source") return sourceRoutingToken;
  const face = sourceItemFaceBySetId[sourceSetId];
  if (face === "front") return "source-front";
  if (face === "back") return "source-back";
  return null;
}

function emptyAffordanceState(): Record<BoardId, boolean> {
  return {
    groups: false,
    entries: false,
    source: false,
  };
}

function computeAffordanceByBoard({
  sourceBoardId,
  sourceEmitToken,
  routingById,
}: {
  sourceBoardId: BoardId | null;
  sourceEmitToken: DragRouteToken | null;
  routingById: Record<BoardId, BoardRoutingMeta>;
}): Record<BoardId, boolean> {
  if (sourceBoardId !== "source" || !sourceEmitToken) {
    return emptyAffordanceState();
  }
  const next = emptyAffordanceState();
  (Object.keys(BOARD_CONFIGS) as BoardId[]).forEach((boardId) => {
    if (!BOARD_CONFIGS[boardId].allowDropTarget) return;
    if (routingById[boardId].acceptTokens.includes(sourceEmitToken)) {
      next[boardId] = true;
    }
  });
  return next;
}

function findGroupIdBySetId(itemsByGroup: Record<GroupId, SetId[]>, setId: SetId): GroupId | null {
  const groupId = Object.keys(itemsByGroup).find((candidate) =>
    itemsByGroup[candidate]?.includes(setId),
  );
  return groupId ?? null;
}

function extractGroupIdFromOperationEntity(entity: unknown): string {
  if (!entity || typeof entity !== "object") return "";
  const maybeEntity = entity as {
    group?: string;
    data?: { group?: string };
  };
  return String(maybeEntity.group ?? maybeEntity.data?.group ?? "");
}

function getBlockedBoundaries(
  groupIds: GroupId[],
  itemsByGroup: Record<GroupId, SetId[]>,
): Set<number> {
  const blocked = new Set<number>();
  groupIds.forEach((groupId, index) => {
    if ((itemsByGroup[groupId]?.length ?? 0) === 0) {
      blocked.add(index);
      blocked.add(index + 1);
    }
  });
  return blocked;
}

function normalizeAfterDrop(current: DnDState): DnDState {
  const nextGroupOrderByBoard: DnDState["groupOrderByBoard"] = {
    groups: [],
    entries: [],
    source: [],
  };
  const nextItemsByGroup: DnDState["itemsByGroup"] = {};
  const nextGroupToBoard: DnDState["groupToBoard"] = {};
  const nextContainersById: DnDState["containersById"] = {};
  const nextItemsById: DnDState["itemsById"] = { ...current.itemsById };

  (Object.keys(current.groupOrderByBoard) as BoardId[]).forEach((boardId) => {
    const config = BOARD_CONFIGS[boardId];
    current.groupOrderByBoard[boardId].forEach((groupId) => {
      const sets = current.itemsByGroup[groupId] ?? [];
      const keepEmpty = !config.allowMultipleGroups;
      if (sets.length > 0 || keepEmpty) {
        nextGroupOrderByBoard[boardId].push(groupId);
        nextGroupToBoard[groupId] = boardId;
        nextItemsByGroup[groupId] = sets;
        if (current.containersById[groupId]) {
          nextContainersById[groupId] = current.containersById[groupId];
        }
      }
    });
  });

  Object.keys(nextItemsById).forEach((itemId) => {
    const stillPresent = Object.values(nextItemsByGroup).some((items) => items.includes(itemId));
    if (!stillPresent && nextItemsById[itemId]?.isEphemeral) {
      delete nextItemsById[itemId];
    }
  });

  return {
    groupOrderByBoard: nextGroupOrderByBoard,
    itemsByGroup: nextItemsByGroup,
    groupToBoard: nextGroupToBoard,
    containerOrderByBoard: nextGroupOrderByBoard,
    itemsByContainer: nextItemsByGroup,
    containersById: nextContainersById,
    itemsById: nextItemsById,
  };
}

function GroupColumn({
  groupId,
  label,
  children,
  fillParent,
  canReceiveDrops,
  showHeader,
  sourceLayout,
  entriesLayout,
}: {
  groupId: GroupId;
  label?: string;
  children: React.ReactNode;
  fillParent: boolean;
  canReceiveDrops: boolean;
  showHeader: boolean;
  sourceLayout?: boolean;
  entriesLayout?: boolean;
}) {
  const { ref } = useDroppable({
    id: groupId,
    type: "group",
    accept: canReceiveDrops ? ["set"] : [],
  });

  return (
    <section
      className={[
        styles.group,
        fillParent ? styles.groupFillParent : "",
        sourceLayout ? styles.groupSource : "",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      data-testid={`group-${groupId}`}
    >
      {showHeader ? (
        <header className={styles.groupHeader}>
          <span>{label ?? parseGroupLabel(groupId)}</span>
          <span className={styles.grip} aria-hidden="true">
            ⠿
          </span>
        </header>
      ) : null}
      <div
        className={[
          styles.groupBody,
          fillParent ? styles.groupBodyFillParent : "",
          sourceLayout ? styles.groupBodySource : "",
          sourceLayout && fillParent ? styles.groupBodySourceFillParent : "",
          entriesLayout && fillParent ? styles.groupBodyEntriesFillParent : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </section>
  );
}

export function DefaultSetThumbnailContent({
  setId,
  cardId,
  label,
  state,
}: {
  setId: SetId;
  cardId?: string;
  label?: string;
  state: SetRenderState;
}) {
  const thumbUrl = useCardThumbnailUrl(cardId ?? null, null, {
    enabled: Boolean(cardId),
    useCache: true,
  });
  const title = label ?? parseSetLabel(setId);
  const stateClass =
    state === "dragging" || state === "overlay"
      ? styles.setContentDragging
      : state === "ghost" || state === "pending"
        ? styles.setContentGhost
        : state === "dropTarget"
          ? styles.setContentDropTarget
          : "";

  return (
    <div className={[styles.setContent, stateClass].filter(Boolean).join(" ")}>
      <CardThumbnail
        src={thumbUrl}
        alt={title}
        variant="md"
        fit="contain"
        className={styles.setThumb}
        fallback={<div className={styles.setThumbFallback} />}
      />
    </div>
  );
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

function SortableSetCard({
  boardId,
  setId,
  label,
  index,
  groupId,
  cardId,
  renderContent,
  isSelected,
  isEphemeral,
  onClick,
  renderTopToolbar,
  renderBottomToolbar,
  sourceLayout,
}: {
  boardId: BoardId;
  setId: SetId;
  label?: string;
  index: number;
  groupId: GroupId;
  cardId?: string;
  renderContent: DeckSortableBoardViewModel["renderSetContent"];
  isSelected: boolean;
  isEphemeral?: boolean;
  onClick?: () => void;
  renderTopToolbar?: DeckSortableBoardViewModel["renderTopToolbar"];
  renderBottomToolbar?: DeckSortableBoardViewModel["renderBottomToolbar"];
  sourceLayout?: boolean;
}) {
  const { ref, isDragging, isDragSource, isDropTarget } = useSortable({
    id: setId,
    index,
    type: "set",
    accept: ["set"],
    group: groupId,
  });

  return (
    <div
      className={[styles.setShell, sourceLayout ? styles.setShellSource : ""].filter(Boolean).join(" ")}
      ref={ref}
      data-testid={`set-${setId}`}
    >
      {renderTopToolbar
        ? (
            <div className={styles.setCardTopToolbar}>
              {renderTopToolbar({
                boardId,
                setId,
                groupId,
                cardId,
                isSelected,
                isDragging,
                isGhost: isDragSource || Boolean(isEphemeral),
                isDropTarget,
              })}
            </div>
          )
        : null}
      <div
        className={[
          styles.setCard,
          isSelected ? styles.setCardSelected : "",
          isDragging ? styles.setCardDragging : "",
          isDragSource ? styles.setCardGhost : "",
          isEphemeral ? styles.setCardGhost : "",
          isDropTarget ? styles.setCardDropTarget : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick}
      >
        {renderContent({
          setId,
          groupId,
          label,
          cardId,
          state: isDragging
            ? "dragging"
            : isDropTarget
              ? "dropTarget"
              : isDragSource
                ? "ghost"
                : isEphemeral
                  ? "ghost"
                  : "idle",
        })}
      </div>
      {renderBottomToolbar
        ? (
            <div className={styles.setCardBottomToolbar}>
              {renderBottomToolbar({
                boardId,
                setId,
                groupId,
                cardId,
                isSelected,
                isDragging,
                isGhost: isDragSource || Boolean(isEphemeral),
                isDropTarget,
              })}
            </div>
          )
        : null}
    </div>
  );
}

function DraggableSetCard({
  boardId,
  setId,
  label,
  groupId,
  cardId,
  renderContent,
  isSelected,
  isEphemeral,
  onClick,
  renderTopToolbar,
  renderBottomToolbar,
  sourceLayout,
}: {
  boardId: BoardId;
  setId: SetId;
  label?: string;
  groupId: GroupId;
  cardId?: string;
  renderContent: DeckSortableBoardViewModel["renderSetContent"];
  isSelected: boolean;
  isEphemeral?: boolean;
  onClick?: () => void;
  renderTopToolbar?: DeckSortableBoardViewModel["renderTopToolbar"];
  renderBottomToolbar?: DeckSortableBoardViewModel["renderBottomToolbar"];
  sourceLayout?: boolean;
}) {
  const { ref, handleRef, isDragging } = useDraggable({
    id: setId,
    type: "set",
    data: { group: groupId },
  });

  return (
    <div
      className={[styles.setShell, sourceLayout ? styles.setShellSource : ""].filter(Boolean).join(" ")}
      ref={ref}
      data-testid={`set-${setId}`}
    >
      {renderTopToolbar
        ? (
            <div className={styles.setCardTopToolbar}>
              {renderTopToolbar({
                boardId,
                setId,
                groupId,
                cardId,
                isSelected,
                isDragging,
                isGhost: isDragging || Boolean(isEphemeral),
                isDropTarget: false,
              })}
            </div>
          )
        : null}
      <div
        className={[
          styles.setCard,
          isSelected ? styles.setCardSelected : "",
          isDragging ? styles.setCardDragging : "",
          isDragging ? styles.setCardGhost : "",
          isEphemeral ? styles.setCardGhost : "",
        ]
          .filter(Boolean)
          .join(" ")}
        ref={handleRef}
        onClick={onClick}
      >
        {renderContent({
          setId,
          groupId,
          label,
          cardId,
          state: isDragging ? "dragging" : isEphemeral ? "ghost" : "idle",
        })}
      </div>
      {renderBottomToolbar
        ? (
            <div className={styles.setCardBottomToolbar}>
              {renderBottomToolbar({
                boardId,
                setId,
                groupId,
                cardId,
                isSelected,
                isDragging,
                isGhost: isDragging || Boolean(isEphemeral),
                isDropTarget: false,
              })}
            </div>
          )
        : null}
    </div>
  );
}

function OverlayCard({
  setId,
  groupId,
  label,
  cardId,
  renderContent,
}: {
  setId: SetId;
  groupId: GroupId;
  label?: string;
  cardId?: string;
  renderContent: DeckSortableBoardViewModel["renderSetContent"];
}) {
  return (
    <div className={styles.overlay}>
      <div className={[styles.setCard, styles.setCardDragging].join(" ")}>
        {renderContent({
          setId,
          groupId,
          label,
          cardId,
          state: "overlay",
        })}
      </div>
    </div>
  );
}

function CreateBoundaryPlaceholder({
  index,
  onCreate,
}: {
  index: number;
  onCreate: (index: number) => void;
}) {
  return (
    <div className={styles.createBoundary} data-testid={`create-boundary-${index}`}>
      <button
        type="button"
        className={styles.createBoundaryButton}
        onClick={() => onCreate(index)}
        aria-label={`Create group at position ${index}`}
      >
        +
      </button>
    </div>
  );
}

export function DeckSortableBoardView({
  model,
  layoutMode = "content",
}: {
  model: DeckSortableBoardViewModel;
  layoutMode?: LayoutMode;
}) {
  const { config, groupIds, itemsByGroup, activeSetId, activeTargetBoardId, hoverBoundaryIndex } = model;
  const useFillParent = layoutMode === "fill-parent" && !config.allowMultipleGroups;
  const isSourceBoard = config.boardId === "source";
  const isEntriesBoard = config.boardId === "entries";
  const blockedBoundaries = useMemo(
    () => getBlockedBoundaries(groupIds, itemsByGroup),
    [groupIds, itemsByGroup],
  );

  return (
    <section
      className={[styles.board, useFillParent ? styles.boardFillParent : ""]
        .concat(isSourceBoard ? [" ", styles.boardSource] : [])
        .concat(model.showDropAffordance ? [" ", styles.boardDropActive] : [])
        .concat(
          model.showDropAffordance && activeTargetBoardId === config.boardId
            ? [" ", styles.boardDropOver]
            : [],
        )
        .filter(Boolean)
        .join(" ")}
      data-testid={`board-${config.boardId}`}
    >
      {config.boardId === "source" ? null : <header className={styles.boardHeader}>{config.title}</header>}
      <div
        className={[
          styles.groupsRow,
          useFillParent ? styles.groupsRowFillParent : "",
          isSourceBoard ? styles.groupsRowSource : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-testid={`groups-row-${config.boardId}`}
        onMouseMove={(event) => model.onHoverBoundary(event.clientX)}
        onMouseLeave={model.onLeaveBoard}
      >
        {groupIds.map((groupId, index) => (
          <div key={groupId} className={styles.groupStack}>
            {!activeSetId &&
            config.allowGroupCreate &&
            hoverBoundaryIndex === index &&
            !blockedBoundaries.has(index) ? (
              <CreateBoundaryPlaceholder index={index} onCreate={model.onCreateGroupAtIndex} />
            ) : null}
            <div
              className={useFillParent ? styles.groupWrapperFillParent : ""}
              ref={(node) => model.registerGroupRef(groupId, node)}
            >
              <GroupColumn
                groupId={groupId}
                label={model.groupLabelsById[groupId]}
                fillParent={useFillParent}
                canReceiveDrops={config.allowDropTarget}
                showHeader={SHOW_GROUP_HEADINGS}
                sourceLayout={isSourceBoard}
                entriesLayout={isEntriesBoard}
              >
                {(() => {
                  const groupSetIds = itemsByGroup[groupId] ?? [];

                  return groupSetIds.map((setId, setIndex) => (
                    <div key={setId}>
                      {config.allowInGroupSort ? (
                        <SortableSetCard
                          boardId={config.boardId}
                          setId={setId}
                          label={model.setLabelsById[setId]}
                          cardId={model.setCardIdById[setId]}
                          index={setIndex}
                          groupId={groupId}
                          renderContent={model.renderSetContent}
                          isSelected={model.isSetSelected?.(setId, groupId) ?? false}
                          isEphemeral={isEphemeralSetId(setId)}
                          renderTopToolbar={model.renderTopToolbar}
                          renderBottomToolbar={model.renderBottomToolbar}
                          sourceLayout={isSourceBoard}
                          onClick={() => {
                            if (model.activeSetId) return;
                            model.onSetClick?.(setId, groupId);
                          }}
                        />
                      ) : null}
                      {!config.allowInGroupSort ? (
                        <DraggableSetCard
                          boardId={config.boardId}
                          setId={setId}
                          label={model.setLabelsById[setId]}
                          cardId={model.setCardIdById[setId]}
                          groupId={groupId}
                          renderContent={model.renderSetContent}
                          isSelected={model.isSetSelected?.(setId, groupId) ?? false}
                          isEphemeral={isEphemeralSetId(setId)}
                          renderTopToolbar={model.renderTopToolbar}
                          renderBottomToolbar={model.renderBottomToolbar}
                          sourceLayout={isSourceBoard}
                          onClick={() => {
                            if (model.activeSetId) return;
                            model.onSetClick?.(setId, groupId);
                          }}
                        />
                      ) : null}
                    </div>
                  ));
                })()}
                {(itemsByGroup[groupId] ?? []).length === 0 && model.emptyMessage ? (
                  <div>{model.emptyMessage}</div>
                ) : null}
              </GroupColumn>
            </div>
          </div>
        ))}

        {!activeSetId &&
        config.allowGroupCreate &&
        hoverBoundaryIndex === groupIds.length &&
        !blockedBoundaries.has(groupIds.length) ? (
          <CreateBoundaryPlaceholder
            index={groupIds.length}
            onCreate={model.onCreateGroupAtIndex}
          />
        ) : null}
      </div>
    </section>
  );
}

export function DeckMockDndProvider({
  children,
  boardModels,
}: {
  children: React.ReactNode;
  boardModels: Record<BoardId, BoardModel>;
}) {
  const initialState = useMemo(() => createDnDStateFromModels(boardModels), [boardModels]);
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
  const [activeTargetBoardId, setActiveTargetBoardId] = useState<BoardId | null>(null);
  const [dragAffordanceByBoard, setDragAffordanceByBoard] = useState<Record<BoardId, boolean>>(
    emptyAffordanceState(),
  );
  const [hoverBoundaryByBoard, setHoverBoundaryByBoard] = useState<Record<BoardId, number | null>>({
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
    setState(initialState);
    previousState.current = initialState;
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

  const resolveBoundaryForBoard = (boardId: BoardId, clientX: number): number => {
    const groups = state.groupOrderByBoard[boardId]
      .map((groupId) => ({ node: groupRefs.current.get(groupId) }))
      .filter((entry): entry is { node: HTMLElement } => Boolean(entry.node));

    if (groups.length === 0) return 0;

    for (let i = 0; i < groups.length; i += 1) {
      const rect = groups[i].node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      if (clientX < centerX) return i;
    }
    return groups.length;
  };

  const handleHoverBoundary = (boardId: BoardId, clientX: number) => {
    if (activeSetId) return;
    setHoverBoundaryByBoard((current) => ({
      ...current,
      [boardId]: resolveBoundaryForBoard(boardId, clientX),
    }));
  };

  const handleLeaveBoard = (boardId: BoardId) => {
    if (activeSetId) return;
    setHoverBoundaryByBoard((current) => ({ ...current, [boardId]: null }));
  };

  const createGroupAtIndex = (boardId: BoardId, index: number) => {
    const config = BOARD_CONFIGS[boardId];
    if (!config.allowGroupCreate || !config.allowMultipleGroups) return;

    const blocked = getBlockedBoundaries(state.groupOrderByBoard[boardId], state.itemsByGroup);
    if (blocked.has(index)) return;

    const newGroupId = `${boardId}:N${nextGroupIdRef.current}`;
    nextGroupIdRef.current += 1;

    setState((current) => {
      const nextBoardGroups = current.groupOrderByBoard[boardId].slice();
      const nextGroupOrderByBoard = { ...current.groupOrderByBoard };
      const nextItemsByGroup = { ...current.itemsByGroup };
      const nextGroupToBoard = { ...current.groupToBoard };
      const nextContainersById = { ...current.containersById };

      if (ephemeralEmptyGroupId && (nextItemsByGroup[ephemeralEmptyGroupId]?.length ?? 0) === 0) {
        const previousBoard = nextGroupToBoard[ephemeralEmptyGroupId];
        if (previousBoard) {
          nextGroupOrderByBoard[previousBoard] = nextGroupOrderByBoard[previousBoard].filter(
            (groupId) => groupId !== ephemeralEmptyGroupId,
          );
          delete nextItemsByGroup[ephemeralEmptyGroupId];
          delete nextGroupToBoard[ephemeralEmptyGroupId];
          delete nextContainersById[ephemeralEmptyGroupId];
        }
      }

      const insertionIndex = clamp(index, 0, nextBoardGroups.length);
      nextBoardGroups.splice(insertionIndex, 0, newGroupId);
      nextGroupOrderByBoard[boardId] = nextBoardGroups;
      nextItemsByGroup[newGroupId] = [];
      nextGroupToBoard[newGroupId] = boardId;
      nextContainersById[newGroupId] = {
        id: newGroupId,
        boardId,
        role: "group",
        allowSortWithin: BOARD_CONFIGS[boardId].allowInGroupSort,
        accepts: boardRoutingById.current[boardId].acceptTokens,
      };

      return {
        groupOrderByBoard: nextGroupOrderByBoard,
        itemsByGroup: nextItemsByGroup,
        groupToBoard: nextGroupToBoard,
        containerOrderByBoard: nextGroupOrderByBoard,
        itemsByContainer: nextItemsByGroup,
        containersById: nextContainersById,
        itemsById: current.itemsById,
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
    if (event.operation.source?.type !== "set") return;
    const sourceSetId = String(event.operation.source.id);
    const sourceGroupId =
      extractGroupIdFromOperationEntity(event.operation.source) ||
      findGroupIdBySetId(state.itemsByGroup, sourceSetId) ||
      null;
    sourceGroupIdAtDragStartRef.current = sourceGroupId;
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
      }),
    );
    setHoverBoundaryByBoard({ groups: null, entries: null, source: null });
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.operation.source?.type !== "set") return;

    const sourceSetId = String(event.operation.source.id);
    const sourceItem = state.itemsById[sourceSetId] ?? null;
    const sourceGroupId =
      extractGroupIdFromOperationEntity(event.operation.source) ||
      findContainerByItemId(state, sourceSetId) ||
      "";
    const targetId = String(event.operation.target?.id ?? "");
    const targetGroupId =
      event.operation.target?.type === "group"
        ? targetId
        : extractGroupIdFromOperationEntity(event.operation.target) ||
          (targetId ? findContainerByItemId(state, targetId) || "" : "");

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
        setState((current) => stripEphemeralItems(current));
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
                    face: sourceItem.face,
                    sourceCardId,
                    persistedId: null,
                    isEphemeral: true,
                  },
                },
              };
        return moveEphemeralToContainer(withItem, ephemeralId, targetGroupId, targetIndex);
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
    setState((current) => ({
      ...current,
      itemsByGroup: moved,
      itemsByContainer: moved,
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.operation.source?.type !== "set") {
      setActiveSetId(null);
      setActiveTargetBoardId(null);
      setDragAffordanceByBoard(emptyAffordanceState());
      return;
    }

    if (event.canceled) {
      setState(stripEphemeralItems(previousState.current));
      setActiveSetId(null);
      setActiveTargetBoardId(null);
      setDragAffordanceByBoard(emptyAffordanceState());
      activeEphemeralIdRef.current = null;
      sourceGroupIdAtDragStartRef.current = null;
      return;
    }

    const sourceSetId = String(event.operation.source.id);
    const sourceItem = state.itemsById[sourceSetId] ?? null;
    const sourceGroupId =
      sourceGroupIdAtDragStartRef.current ||
      extractGroupIdFromOperationEntity(event.operation.source) ||
      findContainerByItemId(state, sourceSetId) ||
      "";
    const targetId = String(event.operation.target?.id ?? "");
    let targetGroupId =
      event.operation.target?.type === "group"
        ? targetId
        : extractGroupIdFromOperationEntity(event.operation.target) ||
          (targetId ? findContainerByItemId(state, targetId) || "" : "");

    if (sourceItem?.kind === "source-template" && activeEphemeralIdRef.current) {
      const ephContainer = findContainerByItemId(state, activeEphemeralIdRef.current);
      if (ephContainer) {
        targetGroupId = ephContainer;
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
    const postDropWithoutEphemeral = stripEphemeralItems(postDropStateBeforeNormalize);
    const postDropState = normalizeAfterDrop(postDropWithoutEphemeral);
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
    setActiveTargetBoardId(null);
    setDragAffordanceByBoard(emptyAffordanceState());
    activeEphemeralIdRef.current = null;
    sourceGroupIdAtDragStartRef.current = null;

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
            targetGroupIndex < 0 ? postDropState.groupOrderByBoard.groups.length : targetGroupIndex,
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
            targetGroupIndex < 0 ? postDropState.groupOrderByBoard.groups.length : targetGroupIndex,
        });
      }

      if (sourceBoardId === "entries" && targetBoardId === "entries") {
        const orderedEntryIds = (postDropState.itemsByGroup[targetGroupId] ?? [])
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
        activeTargetBoardId,
        dragAffordanceByBoard,
        hoverBoundaryByBoard,
        registerGroupRef,
        handleHoverBoundary,
        handleLeaveBoard,
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
    onSetClick?: (setUiId: SetId, groupUiId: GroupId) => void;
    renderSetContent?: DeckSortableBoardViewModel["renderSetContent"];
    renderTopToolbar?: DeckSortableBoardViewModel["renderTopToolbar"];
    renderBottomToolbar?: DeckSortableBoardViewModel["renderBottomToolbar"];
    isSetSelected?: DeckSortableBoardViewModel["isSetSelected"];
    emptyMessage?: string | null;
  },
): DeckSortableBoardViewModel {
  const {
    state,
    setLabelsById,
    setCardIdById,
    groupLabelsById,
    activeSetId,
    activeTargetBoardId,
    dragAffordanceByBoard,
    hoverBoundaryByBoard,
    registerGroupRef,
    handleHoverBoundary,
    handleLeaveBoard,
    createGroupAtIndex,
  } = useDeckMockDnd();

  return {
    config: BOARD_CONFIGS[boardId],
    emitToken: routing.emitToken,
    acceptTokens: routing.acceptTokens,
    groupIds: state.groupOrderByBoard[boardId],
    itemsByGroup: state.itemsByGroup,
    groupLabelsById,
    setLabelsById,
    setCardIdById,
    activeSetId,
    activeTargetBoardId,
    showDropAffordance: dragAffordanceByBoard[boardId] ?? false,
    hoverBoundaryIndex: hoverBoundaryByBoard[boardId],
    onHoverBoundary: (clientX: number) => handleHoverBoundary(boardId, clientX),
    onLeaveBoard: () => handleLeaveBoard(boardId),
    onCreateGroupAtIndex: (index: number) => createGroupAtIndex(boardId, index),
    registerGroupRef,
    onSetClick: options?.onSetClick,
    renderTopToolbar: options?.renderTopToolbar,
    renderBottomToolbar: options?.renderBottomToolbar,
    isSetSelected: options?.isSetSelected,
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
};

type SourceAdapterInput = {
  cards: Array<{ id: string; name: string }>;
  sourceFaceMode: SourceItemFace;
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

  return {
    boardId: "entries",
    groupIds: [groupId],
    itemsByGroup: { [groupId]: itemIds },
    groupLabelsById: { [groupId]: "Entries" },
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
    groupLabelsById: { [groupId]: "Cards" },
    setLabelsById,
    setCardIdById,
    sourceItemFaceBySetId,
    emitToken: "source",
    acceptTokens: [],
  };
}
