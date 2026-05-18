"use client";

import {
  DragDropProvider,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import { useRef, useState } from "react";

import styles from "./DeckGroupsSection2.module.css";

type GroupId = string;
type ItemsByGroup = Record<GroupId, string[]>;

type SectionState = {
  groupOrder: GroupId[];
  itemsByGroup: ItemsByGroup;
};

const INITIAL_STATE: SectionState = {
  groupOrder: ["A", "B", "C"],
  itemsByGroup: {
    A: ["A1", "A2", "A3"],
    B: ["B1", "B2"],
    C: [],
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeState(groupOrder: GroupId[], itemsByGroup: ItemsByGroup): SectionState {
  const nextOrder = groupOrder.filter((groupId) => groupId in itemsByGroup);
  return { groupOrder: nextOrder, itemsByGroup };
}

function GroupColumn({ id, children }: { id: GroupId; children: React.ReactNode }) {
  const { ref } = useDroppable({
    id,
    type: "group",
    accept: ["set"],
  });

  return (
    <section className={styles.group} ref={ref} data-testid={`group-${id}`}>
      <header className={styles.groupHeader}>
        <span>{id}</span>
        <span className={styles.grip} aria-hidden="true">
          ⠿
        </span>
      </header>
      <div className={styles.groupBody}>{children}</div>
    </section>
  );
}

function SetCard({ id, index, group }: { id: string; index: number; group: GroupId }) {
  const { ref, isDragging, isDragSource, isDropTarget } = useSortable({
    id,
    index,
    type: "set",
    accept: ["set"],
    group,
  });

  const accentClass =
    group === "A" ? styles.setAccentA : group === "B" ? styles.setAccentB : styles.setAccentC;

  return (
    <div className={styles.setShell} ref={ref} data-testid={`set-${id}`}>
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
        <span>{id}</span>
        <span className={styles.grip} aria-hidden="true">
          ⠿
        </span>
      </div>
    </div>
  );
}

function OverlayCard({ id }: { id: string }) {
  return (
    <div className={styles.overlay}>
      <div className={[styles.setCard, styles.setCardDragging].join(" ")}>
        <span>{id}</span>
        <span className={styles.grip} aria-hidden="true">
          ⠿
        </span>
      </div>
    </div>
  );
}

function CreateBoundaryPlaceholder({ index, onCreate }: { index: number; onCreate: (index: number) => void }) {
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

export default function DeckGroupsSection2() {
  const [sectionState, setSectionState] = useState<SectionState>(INITIAL_STATE);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [hoverBoundaryIndex, setHoverBoundaryIndex] = useState<number | null>(null);

  const previousState = useRef<SectionState>(INITIAL_STATE);
  const nextGroupIdRef = useRef<number>(1);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Map<GroupId, HTMLElement>>(new Map());

  const registerGroupRef = (groupId: GroupId, element: HTMLElement | null) => {
    if (element) {
      groupRefs.current.set(groupId, element);
    } else {
      groupRefs.current.delete(groupId);
    }
  };

  const resolveBoundaryFromPointerX = (clientX: number): number => {
    const orderedGroups = sectionState.groupOrder
      .map((groupId) => ({ groupId, element: groupRefs.current.get(groupId) }))
      .filter((entry): entry is { groupId: GroupId; element: HTMLElement } => Boolean(entry.element));

    if (orderedGroups.length === 0) {
      return 0;
    }

    for (let i = 0; i < orderedGroups.length; i += 1) {
      const rect = orderedGroups[i].element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      if (clientX < centerX) {
        return i;
      }
    }

    return orderedGroups.length;
  };

  const handleRowMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (activeSetId) {
      return;
    }
    setHoverBoundaryIndex(resolveBoundaryFromPointerX(event.clientX));
  };

  const handleRowMouseLeave = () => {
    if (!activeSetId) {
      setHoverBoundaryIndex(null);
    }
  };

  const createGroupAtIndex = (index: number) => {
    setSectionState((current) => {
      const newGroupId = `N${nextGroupIdRef.current}`;
      nextGroupIdRef.current += 1;

      const nextOrder = [...current.groupOrder];
      const insertionIndex = clamp(index, 0, nextOrder.length);
      nextOrder.splice(insertionIndex, 0, newGroupId);

      return {
        groupOrder: nextOrder,
        itemsByGroup: {
          ...current.itemsByGroup,
          [newGroupId]: [],
        },
      };
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (event.operation.source?.type !== "set") {
      return;
    }

    previousState.current = sectionState;
    setActiveSetId(String(event.operation.source.id));
    setHoverBoundaryIndex(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.operation.source?.type !== "set") {
      return;
    }

    const targetId = String(event.operation.target?.id ?? "");
    if (!targetId) {
      return;
    }

    setSectionState((current) => ({
      ...current,
      itemsByGroup: move(current.itemsByGroup, event) as ItemsByGroup,
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.canceled && event.operation.source?.type === "set") {
      setSectionState(previousState.current);
      setActiveSetId(null);
      return;
    }

    if (!event.canceled && event.operation.source?.type === "set") {
      setSectionState((current) => normalizeState(current.groupOrder, current.itemsByGroup));
    }

    setActiveSetId(null);
  };

  const isSetDragActive = Boolean(activeSetId);

  return (
    <DragDropProvider onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className={styles.root} data-testid="deck-groups-section2">
        <div
          className={styles.groupsRow}
          data-testid="groups-row"
          ref={rowRef}
          onMouseMove={handleRowMouseMove}
          onMouseLeave={handleRowMouseLeave}
        >
          {sectionState.groupOrder.map((groupId, index) => (
            <div key={`${groupId}-${index}`} className={styles.groupStack}>
              {!isSetDragActive && hoverBoundaryIndex === index ? (
                <CreateBoundaryPlaceholder index={index} onCreate={createGroupAtIndex} />
              ) : null}
              <div ref={(element) => registerGroupRef(groupId, element)}>
                <GroupColumn id={groupId}>
                  {(sectionState.itemsByGroup[groupId] ?? []).map((setId, setIndex) => (
                    <SetCard key={setId} id={setId} index={setIndex} group={groupId} />
                  ))}
                </GroupColumn>
              </div>
            </div>
          ))}
          {!isSetDragActive && hoverBoundaryIndex === sectionState.groupOrder.length ? (
            <CreateBoundaryPlaceholder
              index={sectionState.groupOrder.length}
              onCreate={createGroupAtIndex}
            />
          ) : null}
        </div>
      </div>
      <DragOverlay>{isSetDragActive && activeSetId ? <OverlayCard id={activeSetId} /> : null}</DragOverlay>
    </DragDropProvider>
  );
}
