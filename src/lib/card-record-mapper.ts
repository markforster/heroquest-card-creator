import { getImageLayerBounds, normalizeLegacyImageScale } from "@/lib/image-scale";
import type { BodyTextStyle, CardDataByTemplate } from "@/types/card-data";
import type { CardRecord } from "@/types/cards-db";
import type { StatValue } from "@/types/stats";
import type { TemplateId } from "@/types/templates";

function normalizeImageScale(
  record: CardRecord & { templateId: TemplateId },
): { imageScale?: number; imageScaleMode?: "absolute" | "relative" } {
  const bounds = getImageLayerBounds(record.templateId, "imageAssetId");
  return normalizeLegacyImageScale({
    imageScale: record.imageScale,
    imageScaleMode: record.imageScaleMode,
    bounds,
    imageWidth: record.imageOriginalWidth,
    imageHeight: record.imageOriginalHeight,
  });
}

export function cardRecordToCardData<T extends TemplateId>(
  record: CardRecord & { templateId: T },
): CardDataByTemplate[T] {
  const normalizedScale = normalizeImageScale(record as CardRecord & { templateId: TemplateId });
  const base = {
    title: record.title,
    showTitle: record.showTitle ?? true,
    titleStyle: record.titleStyle,
    titleColor: record.titleColor,
    titlePlacement: record.titlePlacement,
    bodyTextStyle: record.bodyTextStyle,
    face: record.face,
    description: record.description,
    copyright: record.copyright,
    copyrightColor: record.copyrightColor,
    showCopyright: record.showCopyright,
    imageAssetId: record.imageAssetId,
    imageAssetName: record.imageAssetName,
    imageScale: normalizedScale.imageScale,
    imageScaleMode: normalizedScale.imageScaleMode,
    imageOffsetX: record.imageOffsetX,
    imageOffsetY: record.imageOffsetY,
    imageRotation: record.imageRotation,
    imageOriginalWidth: record.imageOriginalWidth,
    imageOriginalHeight: record.imageOriginalHeight,
    borderColor: record.borderColor,
    backgroundTint: record.backgroundTint,
  };

  switch (record.templateId) {
    case "hero": {
      const data: CardDataByTemplate["hero"] = {
        ...base,
        attackDice: record.heroAttackDice,
        defendDice: record.heroDefendDice,
        bodyPoints: record.heroBodyPoints,
        mindPoints: record.heroMindPoints,
      };
      return data as CardDataByTemplate[T];
    }
    case "monster": {
      const data: CardDataByTemplate["monster"] = {
        ...base,
        movementSquares: record.monsterMovementSquares,
        attackDice: record.monsterAttackDice,
        defendDice: record.monsterDefendDice,
        bodyPoints: record.monsterBodyPoints,
        mindPoints: record.monsterMindPoints,
        iconAssetId: record.monsterIconAssetId,
        iconAssetName: record.monsterIconAssetName,
        iconOffsetX: record.monsterIconOffsetX,
        iconOffsetY: record.monsterIconOffsetY,
        iconScale: record.monsterIconScale,
        iconRotation: record.monsterIconRotation,
      };
      return data as CardDataByTemplate[T];
    }
    case "large-treasure": {
      const data: CardDataByTemplate["large-treasure"] = {
        ...base,
      };
      return data as CardDataByTemplate[T];
    }
    case "small-treasure": {
      const data: CardDataByTemplate["small-treasure"] = {
        ...base,
      };
      return data as CardDataByTemplate[T];
    }
    case "hero-back": {
      const data: CardDataByTemplate["hero-back"] = {
        ...base,
      };
      return data as CardDataByTemplate[T];
    }
    case "labelled-back": {
      const data: CardDataByTemplate["labelled-back"] = {
        ...base,
      };
      return data as CardDataByTemplate[T];
    }
    default: {
      // Fallback for unexpected template ids; return base fields only.
      return base as CardDataByTemplate[T];
    }
  }
}

export function cardDataToCardRecordPatch<T extends TemplateId>(
  templateId: T,
  name: string,
  data: CardDataByTemplate[T],
): Partial<CardRecord> {
  const face = data.face;
  const basePatch: Partial<CardRecord> = {
    templateId,
    name,
    title: data.title,
    showTitle: data.showTitle,
    titleStyle: data.titleStyle,
    titleColor: data.titleColor,
    titlePlacement: (data as { titlePlacement?: "top" | "bottom" }).titlePlacement,
    bodyTextStyle: (data as { bodyTextStyle?: BodyTextStyle }).bodyTextStyle,
    face,
    description: data.description,
    copyright: data.copyright,
    copyrightColor: data.copyrightColor,
    showCopyright: data.showCopyright,
    imageAssetId: data.imageAssetId,
    imageAssetName: data.imageAssetName,
    imageScale: data.imageScale,
    imageScaleMode: data.imageScaleMode,
    imageOffsetX: data.imageOffsetX,
    imageOffsetY: data.imageOffsetY,
    imageRotation: data.imageRotation,
    imageOriginalWidth: data.imageOriginalWidth,
    imageOriginalHeight: data.imageOriginalHeight,
    borderColor: data.borderColor,
    backgroundTint: data.backgroundTint,
  };

  switch (templateId) {
    case "hero": {
      const hero = data as CardDataByTemplate["hero"];
      return {
        ...basePatch,
        heroAttackDice: normalizeStatValueForSave(hero.attackDice),
        heroDefendDice: normalizeStatValueForSave(hero.defendDice),
        heroBodyPoints: normalizeStatValueForSave(hero.bodyPoints),
        heroMindPoints: normalizeStatValueForSave(hero.mindPoints),
      };
    }
    case "monster": {
      const monster = data as CardDataByTemplate["monster"];
      return {
        ...basePatch,
        monsterMovementSquares: normalizeStatValueForSave(monster.movementSquares),
        monsterAttackDice: normalizeStatValueForSave(monster.attackDice),
        monsterDefendDice: normalizeStatValueForSave(monster.defendDice),
        monsterBodyPoints: normalizeStatValueForSave(monster.bodyPoints),
        monsterMindPoints: normalizeStatValueForSave(monster.mindPoints),
        monsterIconAssetId: monster.iconAssetId,
        monsterIconAssetName: monster.iconAssetName,
        monsterIconOffsetX: monster.iconOffsetX,
        monsterIconOffsetY: monster.iconOffsetY,
        monsterIconScale: monster.iconScale,
        monsterIconRotation: monster.iconRotation,
      };
    }
    case "large-treasure":
    case "small-treasure":
    case "hero-back":
    case "labelled-back":
    default:
      return basePatch;
  }
}

function normalizeStatValueForSave(value?: StatValue): StatValue | undefined {
  if (value == null) return value;
  if (Array.isArray(value)) {
    if (value.length === 2) {
      const [primary, secondary] = value;
      return [primary, secondary, 1];
    }
    if (value.length >= 3) {
      const [primary, secondary, splitFlag, splitFormat] = value as [
        number,
        number,
        0 | 1,
        string | undefined,
      ];
      if (splitFormat) {
        return [
          primary,
          secondary,
          splitFlag,
          splitFormat as "slash" | "paren" | "paren-leading",
        ];
      }
      return [primary, secondary, splitFlag];
    }
  }
  return [value as number, 0, 0];
}
