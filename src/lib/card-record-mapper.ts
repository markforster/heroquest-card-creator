import { getImageLayerBounds, normalizeLegacyImageScale } from "@/lib/image-scale";
import { normalizeStatAsteriskFlags } from "@/lib/stat-asterisks";
import type { BodyTextStyle, CardDataByTemplate } from "@/types/card-data";
import type { CardRecord } from "@/types/cards-db";
import type { StatAsteriskFlags, StatValue } from "@/types/stats";
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
    name: record.name,
    title: record.title,
    showTitle: record.showTitle ?? true,
    titleStyle: record.titleStyle,
    titleColor: record.titleColor,
    bodyTextColor: record.bodyTextColor,
    bodyTextFitToBounds: record.bodyTextFitToBounds ?? false,
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
        attackDiceAsterisks: normalizeStatAsteriskFlags(record.heroAttackDiceAsterisks),
        defendDice: record.heroDefendDice,
        defendDiceAsterisks: normalizeStatAsteriskFlags(record.heroDefendDiceAsterisks),
        bodyPoints: record.heroBodyPoints,
        bodyPointsAsterisks: normalizeStatAsteriskFlags(record.heroBodyPointsAsterisks),
        mindPoints: record.heroMindPoints,
        mindPointsAsterisks: normalizeStatAsteriskFlags(record.heroMindPointsAsterisks),
      };
      return data as CardDataByTemplate[T];
    }
    case "monster": {
      const data: CardDataByTemplate["monster"] = {
        ...base,
        movementSquares: record.monsterMovementSquares,
        movementSquaresAsterisks: normalizeStatAsteriskFlags(record.monsterMovementSquaresAsterisks),
        attackDice: record.monsterAttackDice,
        attackDiceAsterisks: normalizeStatAsteriskFlags(record.monsterAttackDiceAsterisks),
        defendDice: record.monsterDefendDice,
        defendDiceAsterisks: normalizeStatAsteriskFlags(record.monsterDefendDiceAsterisks),
        bodyPoints: record.monsterBodyPoints,
        bodyPointsAsterisks: normalizeStatAsteriskFlags(record.monsterBodyPointsAsterisks),
        mindPoints: record.monsterMindPoints,
        mindPointsAsterisks: normalizeStatAsteriskFlags(record.monsterMindPointsAsterisks),
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
    case "rules": {
      const data: CardDataByTemplate["rules"] = {
        ...base,
      };
      return data as CardDataByTemplate[T];
    }
    case "hero-back":
    case "logo-back": {
      const data: CardDataByTemplate["logo-back"] = {
        ...base,
        heroBackLogoMode: record.heroBackLogoMode ?? "default",
        heroBackLogoId: record.heroBackLogoId,
        heroBackLogoName: record.heroBackLogoName,
        heroBackLogoOriginalWidth: record.heroBackLogoOriginalWidth,
        heroBackLogoOriginalHeight: record.heroBackLogoOriginalHeight,
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
    bodyTextColor: data.bodyTextColor,
    bodyTextFitToBounds: data.bodyTextFitToBounds,
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
        heroAttackDiceAsterisks: normalizeStatAsteriskFlagsForSave(hero.attackDiceAsterisks),
        heroDefendDice: normalizeStatValueForSave(hero.defendDice),
        heroDefendDiceAsterisks: normalizeStatAsteriskFlagsForSave(hero.defendDiceAsterisks),
        heroBodyPoints: normalizeStatValueForSave(hero.bodyPoints),
        heroBodyPointsAsterisks: normalizeStatAsteriskFlagsForSave(hero.bodyPointsAsterisks),
        heroMindPoints: normalizeStatValueForSave(hero.mindPoints),
        heroMindPointsAsterisks: normalizeStatAsteriskFlagsForSave(hero.mindPointsAsterisks),
      };
    }
    case "monster": {
      const monster = data as CardDataByTemplate["monster"];
      return {
        ...basePatch,
        monsterMovementSquares: normalizeStatValueForSave(monster.movementSquares),
        monsterMovementSquaresAsterisks: normalizeStatAsteriskFlagsForSave(
          monster.movementSquaresAsterisks,
        ),
        monsterAttackDice: normalizeStatValueForSave(monster.attackDice),
        monsterAttackDiceAsterisks: normalizeStatAsteriskFlagsForSave(monster.attackDiceAsterisks),
        monsterDefendDice: normalizeStatValueForSave(monster.defendDice),
        monsterDefendDiceAsterisks: normalizeStatAsteriskFlagsForSave(monster.defendDiceAsterisks),
        monsterBodyPoints: normalizeStatValueForSave(monster.bodyPoints),
        monsterBodyPointsAsterisks: normalizeStatAsteriskFlagsForSave(monster.bodyPointsAsterisks),
        monsterMindPoints: normalizeStatValueForSave(monster.mindPoints),
        monsterMindPointsAsterisks: normalizeStatAsteriskFlagsForSave(monster.mindPointsAsterisks),
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
    case "rules":
    case "labelled-back":
    default:
      return basePatch;
    case "hero-back":
    case "logo-back": {
      const heroBack = data as CardDataByTemplate["logo-back"];
      return {
        ...basePatch,
        heroBackLogoMode: heroBack.heroBackLogoMode,
        heroBackLogoId: heroBack.heroBackLogoId,
        heroBackLogoName: heroBack.heroBackLogoName,
        heroBackLogoOriginalWidth: heroBack.heroBackLogoOriginalWidth,
        heroBackLogoOriginalHeight: heroBack.heroBackLogoOriginalHeight,
      };
    }
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

function normalizeStatAsteriskFlagsForSave(
  flags?: StatAsteriskFlags,
): StatAsteriskFlags | undefined {
  return normalizeStatAsteriskFlags(flags);
}
