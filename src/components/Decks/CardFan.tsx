"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useCallback, useMemo } from "react";

import styles from "@/app/page.module.css";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

import type { CSSProperties } from "react";

const DEFAULT_TILT = 0.2;
const DEFAULT_SPACING = 0.6;

export type CardFanVariant = "xs" | "sm" | "inspector" | "smMd" | "lg";

export const CARD_FAN_SIZES: Record<CardFanVariant, { width: number; height: number }> = {
  xs: { width: 22.5, height: 31.5 },
  sm: { width: 46, height: 64 },
  inspector: { width: 56, height: 80 },
  smMd: { width: 105, height: 147 },
  lg: { width: 150, height: 210 },
};

function computeCornerRadius(size: { width: number; height: number }): number {
  const base = Math.min(size.width, size.height);
  // Keep large cards close to legacy appearance while reducing rounding on tiny cards.
  const scaled = base * 0.085;
  return Math.max(2.2, Math.min(6, scaled));
}

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
  hoveredCardId?: string | null;
  hoverSpacing?: number;
  collapsedCoreCount?: number;
  enableHoverBorder?: boolean;
  dropPlaceholderIndex?: number | null;
  getDragMeta?: (cardId: string) => {
    id: string;
    data: Record<string, unknown>;
  } | null;
  onHoverCard?: (cardId: string | null) => void;
  onSelectCard?: (cardId: string, index: number) => void;
  onRemoveCard?: (cardId: string) => void;
  selectedCardId?: string | null;
  className?: string;
  fixedFrameWidth?: number;
  fixedFrameHeight?: number;
  placeholderVariant?: "default" | "deck-group-drop";
  emptyPlaceholderVariant?: "default" | "deck-empty";
};

type CardFanRenderItem = {
  key: string;
  cardId: string | null;
  isDropPlaceholder?: boolean;
};

function CardFanThumbSvg({
  cardId,
  x,
  y,
  width,
  height,
  cornerRadius,
}: {
  cardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}) {
  const thumbUrl = useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true });
  if (!thumbUrl) {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={cornerRadius}
        ry={cornerRadius}
        fill="transparent"
      />
    );
  }
  const clipId = `cardfan-clip-${cardId}-${Math.round(x)}-${Math.round(y)}`;
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={cornerRadius}
            ry={cornerRadius}
          />
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

function getCollapsedOffsets(
  count: number,
  coreCount: number,
  fanType: "centered" | "ltr" | "rtl",
): number[] {
  const clampedCore = Math.max(1, Math.min(coreCount, count));
  if (count <= clampedCore) return getOffsets(count, fanType);

  const start = Math.floor((count - clampedCore) / 2);
  const end = start + clampedCore - 1;
  const coreOffsets = getOffsets(clampedCore, fanType);
  const leftEdge = Math.min(...coreOffsets);
  const rightEdge = Math.max(...coreOffsets);

  return Array.from({ length: count }, (_, index) => {
    if (index < start) return leftEdge;
    if (index > end) return rightEdge;
    return coreOffsets[index - start];
  });
}

function getIndexZIndex(count: number, index: number): number {
  const center = (count - 1) / 2;
  const depth = Math.abs(index - center);
  const sideBias = index > center ? 0.1 : index < center ? 0 : 0.2;
  return Math.round((count - depth + sideBias) * 100);
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

function CardFanItem({
  itemKey,
  cardId,
  isDropPlaceholder = false,
  x,
  y,
  size,
  cornerRadius,
  transform,
  canSelect,
  enableHoverBorder,
  isSelected,
  onHoverCard,
  onSelectCard,
  onRemoveCard,
  itemIndex,
  dragMeta,
  placeholderVariant,
  emptyPlaceholderVariant,
}: {
  itemKey: string;
  cardId: string | null;
  isDropPlaceholder?: boolean;
  x: number;
  y: number;
  size: { width: number; height: number };
  cornerRadius: number;
  transform: string;
  canSelect: boolean;
  enableHoverBorder: boolean;
  isSelected: boolean;
  onHoverCard?: (cardId: string | null) => void;
  onSelectCard?: (cardId: string, index: number) => void;
  onRemoveCard?: () => void;
  itemIndex: number;
  dragMeta: { id: string; data: Record<string, unknown> } | null;
  placeholderVariant: "default" | "deck-group-drop";
  emptyPlaceholderVariant: "default" | "deck-empty";
}) {
  const isSetCard = dragMeta?.data.type === "set" && typeof dragMeta?.data.setId === "string";
  const { setNodeRef: setDropNodeRef } = useDroppable({
    id: dragMeta?.id ?? `cardfan-static-drop:${itemKey}`,
    disabled: !isSetCard,
  });
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: dragMeta?.id ?? `cardfan-static:${itemKey}`,
    data: dragMeta?.data,
    disabled: !dragMeta,
  });
  const draggableRef = useCallback(
    (node: SVGGElement | null) => {
      setDropNodeRef(node as unknown as HTMLElement | null);
      setNodeRef(node as unknown as HTMLElement | null);
    },
    [setDropNodeRef, setNodeRef],
  );

  return (
    <g
      ref={draggableRef}
      transform={transform}
      className={styles.cardFanCardSvg}
      data-set-id={
        dragMeta && typeof dragMeta.data.setId === "string" ? dragMeta.data.setId : undefined
      }
      style={{
        transition: isSetCard ? undefined : "transform 180ms ease",
        cursor: canSelect || dragMeta ? "pointer" : "default",
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
      }}
      // Allow dnd-kit draggable listeners on this node to see the pointer event,
      // but prevent parent draggables (e.g. group tile) from also activating.
      onPointerDown={dragMeta ? (event) => event.stopPropagation() : undefined}
      onMouseEnter={
        cardId && onHoverCard
          ? () => {
              onHoverCard(cardId);
            }
          : undefined
      }
      onMouseMove={
        cardId && onHoverCard
          ? () => {
              onHoverCard(cardId);
            }
          : undefined
      }
      onClick={
        canSelect
          ? (event) => {
              event.stopPropagation();
              if (cardId) onSelectCard?.(cardId, itemIndex);
            }
          : undefined
      }
      {...attributes}
      {...listeners}
    >
      {isDropPlaceholder ? (
        <rect
          x={x}
          y={y}
          width={size.width}
          height={size.height}
          rx={cornerRadius}
          ry={cornerRadius}
          className={
            placeholderVariant === "deck-group-drop"
              ? styles.cardFanDeckGroupDropPlaceholderSvg
              : styles.cardFanPlaceholderSvg
          }
        />
      ) : cardId ? (
        <>
          <CardFanThumbSvg
            cardId={cardId}
            x={x}
            y={y}
            width={size.width}
            height={size.height}
            cornerRadius={cornerRadius}
          />
          {enableHoverBorder ? (
            <rect
              x={x}
              y={y}
              width={size.width}
              height={size.height}
              rx={cornerRadius}
              ry={cornerRadius}
              className={styles.cardFanHover}
            />
          ) : null}
          {isSelected ? (
            <rect
              x={x}
              y={y}
              width={size.width}
              height={size.height}
              rx={cornerRadius}
              ry={cornerRadius}
              className={styles.cardFanSelected}
            />
          ) : null}
          {onRemoveCard ? (
            <g
              className={styles.cardFanRemoveButtonSvg}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onRemoveCard();
              }}
            >
              <circle cx={x + size.width - 9} cy={y + 9} r={9} />
              <text x={x + size.width - 9} y={y + 12} textAnchor="middle" aria-hidden="true">
                ×
              </text>
            </g>
          ) : null}
        </>
      ) : (
        <rect
          x={x}
          y={y}
          width={size.width}
          height={size.height}
          rx={cornerRadius}
          ry={cornerRadius}
          className={
            emptyPlaceholderVariant === "deck-empty"
              ? styles.cardFanEmptyDeckPlaceholderSvg
              : styles.cardFanPlaceholderSvg
          }
        />
      )}
    </g>
  );
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
  hoveredCardId = null,
  hoverSpacing = 1,
  collapsedCoreCount = 5,
  enableHoverBorder = false,
  dropPlaceholderIndex = null,
  getDragMeta,
  onHoverCard,
  onSelectCard,
  onRemoveCard,
  selectedCardId = null,
  className,
  fixedFrameWidth,
  fixedFrameHeight,
  placeholderVariant = "default",
  emptyPlaceholderVariant = "default",
}: CardFanProps) {
  const HOVER_TOPMOST = false;
  const isHoverSpread = !expanded && hovered;
  const effectiveTilt = expanded ? 0 : tilt;
  const effectiveSpacing = expanded ? 1 : spacing;
  const effectiveFanType = expanded ? "ltr" : fanType;
  const renderItems = useMemo<CardFanRenderItem[]>(() => {
    const visibleIds = cardIds.slice(0, maxCount);
    const baseItems: CardFanRenderItem[] =
      visibleIds.length > 0
        ? visibleIds.map((cardId, index) => ({
            key: `card-${cardId}-${index}`,
            cardId,
          }))
        : showPlaceholdersWhenEmpty
          ? Array.from({ length: maxCount }, (_, index) => ({
              key: `empty-${index}`,
              cardId: null,
            }))
          : [];
    if (dropPlaceholderIndex == null) return baseItems;
    const boundedIndex = Math.max(0, Math.min(dropPlaceholderIndex, baseItems.length));
    const nextItems = [...baseItems];
    nextItems.splice(boundedIndex, 0, {
      key: `drop-placeholder-${boundedIndex}`,
      cardId: null,
      isDropPlaceholder: true,
    });
    return nextItems;
  }, [cardIds, dropPlaceholderIndex, maxCount, showPlaceholdersWhenEmpty]);

  const itemCardIds = useMemo(() => {
    if (renderItems.length > 0) return renderItems.map((item) => item.cardId);
    if (!showPlaceholdersWhenEmpty) return [];
    return Array.from({ length: maxCount }).map(() => null);
  }, [maxCount, renderItems, showPlaceholdersWhenEmpty]);

  const offsets = expanded
    ? getOffsets(renderItems.length, effectiveFanType)
    : getCollapsedOffsets(renderItems.length, collapsedCoreCount, effectiveFanType);
  const size = CARD_FAN_SIZES[variant];
  const cornerRadius = computeCornerRadius(size);
  const maxDepth = offsets.length ? Math.max(...offsets.map((value) => Math.abs(value))) : 0;
  const rotateDeg = 6 * effectiveTilt;
  const offsetPx = expanded ? size.width + 8 : 8 * effectiveSpacing;
  const baselineY = size.height;
  const hoveredIndex =
    isHoverSpread && hoveredCardId ? itemCardIds.findIndex((id) => id === hoveredCardId) : -1;
  const hoverShiftPx = size.width * 0.25 * hoverSpacing;

  const baseCenters = offsets.map((offset) => offset * offsetPx);
  const hoverCenters =
    hoveredIndex >= 0 && isHoverSpread
      ? (() => {
          const visualOrder = baseCenters
            .map((center, index) => ({ center, index }))
            .sort((a, b) => a.center - b.center || a.index - b.index);
          const hoveredVisualIndex = visualOrder.findIndex(
            (entry) => entry.index === hoveredIndex,
          );
          if (hoveredVisualIndex < 0) return baseCenters;
          const visualIndexByCard = new Map(
            visualOrder.map((entry, visualIndex) => [entry.index, visualIndex]),
          );
          return baseCenters.map((center, index) => {
            const visualIndex = visualIndexByCard.get(index) ?? index;
            const shift = (visualIndex - hoveredVisualIndex) * hoverShiftPx;
            return center + shift;
          });
        })()
      : baseCenters;
  const baseCenterAvg = baseCenters.length
    ? baseCenters.reduce((sum, value) => sum + value, 0) / baseCenters.length
    : 0;
  const hoverCenterAvg = hoverCenters.length
    ? hoverCenters.reduce((sum, value) => sum + value, 0) / hoverCenters.length
    : 0;
  const centerDelta =
    hoveredIndex >= 0 && isHoverSpread ? hoverCenterAvg - baseCenterAvg : 0;

  const layout = offsets.map((offset, index) => {
    const angle = offset * rotateDeg;
    const centerX = hoverCenters[index] - centerDelta;
    const centerY = baselineY;
    const baseZIndex = expanded
      ? getZIndex(offset, maxDepth, effectiveFanType)
      : getIndexZIndex(renderItems.length, index);
    const zIndex =
      HOVER_TOPMOST && hoveredIndex === index ? baseZIndex + 1000 : baseZIndex;
    return {
      cardId: itemCardIds[index],
      item: renderItems[index],
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
  const frameWidth = Math.max(svgWidth, fixedFrameWidth ?? 0);
  const frameHeight = Math.max(svgHeight, fixedFrameHeight ?? 0);
  const viewMinX = safeBounds.minX - borderPad - (frameWidth - svgWidth) / 2;
  const viewMinY = safeBounds.minY - borderPad - (frameHeight - svgHeight) / 2;

  const style: CSSProperties = {
    width: `${frameWidth}px`,
    height: `${frameHeight}px`,
  };

  return (
    <div
      className={`${styles.cardFan} ${className ?? ""}`}
      style={style}
      data-expanded={expanded ? "true" : "false"}
      data-hovered={hovered ? "true" : "false"}
      data-hover-border={enableHoverBorder ? "true" : "false"}
      onMouseLeave={onHoverCard ? () => onHoverCard(null) : undefined}
    >
      <svg
        className={styles.cardFanSvg}
        width={frameWidth}
        height={frameHeight}
        viewBox={`${viewMinX} ${viewMinY} ${frameWidth} ${frameHeight}`}
        role="img"
      >
        {layout
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((item) => {
            const cardId = item.item.cardId;
            const canSelect = Boolean(cardId && onSelectCard);
            const pivotX = item.centerX;
            const pivotY = item.centerY;
            const x = -size.width / 2;
            const y = -size.height;
            const transform = `translate(${pivotX} ${pivotY}) rotate(${item.angle})`;
            const isSelected = selectedCardId ? cardId === selectedCardId : false;
            const dragMeta = cardId && getDragMeta ? getDragMeta(cardId) : null;
            return (
              <CardFanItem
                key={item.item.key}
                itemKey={item.item.key}
                cardId={cardId}
                isDropPlaceholder={item.item.isDropPlaceholder}
                x={x}
                y={y}
                size={size}
                cornerRadius={cornerRadius}
                transform={transform}
                canSelect={canSelect}
                enableHoverBorder={enableHoverBorder}
                isSelected={isSelected}
                onHoverCard={onHoverCard}
                onSelectCard={onSelectCard}
                onRemoveCard={cardId && onRemoveCard ? () => onRemoveCard(cardId) : undefined}
                itemIndex={item.index}
                dragMeta={dragMeta}
                placeholderVariant={placeholderVariant}
                emptyPlaceholderVariant={emptyPlaceholderVariant}
              />
            );
          })}
      </svg>
    </div>
  );
}
