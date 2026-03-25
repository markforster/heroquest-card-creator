"use client";

import { useMemo } from "react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

import type { CSSProperties } from "react";

const DEFAULT_TILT = 0.2;
const DEFAULT_SPACING = 0.6;

export type CardFanVariant = "xs" | "sm" | "smMd" | "lg";

export const CARD_FAN_SIZES: Record<CardFanVariant, { width: number; height: number }> = {
  xs: { width: 22.5, height: 31.5 },
  sm: { width: 46, height: 64 },
  smMd: { width: 105, height: 147 },
  lg: { width: 150, height: 210 },
};

type CardFanLayout = "centered" | "balanced";

type CardFanProps = {
  cardIds: string[];
  variant: CardFanVariant;
  maxCount?: number;
  showPlaceholdersWhenEmpty?: boolean;
  tilt?: number;
  spacing?: number;
  fanType?: "centered" | "ltr" | "rtl";
  className?: string;
};

function CardFanThumb({ cardId, variant }: { cardId: string; variant: CardFanVariant }) {
  const thumbUrl = useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true });
  return (
    <CardThumbnail
      src={thumbUrl}
      alt=""
      variant={variant}
      fit="cover"
      className={styles.deckPreviewThumb}
      fallback={<div className={styles.deckPreviewThumbFallback} />}
    />
  );
}

function getOffsets(count: number, fanType: "centered" | "ltr" | "rtl"): number[] {
  if (count <= 0) return [];
  const base = Array.from({ length: count }, (_, index) => index - (count - 1) / 2);
  if (fanType === "ltr") {
    return base.slice().sort((a, b) => a - b);
  }
  if (fanType === "rtl") {
    return base.slice().sort((a, b) => b - a);
  }
  return base;
}

function getZIndex(offset: number, maxDepth: number, fanType: "centered" | "ltr" | "rtl"): number {
  if (fanType === "ltr") {
    return Math.round((offset + maxDepth) * 100);
  }
  if (fanType === "rtl") {
    return Math.round((maxDepth - offset) * 100);
  }
  const depth = Math.abs(offset);
  const sideBias = offset > 0 ? 0.1 : offset < 0 ? 0 : 0.2;
  return Math.round((maxDepth - depth + sideBias) * 100);
}

export default function CardFan({
  cardIds,
  variant,
  maxCount = 5,
  showPlaceholdersWhenEmpty = false,
  tilt = DEFAULT_TILT,
  spacing = DEFAULT_SPACING,
  fanType = "centered",
  className,
}: CardFanProps) {
  const visibleIds = cardIds.slice(0, maxCount);
  const items = useMemo(() => {
    if (visibleIds.length > 0) return visibleIds;
    if (!showPlaceholdersWhenEmpty) return [];
    return Array.from({ length: maxCount }).map(() => null);
  }, [maxCount, showPlaceholdersWhenEmpty, visibleIds]);

  const offsets = getOffsets(items.length, fanType);
  const size = CARD_FAN_SIZES[variant];
  const maxDepth = offsets.length ? Math.max(...offsets.map((value) => Math.abs(value))) : 0;
  const rotateDeg = 6 * tilt;
  const offsetPx = 8 * spacing;
  const fanWidth = offsets.length
    ? offsets.reduce(
        (acc, offset) => {
          const angle = (offset * rotateDeg * Math.PI) / 180;
          const halfWidth =
            (Math.abs(size.width * Math.cos(angle)) + Math.abs(size.height * Math.sin(angle))) / 2;
          const centerX = offset * offsetPx;
          const minX = centerX - halfWidth;
          const maxX = centerX + halfWidth;
          return {
            min: Math.min(acc.min, minX),
            max: Math.max(acc.max, maxX),
          };
        },
        { min: 0, max: 0 },
      )
    : { min: 0, max: size.width };
  const fanWidthPx = Math.max(size.width, fanWidth.max - fanWidth.min);
  const fanCenterShift = -(fanWidth.min + fanWidth.max) / 2;

  const style: CSSProperties = {
    ["--card-fan-w" as string]: `${size.width}px`,
    ["--card-fan-h" as string]: `${size.height}px`,
    ["--card-fan-translate" as string]: `${offsetPx}px`,
    ["--card-fan-rotate" as string]: `${rotateDeg}deg`,
    ["--card-fan-width" as string]: `${fanWidthPx}px`,
    ["--card-fan-center-shift" as string]: `${fanCenterShift}px`,
    // border: "solid 1px red", //DEBUG
    // margin: "40px", //DEBUG
  };

  return (
    <div
      style={{
        padding: "10px",
        // border: "solid 1px blue",
        marginBottom: "10px",
        display: "inline-block",
      }}
    >
      <div className={`${styles.cardFan} ${className ?? ""}`} style={style}>
        {items.map((cardId, index) => (
          <div
            key={cardId ? `${cardId}-${index}` : `placeholder-${index}`}
            className={`${styles.cardFanCard} ${cardId ? "" : styles.cardFanPlaceholder}`}
            style={{
              ["--card-fan-offset" as string]: offsets[index] ?? 0,
              zIndex: getZIndex(offsets[index] ?? 0, maxDepth, fanType),
            }}
          >
            {cardId ? <CardFanThumb cardId={cardId} variant={variant} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
