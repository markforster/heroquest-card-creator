"use client";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

const BACK_PANEL_TILE_VARIANT = "smMd";

export function BackPanelThumb({
  cardId,
  variant = BACK_PANEL_TILE_VARIANT,
}: {
  cardId: string;
  variant?: "sm" | "smMd";
}) {
  const thumbUrl = useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true });
  return (
    <CardThumbnail
      src={thumbUrl}
      alt=""
      variant={variant}
      fit="contain"
      className={styles.deckSetThumb}
      fallback={<div className={styles.deckSetThumbFallback} />}
    />
  );
}
