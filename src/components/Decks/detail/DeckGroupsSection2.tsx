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
import { createContext, useContext, useMemo, useRef, useState } from "react";

import styles from "./DeckGroupsSection2.module.css";

type BoardId = "groups" | "entries" | "source";
type GroupId = string;
type SetId = string;
type LayoutMode = "content" | "fill-parent";

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

type DeckMockDndContextValue = {
  state: DnDState;
  activeSetId: SetId | null;
  hoverBoundaryByBoard: Record<BoardId, number | null>;
  registerGroupRef: (groupId: GroupId, node: HTMLElement | null) => void;
  handleHoverBoundary: (boardId: BoardId, clientX: number) => void;
  handleLeaveBoard: (boardId: BoardId) => void;
  createGroupAtIndex: (boardId: BoardId, index: number) => void;
};

type DeckSortableBoardViewModel = {
  config: BoardConfig;
  groupIds: GroupId[];
  itemsByGroup: Record<GroupId, SetId[]>;
  activeSetId: SetId | null;
  hoverBoundaryIndex: number | null;
  onHoverBoundary: (clientX: number) => void;
  onLeaveBoard: () => void;
  onCreateGroupAtIndex: (index: number) => void;
  registerGroupRef: (groupId: GroupId, node: HTMLElement | null) => void;
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

const INITIAL_STATE: DnDState = {
  groupOrderByBoard: {
    groups: ["groups:A", "groups:B", "groups:C"],
    entries: ["entries:E1"],
    source: ["source:S1"],
  },
  groupToBoard: {
    "groups:A": "groups",
    "groups:B": "groups",
    "groups:C": "groups",
    "entries:E1": "entries",
    "source:S1": "source",
  },
  itemsByGroup: {
    "groups:A": ["g-A1", "g-A2", "g-A3"],
    "groups:B": ["g-B1", "g-B2"],
    "groups:C": ["g-C1"],
    "entries:E1": ["e-1", "e-2", "e-3", "e-4", "e-5", "e-6", "e-7", "e-8", "e-9", "e-10"],
    "source:S1": ["src-1", "src-2", "src-3", "src-4"],
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

function canMove(_sourceGroupId: GroupId, _targetGroupId: GroupId, _setId: SetId): boolean {
  return true;
}

function findGroupIdBySetId(itemsByGroup: Record<GroupId, SetId[]>, setId: SetId): GroupId | null {
  const groupId = Object.keys(itemsByGroup).find((candidate) =>
    itemsByGroup[candidate]?.includes(setId),
  );
  return groupId ?? null;
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
  children,
  fillParent,
  canReceiveDrops,
}: {
  groupId: GroupId;
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
        <span>{parseGroupLabel(groupId)}</span>
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
  index,
  groupId,
}: {
  setId: SetId;
  index: number;
  groupId: GroupId;
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
      >
        <span>{parseSetLabel(setId)}</span>
        <span className={styles.grip} aria-hidden="true">
          ⠿
        </span>
      </div>
    </div>
  );
}

function DraggableSetCard({ setId, groupId }: { setId: SetId; groupId: GroupId }) {
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
      >
        <span>{parseSetLabel(setId)}</span>
        <span className={styles.grip} aria-hidden="true">
          ⠿
        </span>
      </div>
    </div>
  );
}

function OverlayCard({ setId }: { setId: SetId }) {
  return (
    <div className={styles.overlay}>
      <div className={[styles.setCard, styles.setCardDragging].join(" ")}>
        <span>{parseSetLabel(setId)}</span>
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
  const { config, groupIds, itemsByGroup, activeSetId, hoverBoundaryIndex } = model;
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
          <div key={`${groupId}-${index}`} className={styles.groupStack}>
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
                fillParent={useFillParent}
                canReceiveDrops={config.allowDropTarget}
              >
                {(itemsByGroup[groupId] ?? []).map((setId, setIndex) =>
                  config.allowInGroupSort ? (
                    <SortableSetCard key={setId} setId={setId} index={setIndex} groupId={groupId} />
                  ) : (
                    <DraggableSetCard key={setId} setId={setId} groupId={groupId} />
                  ),
                )}
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

export function DeckMockDndProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DnDState>(INITIAL_STATE);
  const [activeSetId, setActiveSetId] = useState<SetId | null>(null);
  const [hoverBoundaryByBoard, setHoverBoundaryByBoard] = useState<Record<BoardId, number | null>>({
    groups: null,
    entries: null,
    source: null,
  });
  const [ephemeralEmptyGroupId, setEphemeralEmptyGroupId] = useState<GroupId | null>(null);

  const previousState = useRef<DnDState>(INITIAL_STATE);
  const nextGroupIdRef = useRef<number>(1);
  const groupRefs = useRef<Map<GroupId, HTMLElement>>(new Map());

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

  const handleDragStart = (event: DragStartEvent) => {
    if (event.operation.source?.type !== "set") return;
    previousState.current = state;
    setActiveSetId(String(event.operation.source.id));
    setHoverBoundaryByBoard({ groups: null, entries: null, source: null });
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.operation.source?.type !== "set") return;

    const sourceSetId = String(event.operation.source.id);
    const sourceGroupId =
      String(event.operation.source.group ?? "") ||
      findGroupIdBySetId(state.itemsByGroup, sourceSetId) ||
      "";
    const targetId = String(event.operation.target?.id ?? "");
    const targetGroupId =
      event.operation.target?.type === "group"
        ? targetId
        : String(event.operation.target?.group ?? "") ||
          (targetId ? findGroupIdBySetId(state.itemsByGroup, targetId) || "" : "");

    if (!sourceGroupId || !targetGroupId) return;
    const sourceBoardId = state.groupToBoard[sourceGroupId];
    const targetBoardId = state.groupToBoard[targetGroupId];
    if (!sourceBoardId) return;
    if (!targetBoardId) return;
    const sourceBoardConfig = BOARD_CONFIGS[sourceBoardId];
    const targetBoardConfig = BOARD_CONFIGS[targetBoardId];
    if (sourceGroupId === targetGroupId && !sourceBoardConfig.allowInGroupSort) return;
    if (!targetBoardConfig.allowDropTarget) return;
    if (!canMove(sourceGroupId, targetGroupId, sourceSetId)) return;

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
      setState(previousState.current);
      setActiveSetId(null);
      return;
    }

    setState((current) => {
      const next = normalizeAfterDrop(current);
      if (ephemeralEmptyGroupId && !(ephemeralEmptyGroupId in next.itemsByGroup)) {
        setEphemeralEmptyGroupId(null);
      } else if (
        ephemeralEmptyGroupId &&
        (next.itemsByGroup[ephemeralEmptyGroupId]?.length ?? 0) > 0
      ) {
        setEphemeralEmptyGroupId(null);
      }
      return next;
    });

    setActiveSetId(null);
  };

  const handleDragCancel = () => {
    setState(previousState.current);
    setActiveSetId(null);
  };

  return (
    <DeckMockDndContext.Provider
      value={{
        state,
        activeSetId,
        hoverBoundaryByBoard,
        registerGroupRef,
        handleHoverBoundary,
        handleLeaveBoard,
        createGroupAtIndex,
      }}
    >
      <DragDropProvider
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        <DragOverlay>{activeSetId ? <OverlayCard setId={activeSetId} /> : null}</DragOverlay>
      </DragDropProvider>
    </DeckMockDndContext.Provider>
  );
}

function useDeckSortableBoardViewModel(boardId: BoardId): DeckSortableBoardViewModel {
  const {
    state,
    activeSetId,
    hoverBoundaryByBoard,
    registerGroupRef,
    handleHoverBoundary,
    handleLeaveBoard,
    createGroupAtIndex,
  } = useDeckMockDnd();

  return {
    config: BOARD_CONFIGS[boardId],
    groupIds: state.groupOrderByBoard[boardId],
    itemsByGroup: state.itemsByGroup,
    activeSetId,
    hoverBoundaryIndex: hoverBoundaryByBoard[boardId],
    onHoverBoundary: (clientX: number) => handleHoverBoundary(boardId, clientX),
    onLeaveBoard: () => handleLeaveBoard(boardId),
    onCreateGroupAtIndex: (index: number) => createGroupAtIndex(boardId, index),
    registerGroupRef,
  };
}

export default function DeckGroupsBoardMock() {
  const model = useDeckSortableBoardViewModel("groups");
  return <DeckSortableBoardView model={model} layoutMode="content" />;
}

export function DeckEntriesBoardMock({
  layoutMode = "fill-parent",
}: {
  layoutMode?: LayoutMode;
}) {
  const model = useDeckSortableBoardViewModel("entries");
  return <DeckSortableBoardView model={model} layoutMode={layoutMode} />;
}

export function DeckSourceBoardMock({ layoutMode = "fill-parent" }: { layoutMode?: LayoutMode }) {
  const model = useDeckSortableBoardViewModel("source");
  return <DeckSortableBoardView model={model} layoutMode={layoutMode} />;
}
