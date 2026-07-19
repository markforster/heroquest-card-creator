import type { BodyTextStyle, HeroBackLogoMode } from "./card-data";
import type { CardFace } from "./card-face";
import type { StatAsteriskFlags, StatValue } from "./stats";
import type { TemplateId } from "./templates";

export type CardStatus = "draft" | "saved" | "archived";

export interface CardRecord {
  id: string;
  templateId: TemplateId;
  status: CardStatus;

  name: string;
  nameLower: string;
  createdAt: number;
  updatedAt: number;
  lastViewedAt?: number;
  deletedAt?: number | null;

  schemaVersion: 1 | 2;

  title?: string;
  showTitle?: boolean;
  titleStyle?: "ribbon" | "plain";
  titleColor?: string;
  bodyTextColor?: string;
  bodyTextFitToBounds?: boolean;
  titlePlacement?: "top" | "bottom";
  bodyTextStyle?: BodyTextStyle;
  face?: CardFace;
  description?: string;
  copyright?: string;
  copyrightColor?: string;
  showCopyright?: boolean;

  imageAssetId?: string;
  imageAssetName?: string;
  imageScale?: number;
  imageScaleMode?: "absolute" | "relative";
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageRotation?: number;
  imageOriginalWidth?: number;
  imageOriginalHeight?: number;
  borderColor?: string;
  backgroundTint?: string;
  heroBackLogoMode?: HeroBackLogoMode;
  heroBackLogoId?: string;
  heroBackLogoName?: string;
  heroBackLogoOriginalWidth?: number;
  heroBackLogoOriginalHeight?: number;

  heroAttackDice?: StatValue;
  heroAttackDiceAsterisks?: StatAsteriskFlags;
  heroDefendDice?: StatValue;
  heroDefendDiceAsterisks?: StatAsteriskFlags;
  heroBodyPoints?: StatValue;
  heroBodyPointsAsterisks?: StatAsteriskFlags;
  heroMindPoints?: StatValue;
  heroMindPointsAsterisks?: StatAsteriskFlags;

  monsterMovementSquares?: StatValue;
  monsterMovementSquaresAsterisks?: StatAsteriskFlags;
  monsterAttackDice?: StatValue;
  monsterAttackDiceAsterisks?: StatAsteriskFlags;
  monsterDefendDice?: StatValue;
  monsterDefendDiceAsterisks?: StatAsteriskFlags;
  monsterBodyPoints?: StatValue;
  monsterBodyPointsAsterisks?: StatAsteriskFlags;
  monsterMindPoints?: StatValue;
  monsterMindPointsAsterisks?: StatAsteriskFlags;
  monsterIconAssetId?: string;
  monsterIconAssetName?: string;
  monsterIconOffsetX?: number;
  monsterIconOffsetY?: number;
  monsterIconScale?: number;
  monsterIconRotation?: number;

  thumbnailBlob?: Blob | null;
}
