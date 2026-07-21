"use client";

import { padBounds } from "@/components/Cards/CardEditor/EditorTargetHoverVisual";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import { computeContainScale } from "@/lib/image-scale";
import type { Blueprint, BlueprintLayer } from "@/types/blueprints";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import { getLayerBounds } from "./blueprintRendererShared";

const IMAGE_HOVER_EDGE_INSET = 18;
const TREASURE_HOVER_OUTSET = 16;
const CANVAS_IMAGE_HOVER_OUTSET = 16;

function intersectRect(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  const left = Math.max(first.x, second.x);
  const top = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);

  if (right <= left || bottom <= top) return null;

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function getRotatedRectBounds({
  bounds,
  rotation,
  cx,
  cy,
}: {
  bounds: { x: number; y: number; width: number; height: number };
  rotation: number;
  cx: number;
  cy: number;
}) {
  if (rotation === 0) return bounds;

  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ].map((corner) => {
    const translatedX = corner.x - cx;
    const translatedY = corner.y - cy;
    return {
      x: cx + translatedX * cos - translatedY * sin,
      y: cy + translatedX * sin + translatedY * cos,
    };
  });

  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function buildImageHoverBounds({
  clipMode,
  layerBounds,
  renderedBounds,
  canvasBounds,
}: {
  clipMode: "bounds" | "canvas" | "none";
  layerBounds: { x: number; y: number; width: number; height: number };
  renderedBounds: { x: number; y: number; width: number; height: number } | null;
  canvasBounds: { x: number; y: number; width: number; height: number };
}) {
  if (clipMode !== "canvas" || !renderedBounds) {
    const baseBounds = {
      x: layerBounds.x,
      y: layerBounds.y,
      width: layerBounds.width,
      height: layerBounds.height,
    };
    return clipMode === "bounds" ? padBounds(baseBounds, TREASURE_HOVER_OUTSET) : baseBounds;
  }

  const visibleBounds = intersectRect(renderedBounds, canvasBounds);
  if (!visibleBounds) return null;

  const minLeft = canvasBounds.x + IMAGE_HOVER_EDGE_INSET;
  const minTop = canvasBounds.y + IMAGE_HOVER_EDGE_INSET;
  const maxRight = canvasBounds.x + canvasBounds.width - IMAGE_HOVER_EDGE_INSET;
  const maxBottom = canvasBounds.y + canvasBounds.height - IMAGE_HOVER_EDGE_INSET;
  const left = Math.max(visibleBounds.x - CANVAS_IMAGE_HOVER_OUTSET, minLeft);
  const top = Math.max(visibleBounds.y - CANVAS_IMAGE_HOVER_OUTSET, minTop);
  const right = Math.min(
    visibleBounds.x + visibleBounds.width + CANVAS_IMAGE_HOVER_OUTSET,
    maxRight,
  );
  const bottom = Math.min(
    visibleBounds.y + visibleBounds.height + CANVAS_IMAGE_HOVER_OUTSET,
    maxBottom,
  );

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export function resolveImageLayerHoverBounds({
  blueprint,
  layer,
  cardData,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  cardData?: CardDataByTemplate[TemplateId];
}) {
  if (layer.type !== "image") return null;

  const bounds = getLayerBounds(blueprint, layer);
  const clipMode = layer.clip ?? "bounds";
  const canvasBounds = {
    x: 0,
    y: 0,
    width: blueprint.canvas?.width ?? CARD_WIDTH,
    height: blueprint.canvas?.height ?? CARD_HEIGHT,
  };
  const hasImageBinding = !!layer.bind?.imageKey;
  const hasRenderInputs = hasImageBinding && !!cardData;

  if (!hasRenderInputs) {
    return buildImageHoverBounds({
      clipMode,
      layerBounds: bounds,
      renderedBounds: null,
      canvasBounds,
    });
  }

  const data = cardData as {
    imageScale?: number;
    imageScaleMode?: "absolute" | "relative";
    imageOffsetX?: number;
    imageOffsetY?: number;
    imageRotation?: number;
    imageOriginalWidth?: number;
    imageOriginalHeight?: number;
  };
  const scale = data.imageScale ?? 1;
  const scaleMode = data.imageScaleMode ?? "relative";
  const offsetX = data.imageOffsetX ?? 0;
  const offsetY = data.imageOffsetY ?? 0;
  const rotation = data.imageRotation ?? 0;
  const layerOffsetX = typeof layer.props?.offsetX === "number" ? layer.props.offsetX : 0;
  const layerOffsetY = typeof layer.props?.offsetY === "number" ? layer.props.offsetY : 0;
  const baseWidth = data.imageOriginalWidth ?? bounds.width;
  const baseHeight = data.imageOriginalHeight ?? bounds.height;
  const fitScale = computeContainScale(bounds, baseWidth, baseHeight);
  const effectiveScale = scaleMode === "relative" ? fitScale * scale : scale;
  const scaledWidth = baseWidth * effectiveScale;
  const scaledHeight = baseHeight * effectiveScale;
  const x = bounds.x + (bounds.width - scaledWidth) / 2 + offsetX + layerOffsetX;
  const y = bounds.y + (bounds.height - scaledHeight) / 2 + offsetY + layerOffsetY;
  const cx = x + scaledWidth / 2;
  const cy = y + scaledHeight / 2;

  return buildImageHoverBounds({
    clipMode,
    layerBounds: bounds,
    renderedBounds: getRotatedRectBounds({
      bounds: {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      },
      rotation,
      cx,
      cy,
    }),
    canvasBounds,
  });
}

export function resolveImageLayerOverlayGeometry({
  blueprint,
  layer,
  cardData,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  cardData?: CardDataByTemplate[TemplateId];
}) {
  const frameBounds = resolveImageLayerHoverBounds({ blueprint, layer, cardData });
  if (!frameBounds) return null;

  const centerX = frameBounds.x + frameBounds.width / 2;
  const centerY = frameBounds.y + frameBounds.height / 2;
  const rotation =
    (cardData as { imageRotation?: number } | undefined)?.imageRotation ?? 0;

  return {
    frameBounds,
    centerX,
    centerY,
    rotation,
  };
}
