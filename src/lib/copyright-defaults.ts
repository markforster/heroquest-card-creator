import { blueprintsByTemplateId } from "@/data/blueprints";
import type { CardDataByTemplate } from "@/types/card-data";
import { TEMPLATE_IDS, type TemplateId } from "@/types/templates";

export type CopyrightTemplateDefaults = Partial<Record<TemplateId, boolean>>;

export function normalizeCopyrightTemplateDefaults(value: unknown): CopyrightTemplateDefaults {
  if (!value || typeof value !== "object") {
    return {};
  }

  const result: CopyrightTemplateDefaults = {};
  for (let index = 0; index < TEMPLATE_IDS.length; index += 1) {
    const templateId = TEMPLATE_IDS[index];
    const candidate = (value as Record<string, unknown>)[templateId];
    if (typeof candidate === "boolean") {
      result[templateId] = candidate;
    }
  }

  return result;
}

export function getBlueprintCopyrightLayer(templateId: TemplateId) {
  return blueprintsByTemplateId[templateId]?.layers.find((layer) => layer.type === "copyright");
}

export function getBlueprintCopyrightDefaultVisible(templateId: TemplateId): boolean {
  const layer = getBlueprintCopyrightLayer(templateId);
  return Boolean(layer?.props?.defaultVisible);
}

export function resolveTemplateCopyrightDefault(
  templateId: TemplateId,
  userDefaults: CopyrightTemplateDefaults,
): boolean {
  if (typeof userDefaults[templateId] === "boolean") {
    return Boolean(userDefaults[templateId]);
  }

  return getBlueprintCopyrightDefaultVisible(templateId);
}

export function resolveCardCopyrightText(
  cardData: Record<string, unknown> | null | undefined,
  defaultCopyright: string,
  textKey: string = "copyright",
): string {
  const overrideValue =
    textKey && cardData ? (cardData[textKey] as string | null | undefined) : undefined;
  const normalizedOverride = typeof overrideValue === "string" ? overrideValue.trim() : "";
  const normalizedDefault = defaultCopyright.trim();

  if (normalizedOverride.length > 0) {
    return normalizedOverride;
  }

  if (normalizedDefault.length > 0) {
    return normalizedDefault;
  }

  return "";
}

export function getCopyrightLayerRotation(
  layer: { props?: Record<string, string | number | boolean> } | undefined,
): -90 | 0 | 90 {
  const rotation = layer?.props?.rotation;
  if (rotation === -90 || rotation === 90) {
    return rotation;
  }
  return 0;
}

export function getCardShowCopyrightValue(
  cardData: CardDataByTemplate[TemplateId] | Record<string, unknown> | null | undefined,
): boolean | undefined {
  const value = cardData ? (cardData as { showCopyright?: boolean }).showCopyright : undefined;
  return typeof value === "boolean" ? value : undefined;
}
