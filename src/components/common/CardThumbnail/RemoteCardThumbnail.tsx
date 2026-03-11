"use client";

import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

import CardThumbnail from "./index";

import type { CardThumbnailFit, CardThumbnailVariant } from "./index";
import type { ReactNode } from "react";

type RemoteCardThumbnailProps = {
  cardId: string;
  thumbnailBlob?: Blob | null;
  templateThumbSrc?: string | null;
  alt: string;
  variant: CardThumbnailVariant;
  fit?: CardThumbnailFit;
  className?: string;
  imageClassName?: string;
  fallback?: ReactNode;
};

export default function RemoteCardThumbnail({
  cardId,
  thumbnailBlob,
  templateThumbSrc,
  alt,
  variant,
  fit,
  className,
  imageClassName,
  fallback,
}: RemoteCardThumbnailProps) {
  const url = useCardThumbnailUrl(cardId, thumbnailBlob ?? null, {
    enabled: true,
    useCache: ENABLE_CARD_THUMB_CACHE,
  });
  const src = url ?? templateThumbSrc ?? null;

  return (
    <CardThumbnail
      src={src}
      alt={alt}
      variant={variant}
      fit={fit}
      className={className}
      imageClassName={imageClassName}
      fallback={fallback}
    />
  );
}
