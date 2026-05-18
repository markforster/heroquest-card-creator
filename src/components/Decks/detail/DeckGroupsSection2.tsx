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

const NEW_GROUP_SLOT_PREFIX = "new-group-slot:";

function makeSlotId(index: number): string {
  return `${NEW_GROUP_SLOT_PREFIX}${index}`;
}

function isNewGroupSlotId(id: string | null | undefined): id is string {
  return Boolean(id?.startsWith(NEW_GROUP_SLOT_PREFIX));
}

function slotIndexFromId(id: string): number | null {
  if (!isNewGroupSlotId(id)) {
    return null;
  }

  const value = Number(id.slice(NEW_GROUP_SLOT_PREFIX.length));
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function removeSetFromAllGroups(itemsByGroup: ItemsByGroup, setId: string): ItemsByGroup {
  return Object.fromEntries(
    Object.entries(itemsByGroup).map(([groupId, setIds]) => [
      groupId,
      setIds.filter((candidate) => candidate !== setId),
    ]),
  );
}

function normalizeState(groupOrder: GroupId[], itemsByGroup: ItemsByGroup): SectionState {
  const nextOrder = groupOrder.filter((groupId) => (itemsByGroup[groupId] ?? []).length > 0);
  const nextItems = Object.fromEntries(nextOrder.map((groupId) => [groupId, itemsByGroup[groupId] ?? []]));

  return {
    groupOrder: nextOrder,
    itemsByGroup: nextItems,
  };
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

function TemporaryGroupSlot({ index }: { index: number }) {
  const slotId = makeSlotId(index);
  const { ref, isDropTarget } = useDroppable({
    id: slotId,
    type: "new-group-slot",
    accept: ["set"],
  });

  return (
    <section
      ref={ref}
      className={[styles.group, styles.groupTemporary, isDropTarget ? styles.groupTemporaryActive : ""]
        .filter(Boolean)
        .join(" ")}
      data-testid={`group-slot-${index}`}
    >
      <header className={styles.groupHeader}>
        <span>GT</span>
        <span className={styles.grip} aria-hidden="true">
          ⠿
        </span>
      </header>
      <div className={styles.groupBody} />
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

export default function DeckGroupsSection2() {
  const [sectionState, setSectionState] = useState<SectionState>(INITIAL_STATE);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);

  const previousState = useRef<SectionState>(INITIAL_STATE);
  const nextGroupIdRef = useRef<number>(1);
  const wasOverSlotRef = useRef<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    if (event.operation.source?.type !== "set") {
      return;
    }

    previousState.current = sectionState;
    wasOverSlotRef.current = null;
    setActiveSetId(String(event.operation.source.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.operation.source?.type !== "set") {
      return;
    }

    const targetId = String(event.operation.target?.id ?? "");
    wasOverSlotRef.current = isNewGroupSlotId(targetId) ? targetId : null;

    if (targetId && !isNewGroupSlotId(targetId)) {
      setSectionState((current) => ({
        ...current,
        itemsByGroup: move(current.itemsByGroup, event) as ItemsByGroup,
      }));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const sourceSetId = String(event.operation.source?.id ?? "");
    const targetId = String(event.operation.target?.id ?? "");

    if (event.canceled && event.operation.source?.type === "set") {
      setSectionState(previousState.current);
      setActiveSetId(null);
      wasOverSlotRef.current = null;
      return;
    }

    const slotId = isNewGroupSlotId(targetId) ? targetId : wasOverSlotRef.current;

    if (!event.canceled && sourceSetId && slotId) {
      const slotIndexRaw = slotIndexFromId(slotId);
      if (slotIndexRaw != null) {
        setSectionState((current) => {
          const withoutSource = removeSetFromAllGroups(current.itemsByGroup, sourceSetId);
          const newGroupId = `N${nextGroupIdRef.current}`;
          nextGroupIdRef.current += 1;

          const nextItems = {
            ...withoutSource,
            [newGroupId]: [sourceSetId],
          };
          const insertionIndex = clamp(slotIndexRaw, 0, current.groupOrder.length);
          const nextOrder = [...current.groupOrder];
          nextOrder.splice(insertionIndex, 0, newGroupId);

          return normalizeState(nextOrder, nextItems);
        });
      }
    } else if (!event.canceled && event.operation.source?.type === "set") {
      setSectionState((current) => normalizeState(current.groupOrder, current.itemsByGroup));
    }

    setActiveSetId(null);
    wasOverSlotRef.current = null;
  };

  const isSetDragActive = Boolean(activeSetId);

  return (
    <DragDropProvider onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className={styles.root} data-testid="deck-groups-section2">
        <div className={styles.groupsRow}>
          {sectionState.groupOrder.map((groupId, index) => (
            <div key={`${groupId}-${index}`} className={styles.groupStack}>
              {isSetDragActive ? <TemporaryGroupSlot index={index} /> : null}
              <GroupColumn id={groupId}>
                {(sectionState.itemsByGroup[groupId] ?? []).map((setId, setIndex) => (
                  <SetCard key={setId} id={setId} index={setIndex} group={groupId} />
                ))}
              </GroupColumn>
            </div>
          ))}
          {isSetDragActive ? <TemporaryGroupSlot index={sectionState.groupOrder.length} /> : null}
        </div>
      </div>
      <DragOverlay>{isSetDragActive && activeSetId ? <OverlayCard id={activeSetId} /> : null}</DragOverlay>
    </DragDropProvider>
  );
}
