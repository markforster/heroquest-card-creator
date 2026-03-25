"use client";

import { useDroppable } from "@dnd-kit/core";

import type { DeckGroupRecord } from "@/api/decks";
import styles from "@/app/page.module.css";

import type { CSSProperties, ReactNode } from "react";

const SHOW_BORDER_AND_BACKGROUND = false;

type DeckGroupGridItemProps = {
  group: DeckGroupRecord;
  isSelected: boolean;
  onSelect: () => void;
  onHoverChange?: (isHovering: boolean) => void;
  preview: ReactNode;
  style?: CSSProperties;
};

export default function DeckGroupGridItem({
  group,
  isSelected,
  onSelect,
  onHoverChange,
  preview,
  style,
}: DeckGroupGridItemProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${group.id}` });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.deckNavItem} ${isSelected ? styles.deckNavItemSelected : ""} ${
        isOver ? styles.deckNavItemDropOver : ""
      } ${SHOW_BORDER_AND_BACKGROUND ? styles.deckNavItemChrome : ""}`}
      style={style}
      onClick={onSelect}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className={styles.deckGroupPreview}>{preview}</div>
      <div className={styles.deckNavItemTitle}>{group.title}</div>
    </div>
  );
}
