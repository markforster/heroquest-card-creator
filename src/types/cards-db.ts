import type { TemplateId } from "./templates";
import type { StatValue } from "./stats";
import type { CardFace } from "./card-face";

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
  face?: CardFace;
  pairedWith?: string | null;
  description?: string;

  imageAssetId?: string;
  imageAssetName?: string;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
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

  thumbnailBlob?: Blob | null;
}
