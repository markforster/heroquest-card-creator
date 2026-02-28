import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

export function collectCardAssetIds(
  cardData?: CardDataByTemplate[TemplateId] | null,
): string[] {
  if (!cardData) return [];
  const ids: string[] = [];
  if (typeof cardData.imageAssetId === "string" && cardData.imageAssetId) {
    ids.push(cardData.imageAssetId);
  }
  const iconAssetId = (cardData as { iconAssetId?: string }).iconAssetId;
  if (typeof iconAssetId === "string" && iconAssetId) {
    ids.push(iconAssetId);
  }
  return ids;
}
