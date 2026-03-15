"use client";

import { createPortal } from "react-dom";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import { cardTemplatesById } from "@/data/card-templates";
import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";
import type { CardRecord } from "@/api/cards";

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
  const hoveredCard = tableThumbAnchor ? cardById.get(tableThumbAnchor.id) ?? null : null;
  const previewUrl = useCardThumbnailUrl(hoveredCard?.id ?? null, hoveredCard?.thumbnailBlob ?? null, {
    enabled: Boolean(hoveredCard),
    useCache: ENABLE_CARD_THUMB_CACHE,
  });
  if (!tableThumbAnchor || typeof document === "undefined") return null;
  if (!hoveredCard) return null;
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
        src={previewUrl ?? templateThumb?.src ?? null}
        alt={hoveredCard.name}
        variant="md"
        fit="contain"
        className={styles.stockpileTableThumbPreview}
      />
    </div>,
    document.body,
  );
}
