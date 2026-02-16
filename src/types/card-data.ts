/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { TemplateId } from "./templates";
import type { StatValue } from "./stats";
import type { CardFace } from "./card-face";

export interface BaseCardFields {
  title?: string;
  showTitle?: boolean;
  face?: CardFace;
  imageUrl?: string;
  imageAssetId?: string;
  imageAssetName?: string;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageRotation?: number;
  imageOriginalWidth?: number;
  imageOriginalHeight?: number;
  description?: string;
  borderColor?: string;
}

export interface HeroCardData extends BaseCardFields {
  attackDice?: StatValue;
  defendDice?: StatValue;
  bodyPoints?: StatValue;
  mindPoints?: StatValue;
}

export interface MonsterCardData extends BaseCardFields {
  movementSquares?: StatValue;
  attackDice?: StatValue;
  defendDice?: StatValue;
  bodyPoints?: StatValue;
  mindPoints?: StatValue;
  iconAssetId?: string;
  iconAssetName?: string;
}

export interface SmallTreasureCardData extends BaseCardFields {}

export interface LargeTreasureCardData extends BaseCardFields {}

export interface HeroBackCardData extends BaseCardFields {}

export type BodyTextStyle = {
  enabled?: boolean;
  backdrop?: {
    enabled?: boolean;
    color?: string;
    opacity?: number;
    insetMode?: "matchBorder" | "flush";
    cornerMode?: "all" | "opposite-title";
    fitMode?: "full" | "fit-to-text";
  };
};

export interface LabelledBackCardData extends BaseCardFields {
  titlePlacement?: "top" | "bottom";
  bodyTextStyle?: BodyTextStyle;
}

export type CardDataByTemplate = {
  hero: HeroCardData;
  monster: MonsterCardData;
  "large-treasure": LargeTreasureCardData;
  "small-treasure": SmallTreasureCardData;
  "hero-back": HeroBackCardData;
  "labelled-back": LabelledBackCardData;
};

export type AnyCard = {
  [K in TemplateId]: {
    templateId: K;
    data: CardDataByTemplate[K];
  };
}[TemplateId];

export function createDefaultCardData<T extends TemplateId>(templateId: T): CardDataByTemplate[T] {
  const id: TemplateId = templateId;

  switch (id) {
    case "hero":
      return {
        attackDice: 3,
        defendDice: 2,
        bodyPoints: 8,
        mindPoints: 2,
      } as CardDataByTemplate[T];
    case "monster":
      return {} as CardDataByTemplate[T];
    case "large-treasure":
      return {} as CardDataByTemplate[T];
    case "small-treasure":
      return {} as CardDataByTemplate[T];
    case "hero-back":
      return {} as CardDataByTemplate[T];
    case "labelled-back":
      return { titlePlacement: "bottom" } as CardDataByTemplate[T];
    default:
      return {} as CardDataByTemplate[T];
  }
}
