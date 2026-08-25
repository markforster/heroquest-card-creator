import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import { blueprintsByTemplateId } from "@/data/blueprints";
import { layerTypes } from "@/data/card-systems/types";
import { clamp } from "@/lib/math";
import type { Blueprint, BlueprintBounds, BlueprintLayer } from "@/types/blueprints";
import {
  IMAGE_CLIP_EDGE_BOTTOM,
  type ImageClipEdgeControlSettings,
} from "@/types/image-clip-edges";
import type { TemplateId } from "@/types/templates";

const MINIMUM_CLIP_HEIGHT = 24;
type BlueprintImageLayer = Extract<BlueprintLayer, { type: "image" }>;

type ClipEdgeCardState = {
  imageClipEdgeMask?: number;
  imageClipBottom?: number;
};

function getBlueprintLayerBounds(blueprint: Blueprint, layer: BlueprintLayer): BlueprintBounds {
  return (
    layer.bounds ?? {
      x: 0,
      y: 0,
      width: blueprint.canvas?.width ?? CARD_WIDTH,
      height: blueprint.canvas?.height ?? CARD_HEIGHT,
    }
  );
}

export function supportsImageClipEdge(mask: number | undefined, edge: number): boolean {
  return ((mask ?? 0) & edge) === edge;
}

export function isImageClipEdgeActive({
  supportedMask,
  activeMask,
  edge,
}: {
  supportedMask?: number;
  activeMask?: number;
  edge: number;
}): boolean {
  return supportsImageClipEdge(supportedMask, edge) && supportsImageClipEdge(activeMask, edge);
}

export function getBaseImageClipBounds({
  blueprint,
  layer,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
}): BlueprintBounds | null {
  if (layer.type !== "image") return null;

  const imageLayer = layer as BlueprintImageLayer;
  const bounds = getBlueprintLayerBounds(blueprint, layer);
  const clipMode = imageLayer.clip ?? "bounds";
  if (clipMode === "none") return null;
  if (clipMode === "canvas") {
    return {
      x: 0,
      y: 0,
      width: blueprint.canvas?.width ?? CARD_WIDTH,
      height: blueprint.canvas?.height ?? CARD_HEIGHT,
    };
  }
  return bounds;
}

export function resolveImageClipBottomRange({
  layer,
  baseClipBounds,
}: {
  layer: BlueprintImageLayer;
  baseClipBounds: BlueprintBounds;
}): { min: number; max: number; defaultValue: number } {
  const baseBottom = baseClipBounds.y + baseClipBounds.height;
  const authoredMax =
    typeof layer.adjustableClipBottomMax === "number" ? layer.adjustableClipBottomMax : baseBottom;
  const max = clamp(authoredMax, baseClipBounds.y + MINIMUM_CLIP_HEIGHT, baseBottom);
  const authoredMin =
    typeof layer.adjustableClipBottomMin === "number"
      ? layer.adjustableClipBottomMin
      : baseClipBounds.y + MINIMUM_CLIP_HEIGHT;
  const min = clamp(authoredMin, baseClipBounds.y + MINIMUM_CLIP_HEIGHT, max);
  const authoredDefault =
    typeof layer.adjustableClipBottomDefault === "number"
      ? layer.adjustableClipBottomDefault
      : (layer.bounds?.y ?? baseClipBounds.y) + (layer.bounds?.height ?? baseClipBounds.height);

  return {
    min,
    max,
    defaultValue: clamp(authoredDefault, min, max),
  };
}

export function getImageLayerClipEdgeSettings(
  templateId?: TemplateId,
  imageKey: string = "imageAssetId",
): ImageClipEdgeControlSettings | undefined {
  if (!templateId) return undefined;
  const blueprint = blueprintsByTemplateId[templateId];
  if (!blueprint) return undefined;
  const layer = blueprint.layers.find(
    (entry): entry is BlueprintImageLayer =>
      entry.type === layerTypes.image && entry.bind?.imageKey === imageKey,
  );
  if (!layer || !supportsImageClipEdge(layer.adjustableClipEdgeMask, IMAGE_CLIP_EDGE_BOTTOM)) {
    return undefined;
  }

  const baseClipBounds = getBaseImageClipBounds({ blueprint, layer });
  if (!baseClipBounds) return undefined;

  const range = resolveImageClipBottomRange({ layer, baseClipBounds });
  return {
    adjustableClipEdgeMask: layer.adjustableClipEdgeMask ?? 0,
    bottomMin: range.min,
    bottomMax: range.max,
    bottomDefault: range.defaultValue,
    baseClipBounds,
  };
}

export function resolveImageClipBottomValue({
  value,
  settings,
}: {
  value?: number;
  settings: ImageClipEdgeControlSettings;
}): number {
  return clamp(value ?? settings.bottomDefault, settings.bottomMin, settings.bottomMax);
}

export function resolveImageLayerClipBounds({
  blueprint,
  layer,
  cardState,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  cardState?: ClipEdgeCardState;
}): BlueprintBounds | null {
  const baseClipBounds = getBaseImageClipBounds({ blueprint, layer });
  if (!baseClipBounds || layer.type !== "image") return baseClipBounds;
  const imageLayer = layer as BlueprintImageLayer;

  if (
    !isImageClipEdgeActive({
      supportedMask: imageLayer.adjustableClipEdgeMask,
      activeMask: cardState?.imageClipEdgeMask,
      edge: IMAGE_CLIP_EDGE_BOTTOM,
    })
  ) {
    return baseClipBounds;
  }

  const range = resolveImageClipBottomRange({ layer: imageLayer, baseClipBounds });
  const bottom = clamp(cardState?.imageClipBottom ?? range.defaultValue, range.min, range.max);

  return {
    ...baseClipBounds,
    height: Math.max(MINIMUM_CLIP_HEIGHT, bottom - baseClipBounds.y),
  };
}
