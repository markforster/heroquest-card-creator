"use client";

import { createPortal } from "react-dom";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import {
  getCachedCardThumbnailUrl,
  getLegacyCardThumbnailUrl,
  releaseLegacyCardThumbnailUrl,
} from "@/lib/card-thumbnail-cache";
import type { CardRecord } from "@/types/cards-db";

type StockpileTableThumbPopoverProps = {
  tableThumbAnchor: {
    id: string;
    rect: { top: number; left: number; bottom: number; right: number };
  } | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  cardById: Map<string, CardRecord>;
};

export default function StockpileTableThumbPopover({
  tableThumbAnchor,
  onMouseEnter,
  onMouseLeave,
  cardById,
}: StockpileTableThumbPopoverProps) {
  if (!tableThumbAnchor || typeof document === "undefined") return null;
  const hoveredCard = cardById.get(tableThumbAnchor.id) ?? null;
  if (!hoveredCard) return null;
  const previewThumb =
    typeof window !== "undefined"
      ? ENABLE_CARD_THUMB_CACHE
        ? { url: getCachedCardThumbnailUrl(hoveredCard.id, hoveredCard.thumbnailBlob ?? null), onLoad: undefined }
        : (() => {
            const url = getLegacyCardThumbnailUrl(
              hoveredCard.id,
              hoveredCard.thumbnailBlob ?? null,
            );
            return { url, onLoad: url ? () => releaseLegacyCardThumbnailUrl(url) : undefined };
          })()
      : { url: null as string | null, onLoad: undefined as (() => void) | undefined };
  const templateThumb = cardTemplatesById[hoveredCard.templateId]?.thumbnail ?? null;
  const popoverWidth = 160;
  const popoverHeight = 224;
  const left = Math.min(tableThumbAnchor.rect.left, window.innerWidth - popoverWidth - 16);
  const top = Math.min(tableThumbAnchor.rect.bottom + 8, window.innerHeight - popoverHeight - 16);

  return createPortal(
    <div
      className={styles.stockpileTableThumbPopover}
      aria-hidden="true"
      style={{ left, top }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CardThumbnail
        src={previewThumb.url ?? templateThumb?.src ?? null}
        alt={hoveredCard.name}
        variant="md"
        fit="contain"
        className={styles.stockpileTableThumbPreview}
        onLoad={previewThumb.onLoad}
      />
    </div>,
    document.body,
  );
}
