"use client";

import { createPortal } from "react-dom";

import styles from "@/app/page.module.css";
import { cardTemplatesById } from "@/data/card-templates";
import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import {
  getCachedCardThumbnailUrl,
  getLegacyCardThumbnailUrl,
  releaseLegacyCardThumbnailUrl,
} from "@/lib/card-thumbnail-cache";
import type { CardRecord } from "@/types/cards-db";

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
          const thumb =
            typeof window !== "undefined"
              ? ENABLE_CARD_THUMB_CACHE
                ? {
                    url: getCachedCardThumbnailUrl(card.id, card.thumbnailBlob ?? null),
                    onLoad: undefined,
                  }
                : (() => {
                    const url = getLegacyCardThumbnailUrl(
                      card.id,
                      card.thumbnailBlob ?? null,
                    );
                    return {
                      url,
                      onLoad: url ? () => releaseLegacyCardThumbnailUrl(url) : undefined,
                    };
                  })()
              : { url: null as string | null, onLoad: undefined as (() => void) | undefined };
          const templateThumb = cardTemplatesById[card.templateId]?.thumbnail;
          return (
            <div key={card.id} className={styles.inspectorStackOverflowGridItem}>
              {thumb.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb.url} alt="" onLoad={thumb.onLoad} />
              ) : templateThumb?.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={templateThumb.src} alt="" />
              ) : (
                <div className={styles.inspectorStackPlaceholder} />
              )}
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
