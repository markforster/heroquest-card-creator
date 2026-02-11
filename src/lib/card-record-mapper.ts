import type { CardDataByTemplate } from "@/types/card-data";
import type { CardRecord } from "@/types/cards-db";
import type { StatValue } from "@/types/stats";
import type { TemplateId } from "@/types/templates";

export function cardRecordToCardData<T extends TemplateId>(
  record: CardRecord & { templateId: T },
): CardDataByTemplate[T] {
  const base = {
    title: record.title,
    showTitle: record.showTitle ?? true,
    face: record.face,
    pairedWith: record.pairedWith,
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
  const face = data.face;
  let pairedWith = data.pairedWith;
  if (face === "back") {
    pairedWith = null;
  }
  if (pairedWith && face !== "front") {
    pairedWith = null;
  }

  const basePatch: Partial<CardRecord> = {
    templateId,
    name,
    title: data.title,
    showTitle: data.showTitle,
    face,
    pairedWith,
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
      const [primary, secondary, splitFlag] = value as [number, number, 0 | 1];
      return [primary, secondary, splitFlag];
    }
  }
  return [value as number, 0, 0];
}
