import { blueprintsByTemplateId } from "@/data/blueprints";
import { layerTypes } from "@/data/card-systems/types";
import type {
  Blueprint,
  BlueprintLayer,
  BlueprintTextLayoutMode,
} from "@/types/blueprints";
import type { TemplateId } from "@/types/templates";

function isDescriptionTextLayer(layer: BlueprintLayer): boolean {
  return layer.type === layerTypes.text && layer.bind?.textKey === "description";
}

function findDescriptionTextEntry(blueprint: Blueprint | undefined): BlueprintLayer | undefined {
  if (!blueprint) return undefined;

  const layerMatch = blueprint.layers.find(isDescriptionTextLayer);
  if (layerMatch) return layerMatch;

  const groups = blueprint.groups ?? [];
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const childMatch = groups[groupIndex].children.find(isDescriptionTextLayer);
    if (childMatch) return childMatch;
  }

  return undefined;
}

export function resolveBlueprintTextLayoutMode(
  layer: Pick<BlueprintLayer, "props"> | undefined,
): BlueprintTextLayoutMode {
  return layer?.props?.textLayoutMode === "auto-height" ? "auto-height" : "fixed-bounds";
}

export function supportsBlueprintTextFitToBounds(
  layer: Pick<BlueprintLayer, "props"> | undefined,
): boolean {
  return resolveBlueprintTextLayoutMode(layer) === "fixed-bounds";
}

export function descriptionSupportsBodyTextFitToBounds(templateId?: TemplateId): boolean {
  if (!templateId) return false;
  return supportsBlueprintTextFitToBounds(findDescriptionTextEntry(blueprintsByTemplateId[templateId]));
}
