import type { AssetUsageBounds } from "@/components/Assets/AssetsRoutePanels.types";
import { blueprintsByTemplateId } from "@/data/blueprints";
import type { Blueprint, BlueprintBounds } from "@/types/blueprints";
import type { TemplateId } from "@/types/templates";

export function getImageLayerBounds(blueprint: Blueprint | undefined): BlueprintBounds | null {
  if (!blueprint) return null;
  const candidates = blueprint.layers.filter(
    (layer) => layer.type === "image" && layer.bind?.imageKey === "imageAssetId",
  );
  if (candidates.length === 0) return null;
  const layerBounds = candidates.find((layer) => layer.bounds)?.bounds ?? null;
  if (layerBounds) return layerBounds;
  return {
    x: 0,
    y: 0,
    width: blueprint.canvas.width,
    height: blueprint.canvas.height,
  };
}

export function getIconLayerBounds(blueprint: Blueprint | undefined): BlueprintBounds | null {
  if (!blueprint?.groups) return null;
  for (const group of blueprint.groups) {
    for (const child of group.children ?? []) {
      if (child.type !== "icon") continue;
      if (child.bind?.iconKey !== "iconAssetId") continue;
      const size = typeof child.props?.size === "number" ? child.props.size : 140;
      return { x: 0, y: 0, width: size, height: size };
    }
  }
  return null;
}

export function getUsageBoundsForTemplate(
  templateId: TemplateId,
  usageType: "image" | "icon",
): AssetUsageBounds | null {
  const blueprint = blueprintsByTemplateId[templateId];
  if (!blueprint) return null;
  const bounds =
    usageType === "image" ? getImageLayerBounds(blueprint) : getIconLayerBounds(blueprint);
  if (!bounds) return null;
  return { width: bounds.width, height: bounds.height };
}
