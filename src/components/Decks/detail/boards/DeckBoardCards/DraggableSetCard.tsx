"use client";

import { useDraggable } from "@dnd-kit/react";

import type { SharedSetCardProps } from "@/components/Decks/detail/boards/DeckBoardCards/types";

import styles from "../DeckGroupsSection2.module.css";

export function DraggableSetCard({
  boardId,
  setId,
  label,
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
}: SharedSetCardProps) {
  const { ref, handleRef, isDragging } = useDraggable({
    id: setId,
    type: "set",
    data: { group: groupId },
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
            isGhost: isDragging || Boolean(isEphemeral),
            isDropTarget: false,
          })}
        </div>
      ) : null}
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
      {renderBottomToolbar ? (
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
      ) : null}
    </div>
  );
}
