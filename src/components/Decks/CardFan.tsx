"use client";

import { useMemo } from "react";

import styles from "@/app/page.module.css";
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

type CardFanProps = {
  cardIds: string[];
  variant: CardFanVariant;
  maxCount?: number;
  showPlaceholdersWhenEmpty?: boolean;
  tilt?: number;
  spacing?: number;
  fanType?: "centered" | "ltr" | "rtl";
  expanded?: boolean;
  hovered?: boolean;
  hoverTilt?: number;
  hoverSpacing?: number;
  stableBaseCount?: number;
  enableHoverBorder?: boolean;
  onSelectCard?: (cardId: string, index: number) => void;
  selectedCardId?: string | null;
  className?: string;
};

function CardFanThumbSvg({
  cardId,
  x,
  y,
  width,
  height,
}: {
  cardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const thumbUrl = useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true });
  if (!thumbUrl) {
    return (
      <rect x={x} y={y} width={width} height={height} rx={6} ry={6} fill="transparent" />
    );
  }
  const clipId = `cardfan-clip-${cardId}-${Math.round(x)}-${Math.round(y)}`;
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} rx={6} ry={6} />
        </clipPath>
      </defs>
      <image
        href={thumbUrl}
        x={x}
        y={y}
        width={width}
        height={height}
        clipPath={`url(#${clipId})`}
      />
    </>
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

function getStableOffsets(
  count: number,
  baseCount: number,
  fanType: "centered" | "ltr" | "rtl",
): number[] {
  const clampedBase = Math.max(0, Math.min(baseCount, count));
  const baseOffsets = getOffsets(clampedBase, fanType);
  if (count <= clampedBase) return baseOffsets;
  if (baseOffsets.length === 0) return getOffsets(count, fanType);

  const step =
    baseOffsets.length > 1 ? Math.abs(baseOffsets[1] - baseOffsets[0]) : 1;
  if (fanType === "ltr") {
    const start = Math.max(...baseOffsets);
    const extras = Array.from({ length: count - clampedBase }, (_, index) =>
      start + step * (index + 1),
    );
    return baseOffsets.concat(extras);
  }
  if (fanType === "rtl") {
    const start = Math.min(...baseOffsets);
    const extras = Array.from({ length: count - clampedBase }, (_, index) =>
      start - step * (index + 1),
    );
    return baseOffsets.concat(extras);
  }

  const maxAbs = Math.max(...baseOffsets.map((value) => Math.abs(value)));
  const extras = Array.from({ length: count - clampedBase }, (_, index) => {
    const depth = maxAbs + step * (Math.floor(index / 2) + 1);
    return index % 2 === 0 ? depth : -depth;
  });
  return baseOffsets.concat(extras);
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
  expanded = false,
  hovered = false,
  hoverTilt = DEFAULT_TILT,
  hoverSpacing = 0.85,
  stableBaseCount,
  enableHoverBorder = false,
  onSelectCard,
  selectedCardId = null,
  className,
}: CardFanProps) {
  const isHoverSpread = !expanded && hovered;
  const effectiveTilt = expanded ? 0 : tilt;
  const effectiveSpacing = expanded ? 1 : spacing;
  const effectiveFanType = expanded ? "ltr" : fanType;
  const visibleIds = cardIds.slice(0, maxCount);
  const items = useMemo(() => {
    if (visibleIds.length > 0) return visibleIds;
    if (!showPlaceholdersWhenEmpty) return [];
    return Array.from({ length: maxCount }).map(() => null);
  }, [maxCount, showPlaceholdersWhenEmpty, visibleIds]);

  const offsets =
    isHoverSpread && stableBaseCount && items.length > stableBaseCount
      ? getStableOffsets(items.length, stableBaseCount, effectiveFanType)
      : getOffsets(items.length, effectiveFanType);
  const size = CARD_FAN_SIZES[variant];
  const maxDepth = offsets.length ? Math.max(...offsets.map((value) => Math.abs(value))) : 0;
  const rotateDeg = 6 * effectiveTilt;
  const offsetPx = expanded
    ? size.width + 8
    : isHoverSpread
      ? size.width * 0.5
      : 8 * effectiveSpacing;
  const baselineY = size.height;

  const layout = offsets.map((offset, index) => {
    const angle = offset * rotateDeg;
    const centerX = offset * offsetPx;
    const centerY = baselineY;
    const zIndex = getZIndex(offset, maxDepth, effectiveFanType);
    return {
      cardId: items[index],
      offset,
      angle,
      centerX,
      centerY,
      zIndex,
      index,
    };
  });

  const bounds = layout.reduce(
    (acc, item) => {
      const angleRad = (item.angle * Math.PI) / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      const corners = [
        { x: -size.width / 2, y: -size.height },
        { x: size.width / 2, y: -size.height },
        { x: size.width / 2, y: 0 },
        { x: -size.width / 2, y: 0 },
      ];
      for (const corner of corners) {
        const rx = corner.x * cos - corner.y * sin;
        const ry = corner.x * sin + corner.y * cos;
        const x = item.centerX + rx;
        const y = item.centerY + ry;
        acc.minX = Math.min(acc.minX, x);
        acc.maxX = Math.max(acc.maxX, x);
        acc.minY = Math.min(acc.minY, y);
        acc.maxY = Math.max(acc.maxY, y);
      }
      return acc;
    },
    { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
  );

  const safeBounds =
    bounds.minX === Number.POSITIVE_INFINITY
      ? { minX: 0, maxX: size.width, minY: 0, maxY: size.height }
      : bounds;

  const borderPad = 6;
  const svgWidth = Math.max(size.width, safeBounds.maxX - safeBounds.minX) + borderPad * 2;
  const svgHeight = Math.max(size.height, safeBounds.maxY - safeBounds.minY) + borderPad * 2;
  const viewMinX = safeBounds.minX - borderPad;
  const viewMinY = safeBounds.minY - borderPad;

  const style: CSSProperties = {
    width: `${svgWidth}px`,
    height: `${svgHeight}px`,
  };

  return (
    <div
      className={`${styles.cardFan} ${className ?? ""}`}
      style={style}
      data-expanded={expanded ? "true" : "false"}
      data-hovered={hovered ? "true" : "false"}
    >
      <svg
        className={styles.cardFanSvg}
        width={svgWidth}
        height={svgHeight}
        viewBox={`${viewMinX} ${viewMinY} ${svgWidth} ${svgHeight}`}
        role="img"
      >
        {layout
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((item) => {
            const cardId = item.cardId;
            const canSelect = Boolean(cardId && onSelectCard);
            const pivotX = item.centerX;
            const pivotY = item.centerY;
            const x = -size.width / 2;
            const y = -size.height;
            const transform = `translate(${pivotX} ${pivotY}) rotate(${item.angle})`;
            const isSelected = selectedCardId ? cardId === selectedCardId : false;
            return (
              <g
                key={cardId ? `${cardId}-${item.index}` : `placeholder-${item.index}`}
                transform={transform}
                className={styles.cardFanCardSvg}
                style={{
                  transition: "transform 180ms ease",
                  cursor: canSelect ? "pointer" : "default",
                }}
                onClick={
                  canSelect
                    ? (event) => {
                        event.stopPropagation();
                        if (cardId) onSelectCard?.(cardId, item.index);
                      }
                    : undefined
                }
              >
                {cardId ? (
                  <>
                    <CardFanThumbSvg
                      cardId={cardId}
                      x={x}
                      y={y}
                      width={size.width}
                      height={size.height}
                    />
                    {enableHoverBorder ? (
                      <rect
                        x={x}
                        y={y}
                        width={size.width}
                        height={size.height}
                        rx={6}
                        ry={6}
                        className={styles.cardFanHover}
                      />
                    ) : null}
                    {isSelected ? (
                      <rect
                        x={x}
                        y={y}
                        width={size.width}
                        height={size.height}
                        rx={6}
                        ry={6}
                        className={styles.cardFanSelected}
                      />
                    ) : null}
                  </>
                ) : (
                  <rect
                    x={x}
                    y={y}
                    width={size.width}
                    height={size.height}
                    rx={6}
                    ry={6}
                    className={styles.cardFanPlaceholderSvg}
                  />
                )}
              </g>
            );
          })}
      </svg>
    </div>
  );
}
