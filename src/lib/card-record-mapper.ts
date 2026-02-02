import type { CardDataByTemplate } from "@/types/card-data";
import type { CardRecord } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";

export function cardRecordToCardData<T extends TemplateId>(
  record: CardRecord & { templateId: T },
): CardDataByTemplate[T] {
  const base = {
    title: record.title,
    description: record.description,
    imageAssetId: record.imageAssetId,
    imageAssetName: record.imageAssetName,
    imageScale: record.imageScale,
    imageOffsetX: record.imageOffsetX,
    imageOffsetY: record.imageOffsetY,
    imageOriginalWidth: record.imageOriginalWidth,
    imageOriginalHeight: record.imageOriginalHeight,
    borderColor: record.borderColor,
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
  const basePatch: Partial<CardRecord> = {
    templateId,
    name,
    title: data.title,
    description: data.description,
    imageAssetId: data.imageAssetId,
    imageAssetName: data.imageAssetName,
    imageScale: data.imageScale,
    imageOffsetX: data.imageOffsetX,
    imageOffsetY: data.imageOffsetY,
    imageOriginalWidth: data.imageOriginalWidth,
    imageOriginalHeight: data.imageOriginalHeight,
    borderColor: data.borderColor,
  };

  switch (templateId) {
    case "hero": {
      const hero = data as CardDataByTemplate["hero"];
      return {
        ...basePatch,
        heroAttackDice: hero.attackDice,
        heroDefendDice: hero.defendDice,
        heroBodyPoints: hero.bodyPoints,
        heroMindPoints: hero.mindPoints,
      };
    }
    case "monster": {
      const monster = data as CardDataByTemplate["monster"];
      return {
        ...basePatch,
        monsterMovementSquares: monster.movementSquares,
        monsterAttackDice: monster.attackDice,
        monsterDefendDice: monster.defendDice,
        monsterBodyPoints: monster.bodyPoints,
        monsterMindPoints: monster.mindPoints,
        monsterIconAssetId: monster.iconAssetId,
        monsterIconAssetName: monster.iconAssetName,
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
