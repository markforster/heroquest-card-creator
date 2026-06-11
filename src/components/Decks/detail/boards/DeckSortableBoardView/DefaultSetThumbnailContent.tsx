"use client";

import CardThumbnail from "@/components/common/CardThumbnail";
import type { DefaultSetThumbnailContentProps } from "@/components/Decks/detail/boards/DeckSortableBoardView/types";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

import styles from "../../DeckGroupsSection2.module.css";

function parseSetLabel(setId: string): string {
  if (setId.startsWith("g-")) return setId.slice(2).toUpperCase();
  return setId.toUpperCase();
}

export function DefaultSetThumbnailContent({
  setId,
  cardId,
  label,
  state,
}: DefaultSetThumbnailContentProps) {
  const thumbUrl = useCardThumbnailUrl(cardId ?? null, null, {
    enabled: Boolean(cardId),
    useCache: true,
  });
  const title = label ?? parseSetLabel(setId);
  const stateClass =
    state === "dragging" || state === "overlay"
      ? styles.setContentDragging
      : state === "ghost" || state === "pending"
        ? styles.setContentGhost
        : state === "dropTarget"
          ? styles.setContentDropTarget
          : "";

  return (
    <div className={[styles.setContent, stateClass].filter(Boolean).join(" ")}>
      <CardThumbnail
        src={thumbUrl}
        alt={title}
        variant="md"
        fit="contain"
        className={styles.setThumb}
        fallback={<div className={styles.setThumbFallback} />}
      />
    </div>
  );
}
