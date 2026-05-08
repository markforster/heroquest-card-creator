"use client";

import { DragOverlay } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";

import type { DeckSetRecord } from "@/api/decks";
import styles from "@/app/page.module.css";
import { useDeckSetEntries } from "@/components/Decks/detail/context/DeckSetEntriesContext";
import type { DeckDetailDragState } from "@/components/Decks/types/deck-detail";

import type { ReactNode } from "react";

export default function DeckDragOverlay({
  drag,
  setById,
  deckEntryThumb,
  deckSetThumb,
  backPanelThumb,
}: {
  drag: DeckDetailDragState;
  setById: Map<string, DeckSetRecord>;
  deckEntryThumb: (cardId: string, isSelected: boolean) => ReactNode;
  deckSetThumb: (cardId: string) => ReactNode;
  backPanelThumb: (cardId: string) => ReactNode;
}) {
  const { entries, pairsById } = useDeckSetEntries();
  return (
    <DragOverlay
      modifiers={
        drag.dragActiveBackFaceId ||
        drag.dragActiveFrontFaceId ||
        drag.dragActiveEntryId ||
        drag.dragActiveSetId ||
        drag.dragActiveGroupId
          ? [snapCenterToCursor]
          : undefined
      }
      dropAnimation={
        (drag.dragActiveBackFaceId || drag.dragActiveFrontFaceId) && drag.faceDropSucceeded
          ? null
          : undefined
      }
    >
      {drag.dragActiveBackFaceId ? (
        <div className={styles.deckBacksDragOverlay}>{backPanelThumb(drag.dragActiveBackFaceId)}</div>
      ) : drag.dragActiveFrontFaceId ? (
        <div className={styles.deckBacksDragOverlay}>{backPanelThumb(drag.dragActiveFrontFaceId)}</div>
      ) : drag.dragActiveEntryId ? (
        <div className={styles.deckBacksDragOverlay}>
          {(() => {
            const entry = entries.find((candidate) => candidate.id === drag.dragActiveEntryId);
            const frontId = entry ? (pairsById.get(entry.pairId)?.frontFaceId ?? null) : null;
            return frontId ? deckEntryThumb(frontId, false) : null;
          })()}
        </div>
      ) : drag.dragActiveSetId ? (
        <div
          className={`${styles.deckSetTileOverlay} ${
            drag.isRemoveZone ? styles.deckSetTileOverlayRemove : ""
          }`}
        >
          {(() => {
            const set = setById.get(drag.dragActiveSetId as string);
            if (!set) return null;
            return deckSetThumb(set.backFaceId);
          })()}
          {drag.isRemoveZone ? <div className={styles.deckSetRemoveBadge}>×</div> : null}
        </div>
      ) : null}
    </DragOverlay>
  );
}
