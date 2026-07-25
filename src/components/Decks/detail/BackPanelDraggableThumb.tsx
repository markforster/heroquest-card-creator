"use client";

import { useDraggable } from "@dnd-kit/core";

import styles from "@/app/page.module.css";

import { BackPanelThumb } from "./BackPanelThumb";

export function BackPanelDraggableThumb({
  cardId,
  faceMode,
}: {
  cardId: string;
  faceMode: "back" | "front";
}) {
  const dragType = faceMode === "back" ? "back-face" : "front-face";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${faceMode}:${cardId}`,
    data:
      faceMode === "back"
        ? { type: dragType, backFaceId: cardId }
        : { type: dragType, frontFaceId: cardId },
  });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.deckBacksThumb} ${isDragging ? styles.deckBacksThumbDragging : ""}`}
      style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
      {...attributes}
      {...listeners}
    >
      <BackPanelThumb cardId={cardId} />
    </div>
  );
}
