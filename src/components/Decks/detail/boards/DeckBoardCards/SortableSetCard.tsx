"use client";

import { useSortable } from "@dnd-kit/react/sortable";

import type { SortableSetCardProps } from "@/components/Decks/detail/boards/DeckBoardCards/types";

import styles from "../DeckGroupsSection2.module.css";

export function SortableSetCard({
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
  onHoverChange,
  renderTopToolbar,
  renderBottomToolbar,
  sourceLayout,
  shellClassName,
  shellStyle,
}: SortableSetCardProps) {
  const { ref, isDragging, isDragSource, isDropTarget } = useSortable({
    id: setId,
    index,
    type: "set",
    accept: ["set"],
    group: groupId,
  });

  return (
    <div
      className={[styles.setShell, sourceLayout ? styles.setShellSource : "", shellClassName ?? ""]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      data-testid={`set-${setId}`}
      style={shellStyle}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      {renderTopToolbar ? (
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
      ) : null}
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
              : isDragSource || isEphemeral
                ? "ghost"
                : "idle",
        })}
      </div>
      {renderBottomToolbar ? (
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
      ) : null}
    </div>
  );
}
