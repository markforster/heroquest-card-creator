"use client";

import {
  DragDropProvider,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { useSortable } from "@dnd-kit/react/sortable";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/api/client";
import { useDeckDetailSelection } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import { useDeckSetEntries } from "@/components/Decks/detail/context/DeckSetEntriesContext";


import styles from "./DeckGroupsSection2.module.css";

export type BoardId = "groups" | "entries" | "source";
type GroupId = string;
type SetId = string;
type LayoutMode = "content" | "fill-parent";
type DragRouteToken = string;

type BoardConfig = {
  boardId: BoardId;
  title: string;
  allowMultipleGroups: boolean;
  allowGroupCreate: boolean;
  allowInGroupSort: boolean;
  allowDropTarget: boolean;
};

type DnDState = {
  groupOrderByBoard: Record<BoardId, GroupId[]>;
  itemsByGroup: Record<GroupId, SetId[]>;
  groupToBoard: Record<GroupId, BoardId>;
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
  backFaceId: string;
  targetIndex: number;
};

type DeckDnDEvent =
  | GroupsReorderSetsEvent
  | GroupsDropSetToNewGroupEvent
  | GroupsDropSourceCardToGroupEvent
  | GroupsDropSourceCardToNewGroupEvent
  | EntriesReorderEvent
  | EntriesDropSourceToEntriesEvent;

type DeckDnDEventResult = {
  handled: boolean;
  success: boolean;
  fatal?: boolean;
  reason?: string;
};

type DeckDropHandler = (event: DeckDnDEvent) => Promise<DeckDnDEventResult | null>;

export type BoardSeedModel = {
  boardId: BoardId;
  groupIds: GroupId[];
  itemsByGroup: Record<GroupId, SetId[]>;
  groupLabelsById: Record<GroupId, string>;
  setLabelsById: Record<SetId, string>;
  emitToken: DragRouteToken;
  acceptTokens: DragRouteToken[];
};

type DeckMockDndContextValue = {
  state: DnDState;
  setLabelsById: Record<SetId, string>;
  groupLabelsById: Record<GroupId, string>;
  activeSetId: SetId | null;
  hoverBoundaryByBoard: Record<BoardId, number | null>;
  registerGroupRef: (groupId: GroupId, node: HTMLElement | null) => void;
  handleHoverBoundary: (boardId: BoardId, clientX: number) => void;
  handleLeaveBoard: (boardId: BoardId) => void;
  createGroupAtIndex: (boardId: BoardId, index: number) => void;
  registerDropHandler: (controllerId: string, handler: DeckDropHandler) => () => void;
};

type DeckSortableBoardViewModel = {
  config: BoardConfig;
  emitToken: DragRouteToken;
  acceptTokens: DragRouteToken[];
  groupIds: GroupId[];
  itemsByGroup: Record<GroupId, SetId[]>;
  groupLabelsById: Record<GroupId, string>;
  setLabelsById: Record<SetId, string>;
  activeSetId: SetId | null;
  hoverBoundaryIndex: number | null;
  onHoverBoundary: (clientX: number) => void;
  onLeaveBoard: () => void;
  onCreateGroupAtIndex: (index: number) => void;
  registerGroupRef: (groupId: GroupId, node: HTMLElement | null) => void;
  onSetClick?: (setUiId: SetId, groupUiId: GroupId) => void;
  emptyMessage?: string | null;
};

type BoardRoutingMeta = {
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

const BOARD_ROUTING_META_BY_ID: Record<BoardId, BoardRoutingMeta> = {
  groups: { emitToken: "set", acceptTokens: ["source"] },
  entries: { emitToken: "entry", acceptTokens: ["source"] },
  source: { emitToken: "source", acceptTokens: [] },
};

const DEFAULT_BOARD_SEEDS: Record<BoardId, BoardSeedModel> = {
  groups: {
    boardId: "groups",
    groupIds: ["groups:A", "groups:B", "groups:C"],
    itemsByGroup: {
      "groups:A": ["g-A1", "g-A2", "g-A3"],
      "groups:B": ["g-B1", "g-B2"],
      "groups:C": ["g-C1"],
    },
    groupLabelsById: { "groups:A": "A", "groups:B": "B", "groups:C": "C" },
    setLabelsById: {
      "g-A1": "A1",
      "g-A2": "A2",
      "g-A3": "A3",
      "g-B1": "B1",
      "g-B2": "B2",
      "g-C1": "C1",
    },
    emitToken: "set",
    acceptTokens: ["source"],
  },
  entries: {
    boardId: "entries",
    groupIds: ["entries:E1"],
    itemsByGroup: {
      "entries:E1": ["e-1", "e-2", "e-3", "e-4", "e-5", "e-6", "e-7", "e-8", "e-9", "e-10"],
    },
    groupLabelsById: { "entries:E1": "Entries" },
    setLabelsById: {
      "e-1": "E-1",
      "e-2": "E-2",
      "e-3": "E-3",
      "e-4": "E-4",
      "e-5": "E-5",
      "e-6": "E-6",
      "e-7": "E-7",
      "e-8": "E-8",
      "e-9": "E-9",
      "e-10": "E-10",
    },
    emitToken: "entry",
    acceptTokens: ["source"],
  },
  source: {
    boardId: "source",
    groupIds: ["source:S1"],
    itemsByGroup: {
      "source:S1": ["src-1", "src-2", "src-3", "src-4"],
    },
    groupLabelsById: { "source:S1": "Source" },
    setLabelsById: {
      "src-1": "SRC-1",
      "src-2": "SRC-2",
      "src-3": "SRC-3",
      "src-4": "SRC-4",
    },
    emitToken: "source",
    acceptTokens: [],
  },
};

const DeckMockDndContext = createContext<DeckMockDndContextValue | null>(null);

function useDeckMockDnd() {
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

function isPendingSetId(setId: SetId): boolean {
  return setId.startsWith("pending:source:");
}

function clearPendingPlaceholder(itemsByGroup: Record<GroupId, SetId[]>): Record<GroupId, SetId[]> {
  const next: Record<GroupId, SetId[]> = {};
  Object.keys(itemsByGroup).forEach((groupId) => {
    next[groupId] = (itemsByGroup[groupId] ?? []).filter((id) => !isPendingSetId(id));
  });
  return next;
}

function insertPendingPlaceholder(
  itemsByGroup: Record<GroupId, SetId[]>,
  targetGroupId: GroupId,
  targetIndex: number,
  pendingId: SetId,
): Record<GroupId, SetId[]> {
  const cleared = clearPendingPlaceholder(itemsByGroup);
  const targetItems = (cleared[targetGroupId] ?? []).slice();
  const index = clamp(targetIndex, 0, targetItems.length);
  targetItems.splice(index, 0, pendingId);
  return {
    ...cleared,
    [targetGroupId]: targetItems,
  };
}

function createDnDStateFromSeeds(boardSeeds: Record<BoardId, BoardSeedModel>): DnDState {
  const groupOrderByBoard: Record<BoardId, GroupId[]> = {
    groups: boardSeeds.groups.groupIds.slice(),
    entries: boardSeeds.entries.groupIds.slice(),
    source: boardSeeds.source.groupIds.slice(),
  };
  const itemsByGroup: Record<GroupId, SetId[]> = {};
  const groupToBoard: Record<GroupId, BoardId> = {};

  (Object.keys(boardSeeds) as BoardId[]).forEach((boardId) => {
    const seed = boardSeeds[boardId];
    seed.groupIds.forEach((groupId) => {
      itemsByGroup[groupId] = (seed.itemsByGroup[groupId] ?? []).slice();
      groupToBoard[groupId] = boardId;
    });
  });

  return { groupOrderByBoard, itemsByGroup, groupToBoard };
}

function collectLabels(boardSeeds: Record<BoardId, BoardSeedModel>) {
  const groupLabelsById: Record<GroupId, string> = {};
  const setLabelsById: Record<SetId, string> = {};

  (Object.keys(boardSeeds) as BoardId[]).forEach((boardId) => {
    Object.assign(groupLabelsById, boardSeeds[boardId].groupLabelsById);
    Object.assign(setLabelsById, boardSeeds[boardId].setLabelsById);
  });

  return { groupLabelsById, setLabelsById };
}

function canMove(_sourceGroupId: GroupId, _targetGroupId: GroupId, _setId: SetId): boolean {
  return true;
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
}): boolean {
  if (!sourceBoardId || !sourceGroupId || !targetBoardId || !targetGroupId) return false;
  if (sameGroup) return sourceAllowInGroupSort;
  if (sourceBoardId === targetBoardId) {
    return sourceAllowInGroupSort && targetAllowDropTarget;
  }
  if (!targetAllowDropTarget) return false;
  if (!sourceEmitToken) return false;
  if (!targetAcceptTokens) return false;
  return targetAcceptTokens.includes(sourceEmitToken);
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

  (Object.keys(current.groupOrderByBoard) as BoardId[]).forEach((boardId) => {
    const config = BOARD_CONFIGS[boardId];
    current.groupOrderByBoard[boardId].forEach((groupId) => {
      const sets = current.itemsByGroup[groupId] ?? [];
      const keepEmpty = !config.allowMultipleGroups;
      if (sets.length > 0 || keepEmpty) {
        nextGroupOrderByBoard[boardId].push(groupId);
        nextGroupToBoard[groupId] = boardId;
        nextItemsByGroup[groupId] = sets;
      }
    });
  });

  return {
    groupOrderByBoard: nextGroupOrderByBoard,
    itemsByGroup: nextItemsByGroup,
    groupToBoard: nextGroupToBoard,
  };
}

function GroupColumn({
  groupId,
  label,
  children,
  fillParent,
  canReceiveDrops,
}: {
  groupId: GroupId;
  label?: string;
  children: React.ReactNode;
  fillParent: boolean;
  canReceiveDrops: boolean;
}) {
  const { ref } = useDroppable({
    id: groupId,
    type: "group",
    accept: canReceiveDrops ? ["set"] : [],
  });

  return (
    <section
      className={[styles.group, fillParent ? styles.groupFillParent : ""].filter(Boolean).join(" ")}
      ref={ref}
      data-testid={`group-${groupId}`}
    >
      <header className={styles.groupHeader}>
        <span>{label ?? parseGroupLabel(groupId)}</span>
        <span className={styles.grip} aria-hidden="true">
          ⠿
        </span>
      </header>
      <div
        className={[styles.groupBody, fillParent ? styles.groupBodyFillParent : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </section>
  );
}

function SortableSetCard({
  setId,
  label,
  index,
  groupId,
  onClick,
}: {
  setId: SetId;
  label?: string;
  index: number;
  groupId: GroupId;
  onClick?: () => void;
}) {
  const { ref, isDragging, isDragSource, isDropTarget } = useSortable({
    id: setId,
    index,
    type: "set",
    accept: ["set"],
    group: groupId,
  });

  const accentClass = groupId.startsWith("groups:A")
    ? styles.setAccentA
    : groupId.startsWith("groups:B")
      ? styles.setAccentB
      : styles.setAccentC;

  return (
    <div className={styles.setShell} ref={ref} data-testid={`set-${setId}`}>
      <div
        className={[
          styles.setCard,
          accentClass,
          isDragging ? styles.setCardDragging : "",
          isDragSource ? styles.setCardGhost : "",
          isDropTarget ? styles.setCardDropTarget : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onClick}
      >
        <span>{label ?? parseSetLabel(setId)}</span>
        <span className={styles.grip} aria-hidden="true">
          ⠿
        </span>
      </div>
    </div>
  );
}

function DraggableSetCard({
  setId,
  label,
  groupId,
  onClick,
}: {
  setId: SetId;
  label?: string;
  groupId: GroupId;
  onClick?: () => void;
}) {
  const { ref, handleRef, isDragging } = useDraggable({
    id: setId,
    type: "set",
    data: { group: groupId },
  });

  const accentClass = groupId.startsWith("groups:A")
    ? styles.setAccentA
    : groupId.startsWith("groups:B")
      ? styles.setAccentB
      : styles.setAccentC;

  return (
    <div className={styles.setShell} ref={ref} data-testid={`set-${setId}`}>
      <div
        className={[
          styles.setCard,
          accentClass,
          isDragging ? styles.setCardDragging : "",
          isDragging ? styles.setCardGhost : "",
        ]
          .filter(Boolean)
          .join(" ")}
        ref={handleRef}
        onClick={onClick}
      >
        <span>{label ?? parseSetLabel(setId)}</span>
        <span className={styles.grip} aria-hidden="true">
          ⠿
        </span>
      </div>
    </div>
  );
}

function PendingSetCard({ label }: { label: string }) {
  return (
    <div className={styles.setShell} aria-hidden="true">
      <div className={[styles.setCard, styles.pendingSetCard].join(" ")}>
        <span>{label}</span>
        <span className={styles.grip} aria-hidden="true">
          ⠿
        </span>
      </div>
    </div>
  );
}

function OverlayCard({ setId, label }: { setId: SetId; label?: string }) {
  return (
    <div className={styles.overlay}>
      <div className={[styles.setCard, styles.setCardDragging].join(" ")}>
        <span>{label ?? parseSetLabel(setId)}</span>
        <span className={styles.grip} aria-hidden="true">
          ⠿
        </span>
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

function DeckSortableBoardView({
  model,
  layoutMode = "content",
}: {
  model: DeckSortableBoardViewModel;
  layoutMode?: LayoutMode;
}) {
  const {
    config,
    groupIds,
    itemsByGroup,
    activeSetId,
    hoverBoundaryIndex,
  } = model;
  const useFillParent = layoutMode === "fill-parent" && !config.allowMultipleGroups;
  const blockedBoundaries = useMemo(
    () => getBlockedBoundaries(groupIds, itemsByGroup),
    [groupIds, itemsByGroup],
  );

  return (
    <section
      className={[styles.board, useFillParent ? styles.boardFillParent : ""]
        .filter(Boolean)
        .join(" ")}
      data-testid={`board-${config.boardId}`}
    >
      <header className={styles.boardHeader}>{config.title}</header>
      <div
        className={[styles.groupsRow, useFillParent ? styles.groupsRowFillParent : ""]
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
              <CreateBoundaryPlaceholder
                index={index}
                onCreate={model.onCreateGroupAtIndex}
              />
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
              >
                {(() => {
                  const groupSetIds = itemsByGroup[groupId] ?? [];

                  return groupSetIds.map((setId, setIndex) => (
                    <div key={setId}>
                      {isPendingSetId(setId) ? (
                        <PendingSetCard
                          label={activeSetId ? model.setLabelsById[activeSetId] ?? parseSetLabel(activeSetId) : ""}
                        />
                      ) : null}
                      {!isPendingSetId(setId) && config.allowInGroupSort ? (
                        <SortableSetCard
                          setId={setId}
                          label={model.setLabelsById[setId]}
                          index={setIndex}
                          groupId={groupId}
                          onClick={() => {
                            if (model.activeSetId) return;
                            model.onSetClick?.(setId, groupId);
                          }}
                        />
                      ) : null}
                      {!isPendingSetId(setId) && !config.allowInGroupSort ? (
                        <DraggableSetCard
                          setId={setId}
                          label={model.setLabelsById[setId]}
                          groupId={groupId}
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
  boardSeeds,
}: {
  children: React.ReactNode;
  boardSeeds?: Record<BoardId, BoardSeedModel>;
}) {
  const resolvedBoardSeeds = boardSeeds ?? DEFAULT_BOARD_SEEDS;
  const initialState = useMemo(() => createDnDStateFromSeeds(resolvedBoardSeeds), [resolvedBoardSeeds]);
  const initialLabels = useMemo(() => collectLabels(resolvedBoardSeeds), [resolvedBoardSeeds]);
  const [state, setState] = useState<DnDState>(initialState);
  const [groupLabelsById, setGroupLabelsById] = useState<Record<GroupId, string>>(
    initialLabels.groupLabelsById,
  );
  const [setLabelsById, setSetLabelsById] = useState<Record<SetId, string>>(initialLabels.setLabelsById);
  const [activeSetId, setActiveSetId] = useState<SetId | null>(null);
  const [hoverBoundaryByBoard, setHoverBoundaryByBoard] = useState<Record<BoardId, number | null>>({
    groups: null,
    entries: null,
    source: null,
  });
  const [ephemeralEmptyGroupId, setEphemeralEmptyGroupId] = useState<GroupId | null>(null);
  const boardRoutingById = useRef<Record<BoardId, BoardRoutingMeta>>({
    groups: {
      emitToken: resolvedBoardSeeds.groups.emitToken,
      acceptTokens: resolvedBoardSeeds.groups.acceptTokens,
    },
    entries: {
      emitToken: resolvedBoardSeeds.entries.emitToken,
      acceptTokens: resolvedBoardSeeds.entries.acceptTokens,
    },
    source: {
      emitToken: resolvedBoardSeeds.source.emitToken,
      acceptTokens: resolvedBoardSeeds.source.acceptTokens,
    },
  });

  const previousState = useRef<DnDState>(initialState);
  const sourceGroupIdAtDragStartRef = useRef<GroupId | null>(null);
  const nextGroupIdRef = useRef<number>(1);
  const groupRefs = useRef<Map<GroupId, HTMLElement>>(new Map());
  const handlersRef = useRef<Map<string, DeckDropHandler>>(new Map());
  const lastPublishedDragIdRef = useRef<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    boardRoutingById.current = {
      groups: {
        emitToken: resolvedBoardSeeds.groups.emitToken,
        acceptTokens: resolvedBoardSeeds.groups.acceptTokens,
      },
      entries: {
        emitToken: resolvedBoardSeeds.entries.emitToken,
        acceptTokens: resolvedBoardSeeds.entries.acceptTokens,
      },
      source: {
        emitToken: resolvedBoardSeeds.source.emitToken,
        acceptTokens: resolvedBoardSeeds.source.acceptTokens,
      },
    };
    setGroupLabelsById(initialLabels.groupLabelsById);
    setSetLabelsById(initialLabels.setLabelsById);
    if (activeSetId) return;
    setState(initialState);
    previousState.current = initialState;
  }, [activeSetId, resolvedBoardSeeds, initialLabels.groupLabelsById, initialLabels.setLabelsById, initialState]);

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

      if (ephemeralEmptyGroupId && (nextItemsByGroup[ephemeralEmptyGroupId]?.length ?? 0) === 0) {
        const previousBoard = nextGroupToBoard[ephemeralEmptyGroupId];
        if (previousBoard) {
          nextGroupOrderByBoard[previousBoard] = nextGroupOrderByBoard[previousBoard].filter(
            (groupId) => groupId !== ephemeralEmptyGroupId,
          );
          delete nextItemsByGroup[ephemeralEmptyGroupId];
          delete nextGroupToBoard[ephemeralEmptyGroupId];
        }
      }

      const insertionIndex = clamp(index, 0, nextBoardGroups.length);
      nextBoardGroups.splice(insertionIndex, 0, newGroupId);
      nextGroupOrderByBoard[boardId] = nextBoardGroups;
      nextItemsByGroup[newGroupId] = [];
      nextGroupToBoard[newGroupId] = boardId;

      return {
        groupOrderByBoard: nextGroupOrderByBoard,
        itemsByGroup: nextItemsByGroup,
        groupToBoard: nextGroupToBoard,
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
    sourceGroupIdAtDragStartRef.current =
      extractGroupIdFromOperationEntity(event.operation.source) ||
      findGroupIdBySetId(state.itemsByGroup, sourceSetId) ||
      null;
    previousState.current = state;
    setActiveSetId(String(event.operation.source.id));
    setHoverBoundaryByBoard({ groups: null, entries: null, source: null });
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.operation.source?.type !== "set") return;

    const sourceSetId = String(event.operation.source.id);
    const sourceGroupId =
      extractGroupIdFromOperationEntity(event.operation.source) ||
      findGroupIdBySetId(state.itemsByGroup, sourceSetId) ||
      "";
    const targetId = String(event.operation.target?.id ?? "");
    const targetGroupId =
      event.operation.target?.type === "group"
        ? targetId
        : extractGroupIdFromOperationEntity(event.operation.target) ||
          (targetId ? findGroupIdBySetId(state.itemsByGroup, targetId) || "" : "");

    if (!sourceGroupId || !targetGroupId) return;
    const sourceBoardId = state.groupToBoard[sourceGroupId] ?? null;
    const targetBoardId = state.groupToBoard[targetGroupId] ?? null;
    const sourceBoardConfig = sourceBoardId ? BOARD_CONFIGS[sourceBoardId] : null;
    const targetBoardConfig = targetBoardId ? BOARD_CONFIGS[targetBoardId] : null;
    const sourceRouting = sourceBoardId ? boardRoutingById.current[sourceBoardId] : null;
    const targetRouting = targetBoardId ? boardRoutingById.current[targetBoardId] : null;
    const canRoute = canRouteDrag({
      sourceBoardId,
      sourceGroupId,
      targetBoardId,
      targetGroupId,
      sameGroup: sourceGroupId === targetGroupId,
      sourceAllowInGroupSort: sourceBoardConfig?.allowInGroupSort ?? false,
      targetAllowDropTarget: targetBoardConfig?.allowDropTarget ?? false,
      sourceEmitToken: sourceRouting?.emitToken ?? null,
      targetAcceptTokens: targetRouting?.acceptTokens ?? null,
    });
    if (!canRoute) {
      event.preventDefault?.();
      return;
    }
    if (!canMove(sourceGroupId, targetGroupId, sourceSetId)) {
      event.preventDefault?.();
      return;
    }

    // Source items are templates for persisted create operations.
    // Show a single in-flow pending placeholder for source -> groups.
    if (sourceBoardId === "source") {
      if (targetBoardId === "groups") {
        const pendingId = `pending:source:${sourceSetId.replace(/^source:/, "")}`;
        const targetItems = (state.itemsByGroup[targetGroupId] ?? []).filter((id) => !isPendingSetId(id));
        const targetIndex =
          event.operation.target?.type === "group"
            ? targetItems.length
            : Math.max(0, targetItems.indexOf(targetId));
        setState((current) => ({
          ...current,
          itemsByGroup: insertPendingPlaceholder(current.itemsByGroup, targetGroupId, targetIndex, pendingId),
        }));
        return;
      }
      setState((current) => ({
        ...current,
        itemsByGroup: clearPendingPlaceholder(current.itemsByGroup),
      }));
      return;
    }

    setState((current) => ({
      ...current,
      itemsByGroup: move(current.itemsByGroup, event) as Record<GroupId, SetId[]>,
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.operation.source?.type !== "set") {
      setActiveSetId(null);
      return;
    }

    if (event.canceled) {
      setState({
        ...previousState.current,
        itemsByGroup: clearPendingPlaceholder(previousState.current.itemsByGroup),
      });
      setActiveSetId(null);
      sourceGroupIdAtDragStartRef.current = null;
      return;
    }

    const sourceSetId = String(event.operation.source.id);
    const sourceGroupId =
      sourceGroupIdAtDragStartRef.current ||
      extractGroupIdFromOperationEntity(event.operation.source) ||
      findGroupIdBySetId(state.itemsByGroup, sourceSetId) ||
      "";
    const targetId = String(event.operation.target?.id ?? "");
    const targetGroupId =
      event.operation.target?.type === "group"
        ? targetId
        : extractGroupIdFromOperationEntity(event.operation.target) ||
          (targetId ? findGroupIdBySetId(state.itemsByGroup, targetId) || "" : "");

    const sourceBoardIdAtDrop = sourceGroupId ? state.groupToBoard[sourceGroupId] ?? null : null;
    const targetBoardIdAtDrop = targetGroupId ? state.groupToBoard[targetGroupId] ?? null : null;
    const canApplyMoveAtDrop =
      sourceBoardIdAtDrop !== "source" &&
      Boolean(sourceGroupId) &&
      Boolean(targetGroupId) &&
      (sourceBoardIdAtDrop === targetBoardIdAtDrop || targetBoardIdAtDrop !== null);
    const movedItemsByGroup = canApplyMoveAtDrop
      ? (move(state.itemsByGroup, event) as Record<GroupId, SetId[]>)
      : state.itemsByGroup;

    const postDropWithoutPending: DnDState = {
      ...state,
      itemsByGroup: clearPendingPlaceholder(movedItemsByGroup),
    };
    const postDropState = normalizeAfterDrop(postDropWithoutPending);
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
    sourceGroupIdAtDragStartRef.current = null;

    const normalizedSetId = sourceSetId.startsWith("set:") ? sourceSetId.slice(4) : "";
    const normalizedSourceGroupId = sourceGroupId.startsWith("group:") ? sourceGroupId.slice(6) : "";
    const normalizedTargetGroupId = targetGroupId.startsWith("group:") ? targetGroupId.slice(6) : "";
    const isTempTargetGroup = targetGroupId.startsWith("groups:N");
    const sourceBoardId = sourceGroupId ? postDropState.groupToBoard[sourceGroupId] ?? null : null;
    const targetBoardId = targetGroupId ? postDropState.groupToBoard[targetGroupId] ?? null : null;
    const targetGroupIndex = postDropState.groupOrderByBoard.groups.findIndex((groupId) => groupId === targetGroupId);
    const normalizedTargetSetIds = (postDropState.itemsByGroup[targetGroupId] ?? [])
      .filter((id) => id.startsWith("set:"))
      .map((id) => id.slice(4));
    const normalizedSourceSetIds = (postDropState.itemsByGroup[sourceGroupId] ?? [])
      .filter((id) => id.startsWith("set:"))
      .map((id) => id.slice(4));

    const dragId = `drag:${Date.now()}:${sourceSetId}`;
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
            normalizedSourceGroupId !== normalizedTargetGroupId && normalizedSourceSetIds.length === 0,
        });
      }

      const normalizedBackFaceId = sourceSetId.startsWith("source:") ? sourceSetId.slice(7) : "";
      if (
        normalizedBackFaceId &&
        sourceBoardId === "source" &&
        targetBoardId === "groups" &&
        normalizedTargetGroupId &&
        !isTempTargetGroup
      ) {
        const targetItemsWithoutPending = (postDropWithoutPending.itemsByGroup[targetGroupId] ?? []).filter(
          (id) => !isPendingSetId(id),
        );
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

      if (normalizedBackFaceId && sourceBoardId === "source" && targetBoardId === "entries") {
        const targetItems = state.itemsByGroup[targetGroupId] ?? [];
        const fallbackIndex = targetItems.length;
        const targetIndex =
          event.operation.target?.type === "group"
            ? fallbackIndex
            : Math.max(0, targetItems.indexOf(targetId));
        events.push({
          kind: "ENTRIES_DROP_SOURCE_TO_ENTRIES",
          ...eventBase,
          backFaceId: normalizedBackFaceId,
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
        groupLabelsById,
        activeSetId,
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
                  <OverlayCard setId={activeSetId} label={setLabelsById[activeSetId]} />
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </DragDropProvider>
    </DeckMockDndContext.Provider>
  );
}

function useDeckSortableBoardViewModel(
  boardId: BoardId,
  routing: BoardRoutingMeta,
  options?: {
    onSetClick?: (setUiId: SetId, groupUiId: GroupId) => void;
    emptyMessage?: string | null;
  },
): DeckSortableBoardViewModel {
  const {
    state,
    setLabelsById,
    groupLabelsById,
    activeSetId,
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
    activeSetId,
    hoverBoundaryIndex: hoverBoundaryByBoard[boardId],
    onHoverBoundary: (clientX: number) => handleHoverBoundary(boardId, clientX),
    onLeaveBoard: () => handleLeaveBoard(boardId),
    onCreateGroupAtIndex: (index: number) => createGroupAtIndex(boardId, index),
    registerGroupRef,
    onSetClick: options?.onSetClick,
    emptyMessage: options?.emptyMessage ?? null,
  };
}

type GroupsAdapterInput = {
  orderedGroups: Array<{ id: string; title: string }>;
  sets: Array<{ id: string; groupId: string; sortIndex: number; title: string; backFaceId: string }>;
  cardNameById: Map<string, string>;
};

type EntriesAdapterInput = {
  entriesSorted: Array<{ id: string; sortIndex: number }>;
  entryFrontIdByEntryId: Map<string, string>;
};

type SourceAdapterInput = {
  cards: Array<{ id: string; name: string }>;
};

export function toGroupsBoardModel(input: GroupsAdapterInput): BoardSeedModel {
  const groupIds = input.orderedGroups.map((group) => `group:${group.id}`);
  const groupLabelsById: Record<GroupId, string> = {};
  const itemsByGroup: Record<GroupId, SetId[]> = {};
  const setLabelsById: Record<SetId, string> = {};

  input.orderedGroups.forEach((group) => {
    const gid = `group:${group.id}`;
    groupLabelsById[gid] = group.id;
    itemsByGroup[gid] = input.sets
      .filter((set) => set.groupId === group.id)
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map((set) => {
        const sid = `set:${set.id}`;
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
    emitToken: "set",
    acceptTokens: ["source"],
  };
}

export function toEntriesBoardModel(input: EntriesAdapterInput): BoardSeedModel {
  const groupId = "entries:lane";
  const setLabelsById: Record<SetId, string> = {};
  const itemIds = input.entriesSorted.map((entry, index) => {
    const sid = `entry:${entry.id}`;
    const frontId = input.entryFrontIdByEntryId.get(entry.id);
    setLabelsById[sid] = frontId ? `Entry ${index + 1} (${frontId.slice(0, 8)})` : `Entry ${index + 1}`;
    return sid;
  });

  return {
    boardId: "entries",
    groupIds: [groupId],
    itemsByGroup: { [groupId]: itemIds },
    groupLabelsById: { [groupId]: "Entries" },
    setLabelsById,
    emitToken: "entry",
    acceptTokens: ["source"],
  };
}

export function toSourceBoardModel(input: SourceAdapterInput): BoardSeedModel {
  const groupId = "source:lane";
  const setLabelsById: Record<SetId, string> = {};
  const itemIds = input.cards.map((card) => {
    const sid = `source:${card.id}`;
    setLabelsById[sid] = card.name?.trim() || card.id;
    return sid;
  });

  return {
    boardId: "source",
    groupIds: [groupId],
    itemsByGroup: { [groupId]: itemIds },
    groupLabelsById: { [groupId]: "Cards" },
    setLabelsById,
    emitToken: "source",
    acceptTokens: [],
  };
}

async function deleteGroupIfEmpty(groupId: string, isEmpty: boolean): Promise<void> {
  if (!isEmpty || !groupId) return;
  try {
    await apiClient.deleteDeckGroup(undefined, { params: { groupId } });
  } catch {
    // Non-fatal; reload will re-sync.
  }
}

export default function DeckGroupsBoardController({ deckId }: { deckId: string | null }) {
  let selection: ReturnType<typeof useDeckDetailSelection> | null = null;
  try {
    selection = useDeckDetailSelection();
  } catch {
    selection = null;
  }
  const { registerDropHandler } = useDeckMockDnd();
  const model = useDeckSortableBoardViewModel("groups", BOARD_ROUTING_META_BY_ID.groups, {
    onSetClick: (setUiId, groupUiId) => {
      if (!selection) return;
      if (!setUiId.startsWith("set:")) return;
      if (!groupUiId.startsWith("group:")) return;
      const setId = setUiId.slice(4);
      const groupId = groupUiId.slice(6);
      const setRecord = selection.setById.get(setId);
      if (!setRecord) return;
      selection.selectGroup(groupId);
      selection.selectSet(setRecord);
    },
  });

  useEffect(() => {
    if (!selection) return () => undefined;
    return registerDropHandler("groups-controller", async (event) => {
      if (event.kind === "GROUPS_REORDER_SETS") {
        const isCrossGroup = event.sourceGroupId !== event.targetGroupId;
        if (isCrossGroup) {
          await apiClient.updateDeckSet(
            { groupId: event.targetGroupId },
            { params: { setId: event.setId } },
          );
        }
        if (event.orderedTargetSetIds.length > 0) {
          await apiClient.reorderDeckSets(
            { orderedSetIds: event.orderedTargetSetIds },
            { params: { setId: event.orderedTargetSetIds[0] } },
          );
        }
        if (isCrossGroup && event.orderedSourceSetIds.length > 0) {
          await apiClient.reorderDeckSets(
            { orderedSetIds: event.orderedSourceSetIds },
            { params: { setId: event.orderedSourceSetIds[0] } },
          );
        }
        await deleteGroupIfEmpty(event.sourceGroupId, event.sourceGroupEmptyAfterDrop);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SET_TO_NEW_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const createdGroup = await apiClient.createDeckGroup(
          { title: "New Group" },
          { params: { deckId } },
        );
        const orderedGroupIds = selection.orderedGroups.map((group) => group.id);
        const insertionIndex = Math.max(0, Math.min(event.targetGroupIndex, orderedGroupIds.length));
        const nextGroupOrder = orderedGroupIds.slice();
        nextGroupOrder.splice(insertionIndex, 0, createdGroup.id);
        await apiClient.reorderDeckGroups({ orderedGroupIds: nextGroupOrder }, { params: { deckId } });
        await apiClient.updateDeckSet({ groupId: createdGroup.id }, { params: { setId: event.setId } });
        await apiClient.reorderDeckSets({ orderedSetIds: [event.setId] }, { params: { setId: event.setId } });
        if (event.orderedSourceSetIds.length > 0) {
          await apiClient.reorderDeckSets(
            { orderedSetIds: event.orderedSourceSetIds },
            { params: { setId: event.orderedSourceSetIds[0] } },
          );
        }
        await deleteGroupIfEmpty(event.sourceGroupId, event.sourceGroupEmptyAfterDrop);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SOURCE_CARD_TO_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const created = await apiClient.createDeckSet({
          deckId,
          groupId: event.targetGroupId,
          backFaceId: event.backFaceId,
          title: "New Set",
          description: null,
        });
        const orderedTargetSetIds = selection.sets
          .filter((set) => set.groupId === event.targetGroupId)
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((set) => set.id);
        const clampedIndex = Math.max(0, Math.min(event.targetIndex, orderedTargetSetIds.length));
        const nextOrdered = orderedTargetSetIds.slice();
        nextOrdered.splice(clampedIndex, 0, created.id);
        await apiClient.reorderDeckSets({ orderedSetIds: nextOrdered }, { params: { setId: created.id } });
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SOURCE_CARD_TO_NEW_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const createdGroup = await apiClient.createDeckGroup(
          { title: "New Group" },
          { params: { deckId } },
        );
        const orderedGroupIds = selection.orderedGroups.map((group) => group.id);
        const insertionIndex = Math.max(0, Math.min(event.targetGroupIndex, orderedGroupIds.length));
        const nextGroupOrder = orderedGroupIds.slice();
        nextGroupOrder.splice(insertionIndex, 0, createdGroup.id);
        await apiClient.reorderDeckGroups({ orderedGroupIds: nextGroupOrder }, { params: { deckId } });
        const createdSet = await apiClient.createDeckSet({
          deckId,
          groupId: createdGroup.id,
          backFaceId: event.backFaceId,
          title: "New Set",
          description: null,
        });
        await apiClient.reorderDeckSets({ orderedSetIds: [createdSet.id] }, { params: { setId: createdSet.id } });
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      return null;
    });
  }, [deckId, registerDropHandler, selection]);

  return <DeckSortableBoardView model={model} layoutMode="content" />;
}

export function DeckEntriesBoardController({
  layoutMode = "fill-parent",
}: {
  layoutMode?: LayoutMode;
}) {
  let selection: ReturnType<typeof useDeckDetailSelection> | null = null;
  try {
    selection = useDeckDetailSelection();
  } catch {
    selection = null;
  }
  let entries: ReturnType<typeof useDeckSetEntries> | null = null;
  try {
    entries = useDeckSetEntries();
  } catch {
    entries = null;
  }
  const { registerDropHandler } = useDeckMockDnd();
  const lastHandledDragIdRef = useRef<string | null>(null);
  const model = useDeckSortableBoardViewModel("entries", BOARD_ROUTING_META_BY_ID.entries, {
    emptyMessage: selection?.selectedSetId ? null : "Select a set to view entries.",
  });

  useEffect(() => {
    if (!entries) return () => undefined;
    return registerDropHandler("entries-controller", async (event) => {
      if (event.kind === "ENTRIES_REORDER") {
        if (!entries.setId) {
          return { handled: true, success: true };
        }
        if (lastHandledDragIdRef.current === event.dragId) {
          return { handled: true, success: true };
        }

        const orderedEntryIds = (event.orderedEntryIds ?? [])
          .map((id) => id.replace(/^entry:/, ""))
          .filter(Boolean);
        if (orderedEntryIds.length === 0) {
          return { handled: true, success: true };
        }

        try {
          if (typeof entries.reorderEntriesOptimistic === "function") {
            await entries.reorderEntriesOptimistic(orderedEntryIds);
          } else {
            await entries.reorderEntries(orderedEntryIds);
          }
          lastHandledDragIdRef.current = event.dragId;
          return { handled: true, success: true };
        } catch (error) {
          return {
            handled: true,
            success: false,
            fatal: true,
            reason: error instanceof Error ? error.message : "entries reorder failed",
          };
        }
      }
      if (event.kind === "ENTRIES_DROP_SOURCE_TO_ENTRIES") {
        // Source currently emits back-face ids. Entry insertion persistence is deferred until
        // source token provides front-face compatible ids.
        return { handled: true, success: true };
      }
      return null;
    });
  }, [entries, registerDropHandler]);

  return <DeckSortableBoardView model={model} layoutMode={layoutMode} />;
}

export function DeckSourceBoardController({ layoutMode = "fill-parent" }: { layoutMode?: LayoutMode }) {
  const { registerDropHandler } = useDeckMockDnd();
  const model = useDeckSortableBoardViewModel("source", BOARD_ROUTING_META_BY_ID.source);
  useEffect(() => registerDropHandler("source-controller", async () => null), [registerDropHandler]);
  return <DeckSortableBoardView model={model} layoutMode={layoutMode} />;
}

export const DeckGroupsBoardMock = DeckGroupsBoardController;
export const DeckEntriesBoardMock = DeckEntriesBoardController;
export const DeckSourceBoardMock = DeckSourceBoardController;
