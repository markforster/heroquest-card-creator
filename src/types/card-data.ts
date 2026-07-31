/* eslint-disable @typescript-eslint/no-empty-object-type */
import { DEFAULT_BODY_TEXT_COLOR } from "@/config/colors";

import type { CardFace } from "./card-face";
import type { StatAsteriskFlags, StatValue } from "./stats";
import type { TemplateId } from "./templates";

/**
 * Shared editable fields used by multiple card templates before persistence normalization.
 */
export interface BaseCardFields {
  name?: string;
  title?: string;
  showTitle?: boolean;
  titleStyle?: "ribbon" | "plain";
  titleColor?: string;
  bodyTextColor?: string;
  bodyTextFitToBounds?: boolean;
  face?: CardFace;
  imageUrl?: string;
  imageAssetId?: string;
  imageAssetName?: string;
  imageScale?: number;
  imageScaleMode?: "absolute" | "relative";
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageRotation?: number;
  imageOriginalWidth?: number;
  imageOriginalHeight?: number;
  description?: string;
  borderColor?: string;
  backgroundTint?: string;
  copyright?: string;
  copyrightColor?: string;
  showCopyright?: boolean;
}

/**
 * Editable data shape for hero cards.
 */
export interface HeroCardData extends BaseCardFields {
  attackDice?: StatValue;
  attackDiceAsterisks?: StatAsteriskFlags;
  defendDice?: StatValue;
  defendDiceAsterisks?: StatAsteriskFlags;
  bodyPoints?: StatValue;
  bodyPointsAsterisks?: StatAsteriskFlags;
  mindPoints?: StatValue;
  mindPointsAsterisks?: StatAsteriskFlags;
}

/**
 * Editable data shape for monster cards.
 */
export interface MonsterCardData extends BaseCardFields {
  movementSquares?: StatValue;
  movementSquaresAsterisks?: StatAsteriskFlags;
  attackDice?: StatValue;
  attackDiceAsterisks?: StatAsteriskFlags;
  defendDice?: StatValue;
  defendDiceAsterisks?: StatAsteriskFlags;
  bodyPoints?: StatValue;
  bodyPointsAsterisks?: StatAsteriskFlags;
  mindPoints?: StatValue;
  mindPointsAsterisks?: StatAsteriskFlags;
  iconAssetId?: string;
  iconAssetName?: string;
  iconOffsetX?: number;
  iconOffsetY?: number;
  iconScale?: number;
  iconRotation?: number;
}

/**
 * Editable data shape for small treasure cards.
 */
export interface SmallTreasureCardData extends BaseCardFields {}

/**
 * Editable data shape for large treasure cards.
 */
export interface LargeTreasureCardData extends BaseCardFields {}

/**
 * Editable data shape for rules cards.
 */
export interface RulesCardData extends BaseCardFields {}

/**
 * Supported hero-back logo selection modes.
 */
export type HeroBackLogoMode = "default" | "none" | "custom";

/**
 * Editable data shape for hero-back and logo-back cards.
 */
export interface HeroBackCardData extends BaseCardFields {
  heroBackLogoMode?: HeroBackLogoMode;
  heroBackLogoId?: string;
  heroBackLogoName?: string;
  heroBackLogoOriginalWidth?: number;
  heroBackLogoOriginalHeight?: number;
}

/**
 * Alias retained for logo-back templates, which currently share the hero-back field shape.
 */
export type LogoBackCardData = HeroBackCardData;

/**
 * Optional body-text presentation settings used by back-card templates.
 */
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

/**
 * Editable data shape for labelled-back cards.
 */
export interface LabelledBackCardData extends BaseCardFields {
  titlePlacement?: "top" | "bottom";
  bodyTextStyle?: BodyTextStyle;
}

/**
 * Maps each template id to its editable card-data shape.
 */
export type CardDataByTemplate = {
  hero: HeroCardData;
  monster: MonsterCardData;
  "large-treasure": LargeTreasureCardData;
  "small-treasure": SmallTreasureCardData;
  rules: RulesCardData;
  "hero-back": HeroBackCardData;
  "logo-back": LogoBackCardData;
  "labelled-back": LabelledBackCardData;
};

/**
 * Discriminated union covering every supported template/data pairing.
 */
export type AnyCard = {
  [K in TemplateId]: {
    templateId: K;
    data: CardDataByTemplate[K];
  };
}[TemplateId];

/**
 * Creates the default editable card-data payload for a template selection.
 */
export function createDefaultCardData<T extends TemplateId>(templateId: T): CardDataByTemplate[T] {
  const id: TemplateId = templateId;
  const base = { bodyTextColor: DEFAULT_BODY_TEXT_COLOR, bodyTextFitToBounds: false };

  switch (id) {
    case "hero":
      return {
        ...base,
        attackDice: 3,
        defendDice: 2,
        bodyPoints: 8,
        mindPoints: 2,
      } as CardDataByTemplate[T];
    case "monster":
      return { ...base } as CardDataByTemplate[T];
    case "large-treasure":
      return { ...base } as CardDataByTemplate[T];
    case "small-treasure":
    case "rules":
      return { ...base } as CardDataByTemplate[T];
    case "hero-back":
    case "logo-back":
      return { ...base, heroBackLogoMode: "default" } as CardDataByTemplate[T];
    case "labelled-back":
      return {
        ...base,
        titlePlacement: "bottom",
        titleStyle: "ribbon",
      } as CardDataByTemplate[T];
    default:
      return { ...base } as CardDataByTemplate[T];
  }
}
