import { blueprintsByTemplateId } from "@/data/blueprints";
import type { BlueprintBounds } from "@/types/blueprints";
import type { TemplateId } from "@/types/templates";

export const LEGACY_ABSOLUTE_IMAGE_SCALE_MIN = 0.2;
export const LEGACY_ABSOLUTE_IMAGE_SCALE_MAX = 3;
export const CARD_CANVAS_WIDTH = 750;
export const CARD_CANVAS_HEIGHT = 1050;
export const UI_ZOOM_MIN = 0.5;
export const UI_ZOOM_FIT = 1;
export const UI_ZOOM_MAX = 4;
export const UI_ZOOM_SLIDER_STEP = 0.01;
export const UI_ZOOM_BUTTON_STEP = 0.05;
export const IMAGE_SCALE_SLIDER_THUMB_SIZE_PX = 12;

export type ImageZoomModel = {
  relativeMin: number;
  relativeCover: number;
  relativeMax: number;
  uiMin: number;
  uiFit: number;
  uiMax: number;
};

type NormalizeLegacyImageScaleInput = {
  imageScale?: number;
  imageScaleMode?: "absolute" | "relative";
  bounds?: BlueprintBounds;
  imageWidth?: number;
  imageHeight?: number;
};

export function normalizeLegacyImageScale({
  imageScale,
  imageScaleMode,
  bounds,
  imageWidth,
  imageHeight,
}: NormalizeLegacyImageScaleInput): { imageScale?: number; imageScaleMode?: "absolute" | "relative" } {
  if (imageScaleMode) {
    return { imageScale, imageScaleMode };
  }
  if (imageScale == null) {
    return { imageScale, imageScaleMode: "relative" };
  }
  const hasValidDimensions =
    Number.isFinite(imageWidth) &&
    Number.isFinite(imageHeight) &&
    (imageWidth ?? 0) > 0 &&
    (imageHeight ?? 0) > 0;
  if (!hasValidDimensions) {
    // Legacy fallback: preserve absolute behavior until reliable dimensions are known.
    return { imageScale, imageScaleMode: "absolute" };
  }
  const containScale = computeContainScale(bounds, imageWidth, imageHeight);
  if (!Number.isFinite(containScale) || containScale <= 0) {
    return { imageScale, imageScaleMode: "absolute" };
  }
  return { imageScale: imageScale / containScale, imageScaleMode: "relative" };
}

export function getImageLayerBounds(
  templateId?: TemplateId,
  imageKey: string = "imageAssetId",
): BlueprintBounds | undefined {
  if (!templateId) return undefined;
  const blueprint = blueprintsByTemplateId[templateId];
  if (!blueprint) return undefined;
  const layer = blueprint.layers?.find(
    (entry) => entry.type === "image" && entry.bind?.imageKey === imageKey,
  );
  return layer?.bounds ?? undefined;
}

export function computeContainScale(
  bounds: BlueprintBounds | undefined,
  imageWidth?: number,
  imageHeight?: number,
): number {
  if (!bounds) return 1;
  if (!imageWidth || !imageHeight) return 1;
  if (imageWidth <= 0 || imageHeight <= 0) return 1;
  const scaleX = bounds.width / imageWidth;
  const scaleY = bounds.height / imageHeight;
  return Math.min(scaleX, scaleY);
}

export function computeRelativeScaleBounds(
  bounds: BlueprintBounds | undefined,
  imageWidth?: number,
  imageHeight?: number,
): { min: number; max: number; containScale: number } {
  const containScale = computeContainScale(bounds, imageWidth, imageHeight);
  if (!Number.isFinite(containScale) || containScale <= 0) {
    return {
      min: LEGACY_ABSOLUTE_IMAGE_SCALE_MIN,
      max: LEGACY_ABSOLUTE_IMAGE_SCALE_MAX,
      containScale: 1,
    };
  }

  return {
    min: LEGACY_ABSOLUTE_IMAGE_SCALE_MIN / containScale,
    max: LEGACY_ABSOLUTE_IMAGE_SCALE_MAX / containScale,
    containScale,
  };
}

export function computeRelativeScaleForCanvasCover(
  bounds: BlueprintBounds | undefined,
  imageWidth?: number,
  imageHeight?: number,
  canvasWidth: number = CARD_CANVAS_WIDTH,
  canvasHeight: number = CARD_CANVAS_HEIGHT,
): number {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return 1;
  const containScale = computeContainScale(bounds, imageWidth, imageHeight);
  const sourceWidth = imageWidth && imageWidth > 0 ? imageWidth : bounds.width;
  const sourceHeight = imageHeight && imageHeight > 0 ? imageHeight : bounds.height;
  const fittedWidth = sourceWidth * containScale;
  const fittedHeight = sourceHeight * containScale;
  if (!Number.isFinite(fittedWidth) || !Number.isFinite(fittedHeight) || fittedWidth <= 0 || fittedHeight <= 0) {
    const fallback = Math.max(canvasWidth / bounds.width, canvasHeight / bounds.height);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 1;
  }
  return Math.max(canvasWidth / fittedWidth, canvasHeight / fittedHeight);
}

export function computeCoverScale(
  bounds: BlueprintBounds | undefined,
  imageWidth?: number,
  imageHeight?: number,
  canvasWidth: number = CARD_CANVAS_WIDTH,
  canvasHeight: number = CARD_CANVAS_HEIGHT,
): number {
  return computeRelativeScaleForCanvasCover(bounds, imageWidth, imageHeight, canvasWidth, canvasHeight);
}

export function computeImageZoomModel(
  bounds: BlueprintBounds | undefined,
  imageWidth?: number,
  imageHeight?: number,
): ImageZoomModel {
  const relativeBounds = computeRelativeScaleBounds(bounds, imageWidth, imageHeight);
  const relativeMin = LEGACY_ABSOLUTE_IMAGE_SCALE_MIN;
  const relativeCover = Math.max(1, computeCoverScale(bounds, imageWidth, imageHeight));
  const relativeMax = Math.max(relativeBounds.max, relativeCover, UI_ZOOM_MAX, 1);
  return {
    relativeMin,
    relativeCover,
    relativeMax,
    uiMin: UI_ZOOM_MIN,
    uiFit: UI_ZOOM_FIT,
    uiMax: Math.max(UI_ZOOM_MAX, relativeCover, relativeBounds.max),
  };
}

export function mapUiZoomToRelativeScale(uiZoom: number, model: ImageZoomModel): number {
  return clamp(uiZoom, model.uiMin, model.uiMax);
}

export function mapRelativeScaleToUiZoom(relativeScale: number, model: ImageZoomModel): number {
  return clamp(relativeScale, model.uiMin, model.uiMax);
}

export function computeSliderTickLeftPx(
  value: number,
  min: number,
  max: number,
  sliderWidthPx: number,
  thumbSizePx: number = IMAGE_SCALE_SLIDER_THUMB_SIZE_PX,
): number {
  if (!Number.isFinite(sliderWidthPx) || sliderWidthPx <= 0) {
    return thumbSizePx / 2;
  }
  const clampedValue = clamp(value, min, max);
  const t = max > min ? clamp((clampedValue - min) / (max - min), 0, 1) : 0;
  const travel = Math.max(0, sliderWidthPx - thumbSizePx);
  return thumbSizePx / 2 + t * travel;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
