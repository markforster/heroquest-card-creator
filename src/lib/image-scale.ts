import { blueprintsByTemplateId } from "@/data/blueprints";
import type { BlueprintBounds } from "@/types/blueprints";
import type { TemplateId } from "@/types/templates";

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
