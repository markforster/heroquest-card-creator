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

type GroupId = "A" | "B" | "C";
type GroupItems = Record<GroupId, string[]>;

const INITIAL_GROUP_ITEMS: GroupItems = {
  A: ["A1", "A2", "A3"],
  B: ["B1", "B2"],
  C: [],
};

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

export default function DeckGroupsSection2() {
  const [items, setItems] = useState<GroupItems>(INITIAL_GROUP_ITEMS);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const previousItems = useRef<GroupItems>(INITIAL_GROUP_ITEMS);

  const handleDragStart = (event: DragStartEvent) => {
    if (event.operation.source?.type !== "set") {
      return;
    }

    previousItems.current = items;
    setActiveSetId(String(event.operation.source.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.operation.source?.type !== "set") {
      return;
    }

    setItems((current) => move(current, event) as GroupItems);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.canceled && event.operation.source?.type === "set") {
      setItems(previousItems.current);
    }

    setActiveSetId(null);
  };

  return (
    <DragDropProvider onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className={styles.root} data-testid="deck-groups-section2">
        <div className={styles.groupsRow}>
          {(Object.keys(items) as GroupId[]).map((groupId) => (
            <GroupColumn key={groupId} id={groupId}>
              {items[groupId].map((setId, index) => (
                <SetCard key={setId} id={setId} index={index} group={groupId} />
              ))}
            </GroupColumn>
          ))}
        </div>
      </div>
      <DragOverlay>{activeSetId ? <OverlayCard id={activeSetId} /> : null}</DragOverlay>
    </DragDropProvider>
  );
}
