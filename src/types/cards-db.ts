import type { TemplateId } from "./templates";
import type { StatValue } from "./stats";
import type { CardFace } from "./card-face";
import type { BodyTextStyle } from "./card-data";

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

  schemaVersion: 1;

  title?: string;
  showTitle?: boolean;
  titleStyle?: "ribbon" | "plain";
  titleColor?: string;
  titlePlacement?: "top" | "bottom";
  bodyTextStyle?: BodyTextStyle;
  face?: CardFace;
  description?: string;
  copyright?: string;
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

  heroAttackDice?: StatValue;
  heroDefendDice?: StatValue;
  heroBodyPoints?: StatValue;
  heroMindPoints?: StatValue;

  monsterMovementSquares?: StatValue;
  monsterAttackDice?: StatValue;
  monsterDefendDice?: StatValue;
  monsterBodyPoints?: StatValue;
  monsterMindPoints?: StatValue;
  monsterIconAssetId?: string;
  monsterIconAssetName?: string;
  monsterIconOffsetX?: number;
  monsterIconOffsetY?: number;
  monsterIconScale?: number;
  monsterIconRotation?: number;

  thumbnailBlob?: Blob | null;
}
