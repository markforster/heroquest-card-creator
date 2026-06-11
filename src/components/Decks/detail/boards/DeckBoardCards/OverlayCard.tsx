"use client";

import type { OverlayCardProps } from "@/components/Decks/detail/boards/DeckBoardCards/types";

import styles from "../DeckGroupsSection2.module.css";

export function OverlayCard({ setId, groupId, label, cardId, renderContent }: OverlayCardProps) {
  return (
    <div className={styles.overlay}>
      <div className={[styles.setCard, styles.setCardDragging].join(" ")}>
        {renderContent({
          setId,
          groupId,
          label,
          cardId,
          state: "overlay",
        })}
      </div>
    </div>
  );
}
