"use client";

import { createPortal } from "react-dom";

import type { CardRecord } from "@/api/cards";
import styles from "@/app/page.module.css";
import type { UsagePopoverAnchor } from "@/components/Assets/AssetsRoutePanels.types";
import StockpileThumbImage from "@/components/Stockpile/StockpileThumbImage";
import { cardTemplatesById } from "@/data/card-templates";

import type { FocusEvent, Ref } from "react";

type AssetsUsageCardsPopoverProps = {
  isOpen: boolean;
  anchor: UsagePopoverAnchor | null;
  cards: CardRecord[];
  popoverRef: Ref<HTMLDivElement>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onOpenCard: (cardId: string) => void;
};

export default function AssetsUsageCardsPopover({
  isOpen,
  anchor,
  cards,
  popoverRef,
  onMouseEnter,
  onMouseLeave,
  onBlur,
  onOpenCard,
}: AssetsUsageCardsPopoverProps) {
  if (!isOpen || !anchor || typeof document === "undefined") return null;

  const tileWidth = 96;
  const tileGap = 8;
  const columns = Math.max(1, Math.min(cards.length, 5));
  const padding = 16;
  const popoverWidth = padding * 2 + columns * tileWidth + (columns - 1) * tileGap;
  const minLeft = 16;
  const maxLeft = Math.max(minLeft, window.innerWidth - popoverWidth - 16);
  const left = Math.min(Math.max(anchor.rect.left, minLeft), maxLeft);
  const top = Math.max(16, anchor.rect.top - 6);

  return createPortal(
    <div
      ref={popoverRef}
      className={styles.assetsUsagePopover}
      style={{ left, top, width: popoverWidth, transform: "translateY(-100%)" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onBlur={onBlur}
      role="group"
      aria-label="Used on cards"
    >
      <div
        className={styles.assetsUsagePopoverGrid}
        style={{ gridTemplateColumns: `repeat(${columns}, ${tileWidth}px)` }}
      >
        {cards.map((card) => {
          const templateThumb = cardTemplatesById[card.templateId]?.thumbnail?.src ?? null;
          const cardLabel = card.name?.trim() || card.title?.trim() || "Untitled card";
          return (
            <button
              key={card.id}
              type="button"
              className={styles.assetsUsagePopoverCard}
              onClick={() => onOpenCard(card.id)}
              aria-label={cardLabel}
            >
              <StockpileThumbImage
                cardId={card.id}
                thumbnailBlob={card.thumbnailBlob ?? null}
                templateThumbSrc={templateThumb}
                alt=""
                fallback={<div className={styles.assetsUsagePopoverPlaceholder} />}
              />
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
