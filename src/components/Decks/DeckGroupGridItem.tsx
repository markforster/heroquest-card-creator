"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { DeckGroupRecord } from "@/api/decks";
import styles from "@/app/page.module.css";

import type { CSSProperties, ReactNode } from "react";

const SHOW_BORDER_AND_BACKGROUND = false;

type DeckGroupGridItemProps = {
  group: DeckGroupRecord;
  isSelected: boolean;
  hasKeySet?: boolean;
  onSelect: () => void;
  onHoverChange?: (isHovering: boolean) => void;
  preview: ReactNode;
  style?: CSSProperties;
};

export default function DeckGroupGridItem({
  group,
  isSelected,
  hasKeySet = false,
  onSelect,
  onHoverChange,
  preview,
  style,
}: DeckGroupGridItemProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${group.id}` });
  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `group-drag:${group.id}`,
    data: { type: "group", groupId: group.id },
  });
  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setDragNodeRef(node);
  };
  const dragStyle: CSSProperties = transform
    ? { transform: CSS.Translate.toString(transform) }
    : {};
  return (
    <div
      ref={combinedRef}
      data-group-id={group.id}
      className={`${styles.deckNavItem} ${isSelected ? styles.deckNavItemSelected : ""} ${
        isOver ? styles.deckNavItemDropOver : ""
      } ${isDragging ? styles.deckNavItemDragging : ""} ${
        SHOW_BORDER_AND_BACKGROUND ? styles.deckNavItemChrome : ""
      }`}
      style={{ ...style, ...dragStyle }}
      onClick={onSelect}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      {...attributes}
      {...listeners}
    >
      <div className={styles.deckGroupPreview}>
        {preview}
        {hasKeySet ? <span className={styles.deckKeySetBadge}>Key</span> : null}
      </div>
      <div className={styles.deckNavItemTitle}>{group.title}</div>
    </div>
  );
}
