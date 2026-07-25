"use client";

import { findPrimaryTitleLayer } from "@/components/BlueprintRenderer/blueprintRendererShared";
import { layoutCardText } from "@/components/Cards/CardParts/CardTextBlock";
import { HERO_STATS_HEIGHT } from "@/components/Cards/CardParts/HeroStatsBlock";
import { MONSTER_STATS_HEIGHT } from "@/components/Cards/CardParts/MonsterStatsBlock";
import { layerTypes } from "@/data/card-systems/types";
import { computeContainScale } from "@/lib/image-scale";
import type { Blueprint, BlueprintGroup, BlueprintLayer } from "@/types/blueprints";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CardPreviewIconOverlayGeometry = {
  frameBounds: Rect;
  centerX: number;
  centerY: number;
  pivotX: number;
  pivotY: number;
  renderedBounds: Rect;
  rotation: number;
  moveBounds: {
    baseCenterX: number;
    baseCenterY: number;
    minCenterX: number;
    maxCenterX: number;
    minCenterY: number;
    maxCenterY: number;
    horizontalTravel: number;
    verticalTravel: number;
  };
};

function getTextHeight(
  child: BlueprintLayer,
  group: BlueprintGroup,
  cardData?: CardDataByTemplate[TemplateId],
) {
  const textKey = child.bind?.textKey;
  const textValue =
    textKey && cardData
      ? ((cardData as Record<string, unknown>)[textKey] as string | null | undefined)
      : undefined;
  const text = typeof textValue === "string" ? textValue : "";
  if (!text.trim()) return null;

  const fontSize = typeof child.props?.fontSize === "number" ? child.props.fontSize : 22;
  const lineHeight =
    typeof child.props?.lineHeight === "number" ? child.props.lineHeight : undefined;
  const fontFamily =
    typeof child.props?.fontFamily === "string" ? child.props.fontFamily : undefined;

  const { lines, totalHeight } = layoutCardText({
    text,
    width: group.width,
    fontSize,
    lineHeight,
    fontFamily,
  });

  if (!lines.length) return null;
  return totalHeight;
}

function getGroupItemHeight(child: BlueprintLayer, group: BlueprintGroup, cardData?: CardDataByTemplate[TemplateId]) {
  if (child.type === layerTypes.text) {
    return getTextHeight(child, group, cardData);
  }

  if (child.type === layerTypes.stats_hero) {
    return typeof child.props?.height === "number" ? child.props.height : HERO_STATS_HEIGHT;
  }

  if (child.type === layerTypes.stats_monster) {
    return typeof child.props?.height === "number" ? child.props.height : MONSTER_STATS_HEIGHT;
  }

  if (child.type === layerTypes.icon) {
    return typeof child.props?.size === "number" ? child.props.size : 140;
  }

  return null;
}

export function resolveMonsterIconOverlayGeometry({
  blueprint,
  cardData,
  imageWidth,
  imageHeight,
}: {
  blueprint: Blueprint;
  cardData?: CardDataByTemplate[TemplateId];
  imageWidth?: number | null;
  imageHeight?: number | null;
}) {
  const groups = blueprint.groups ?? [];

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    if (group.type !== "stack" || group.anchor !== "bottom" || group.direction !== "up") {
      continue;
    }

    let cursor = group.origin.y;

    for (let childIndex = 0; childIndex < group.children.length; childIndex += 1) {
      const child = group.children[childIndex];
      const height = getGroupItemHeight(child, group, cardData);
      if (height == null) {
        continue;
      }

      const topY = cursor - height;
      cursor = topY - group.gap;

      if (child.type !== layerTypes.icon) {
        continue;
      }

      const iconKey = child.bind?.iconKey;
      const iconAssetId =
        iconKey && cardData
          ? ((cardData as Record<string, unknown>)[iconKey] as string | null | undefined)
          : undefined;
      if (!iconAssetId) {
        return null;
      }

      const size = typeof child.props?.size === "number" ? child.props.size : 140;
      const offsetX = typeof child.props?.offsetX === "number" ? child.props.offsetX : 0;
      const offsetY = typeof child.props?.offsetY === "number" ? child.props.offsetY : 0;
      const normalizedOffsetX =
        typeof (cardData as Record<string, unknown>)?.iconOffsetX === "number"
          ? Number((cardData as Record<string, unknown>).iconOffsetX)
          : 0;
      const normalizedOffsetY =
        typeof (cardData as Record<string, unknown>)?.iconOffsetY === "number"
          ? Number((cardData as Record<string, unknown>).iconOffsetY)
          : 0;
      const iconScale =
        typeof (cardData as Record<string, unknown>)?.iconScale === "number"
          ? Number((cardData as Record<string, unknown>).iconScale)
          : 1;
      const iconRotation =
        typeof (cardData as Record<string, unknown>)?.iconRotation === "number"
          ? Number((cardData as Record<string, unknown>).iconRotation)
          : 0;

      const baseX = group.origin.x + offsetX;
      const baseTop = topY + offsetY;
      const canvasWidth = blueprint.canvas?.width ?? 750;
      const rightInset = baseX;
      const rightEdgeTarget = canvasWidth - rightInset;
      const titleLayer = findPrimaryTitleLayer(blueprint);
      const ribbonY = typeof titleLayer?.props?.ribbonY === "number" ? titleLayer.props.ribbonY : 0;
      const ribbonHeight =
        typeof titleLayer?.props?.ribbonHeight === "number" ? titleLayer.props.ribbonHeight : 0;
      const ribbonBottom = ribbonY + ribbonHeight;
      const verticalTarget = ribbonBottom + 8;

      const horizontalTravel = Math.max(0, rightEdgeTarget - size - baseX);
      const x = baseX + normalizedOffsetX * horizontalTravel;
      const verticalTravel = Math.max(0, baseTop - verticalTarget);
      const y = baseTop - normalizedOffsetY * verticalTravel;

      const slotBounds = { x, y, width: size, height: size };
      const fitScale = computeContainScale(slotBounds, imageWidth ?? undefined, imageHeight ?? undefined);
      const baseRenderedWidth = (imageWidth ?? size) * fitScale;
      const baseRenderedHeight = (imageHeight ?? size) * fitScale;
      const renderedWidth = baseRenderedWidth * iconScale;
      const renderedHeight = baseRenderedHeight * iconScale;
      const renderedBounds =
        imageWidth && imageHeight
          ? {
              x: x + size / 2 - renderedWidth / 2,
              y: y + size / 2 - renderedHeight / 2,
              width: renderedWidth,
              height: renderedHeight,
            }
          : slotBounds;
      const pivotX = x + size / 2;
      const pivotY = y + size / 2;

      return {
        frameBounds: renderedBounds,
        centerX: renderedBounds.x + renderedBounds.width / 2,
        centerY: renderedBounds.y + renderedBounds.height / 2,
        pivotX,
        pivotY,
        renderedBounds,
        rotation: iconRotation,
        moveBounds: {
          baseCenterX: baseX + size / 2,
          baseCenterY: baseTop + size / 2,
          minCenterX: baseX + size / 2,
          maxCenterX: baseX + size / 2 + horizontalTravel,
          minCenterY: baseTop + size / 2 - verticalTravel,
          maxCenterY: baseTop + size / 2,
          horizontalTravel,
          verticalTravel,
        },
      } satisfies CardPreviewIconOverlayGeometry;
    }
  }

  return null;
}
