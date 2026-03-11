"use client";

import { createPortal } from "react-dom";

import styles from "@/app/page.module.css";
import { cardTemplatesById } from "@/data/card-templates";
import StockpileThumbImage from "@/components/Stockpile/StockpileThumbImage";
import type { CardRecord } from "@/api/cards";

type StockpilePairOverflowPopoverProps = {
  isOpen: boolean;
  anchor: { rect: { top: number; left: number; bottom: number; right: number }; cards: CardRecord[] } | null;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export default function StockpilePairOverflowPopover({
  isOpen,
  anchor,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: StockpilePairOverflowPopoverProps) {
  if (!isOpen || !anchor || typeof document === "undefined") return null;
  const tileWidth = 96;
  const tileGap = 8;
  const columns = 5;
  const padding = 16;
  const popoverWidth = padding * 2 + columns * tileWidth + (columns - 1) * tileGap;
  const popoverMaxHeight = 300;
  const left = Math.min(anchor.rect.left, window.innerWidth - popoverWidth - 16);
  const top = Math.min(anchor.rect.bottom + 6, window.innerHeight - popoverMaxHeight - 16);

  return createPortal(
    <div
      className={styles.inspectorStackOverflowPopover}
      style={{ left, top, width: popoverWidth }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave ?? onClose}
    >
      <div className={styles.inspectorStackOverflowGrid}>
        {anchor.cards.map((card) => {
          const templateThumb = cardTemplatesById[card.templateId]?.thumbnail;
          return (
            <div key={card.id} className={styles.inspectorStackOverflowGridItem}>
              <StockpileThumbImage
                cardId={card.id}
                thumbnailBlob={card.thumbnailBlob ?? null}
                templateThumbSrc={templateThumb?.src ?? null}
                alt=""
                fallback={<div className={styles.inspectorStackPlaceholder} />}
              />
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
