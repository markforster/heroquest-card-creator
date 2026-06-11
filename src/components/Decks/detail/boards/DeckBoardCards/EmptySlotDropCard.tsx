"use client";

import { useDroppable } from "@dnd-kit/react";

import type { EmptySlotDropCardProps } from "@/components/Decks/detail/boards/DeckBoardCards/types";

import styles from "../DeckGroupsSection2.module.css";

export function EmptySlotDropCard({
  setId,
  groupId,
  sourceLayout,
  shellClassName,
  shellStyle,
  renderContent,
}: EmptySlotDropCardProps) {
  const { ref } = useDroppable({
    id: setId,
    type: "set",
    accept: ["set"],
  });

  return (
    <div
      className={[
        styles.setShell,
        styles.setShellEmptySlot,
        sourceLayout ? styles.setShellSource : "",
        shellClassName ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      data-testid={`set-${setId}`}
      style={shellStyle}
    >
      <div className={[styles.setCard, styles.setCardEmptySlot].filter(Boolean).join(" ")}>
        {renderContent({
          setId,
          groupId,
          state: "idle",
        })}
      </div>
    </div>
  );
}
