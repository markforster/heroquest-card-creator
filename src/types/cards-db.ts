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

  schemaVersion: 1;

  title?: string;
  description?: string;

  imageAssetId?: string;
  imageAssetName?: string;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageOriginalWidth?: number;
  imageOriginalHeight?: number;

  heroAttackDice?: number;
  heroDefendDice?: number;
  heroBodyPoints?: number;
  heroMindPoints?: number;

  monsterMovementSquares?: number;
  monsterAttackDice?: number;
  monsterDefendDice?: number;
  monsterBodyPoints?: number;
  monsterMindPoints?: number;
  monsterIconAssetId?: string;
  monsterIconAssetName?: string;

  thumbnailBlob?: Blob | null;
}

