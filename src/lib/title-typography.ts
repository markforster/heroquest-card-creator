import { blueprintsByTemplateId } from "@/data/blueprints";
import { layerTypes } from "@/data/card-systems/types";
import type { BlueprintLayer } from "@/types/blueprints";
import type { TemplateId } from "@/types/templates";
import type { TitleTypography } from "@/types/title-typography";

export const DEFAULT_TITLE_TYPOGRAPHY: TitleTypography = "bold";

export function isTitleTypography(value: unknown): value is TitleTypography {
  return value === "bold" || value === "boldItalic";
}

export function getTitleLayerTypographyDefault(layer: BlueprintLayer): TitleTypography {
  const value = layer.props?.titleTypographyDefault;
  return isTitleTypography(value) ? value : DEFAULT_TITLE_TYPOGRAPHY;
}

export function getTemplateTitleTypographyDefault(templateId: TemplateId): TitleTypography {
  const titleLayer = blueprintsByTemplateId[templateId]?.layers.find(
    (layer) => layer.type === layerTypes.title,
  );
  return titleLayer ? getTitleLayerTypographyDefault(titleLayer) : DEFAULT_TITLE_TYPOGRAPHY;
}

export function resolveTitleTypography({
  saved,
  defaultTypography,
}: {
  saved?: TitleTypography;
  defaultTypography: TitleTypography;
}): TitleTypography {
  return saved ?? defaultTypography;
}

export function normalizeTitleTypographyForStorage({
  value,
  defaultTypography,
}: {
  value?: TitleTypography;
  defaultTypography: TitleTypography;
}): TitleTypography | undefined {
  return value && value !== defaultTypography ? value : undefined;
}

export function getAlternateTitleTypography(value: TitleTypography): TitleTypography {
  return value === "boldItalic" ? "bold" : "boldItalic";
}
