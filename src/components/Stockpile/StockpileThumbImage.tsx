"use client";

import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

import type { ReactNode } from "react";

type StockpileThumbImageProps = {
  cardId: string;
  thumbnailBlob?: Blob | null;
  templateThumbSrc?: string | null;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
};

export default function StockpileThumbImage({
  cardId,
  thumbnailBlob,
  templateThumbSrc,
  alt = "",
  className,
  fallback,
}: StockpileThumbImageProps) {
  const url = useCardThumbnailUrl(cardId, thumbnailBlob ?? null, {
    enabled: true,
    useCache: ENABLE_CARD_THUMB_CACHE,
  });
  const src = url ?? templateThumbSrc ?? null;

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }

  return <>{fallback ?? null}</>;
}
