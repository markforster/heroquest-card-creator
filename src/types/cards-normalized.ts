import type { BodyTextStyle } from "@/types/card-data";
import type { CardFace } from "@/types/card-face";
import type { CardStatus } from "@/types/cards-db";
import type { BlueprintGroupTypeValue, BlueprintLayerTypeValue, BlueprintSlotId, SystemFamily } from "@/data/card-systems/types";
import type { StatValue } from "@/types/stats";
import type { TemplateId } from "@/types/templates";

export type NormalizedCardSchemaVersion = 1;

type NormalizedCardComponentBase = {
  id: string;
  cardId: string;
  slotId: BlueprintSlotId;
  order: number;
  createdAt: number;
  updatedAt: number;
  schemaVersion: NormalizedCardSchemaVersion;
};

export interface CardBaseRecord {
  id: string;
  templateId: TemplateId;
  systemFamily: SystemFamily;
  status: CardStatus;
  name: string;
  nameLower: string;
  createdAt: number;
  updatedAt: number;
  lastViewedAt?: number;
  deletedAt?: number | null;
  face?: CardFace;
  schemaVersion: NormalizedCardSchemaVersion;
}

export interface CardThumbnailRecord {
  id: string;
  cardId: string;
  thumbnailBlob: Blob;
  createdAt: number;
  updatedAt: number;
  schemaVersion: NormalizedCardSchemaVersion;
}

export interface CardSlotLinkRecord {
  id: string;
  cardId: string;
  slotId: BlueprintSlotId;
  slotType: BlueprintLayerTypeValue | BlueprintGroupTypeValue;
  dataRecordId: string;
  order: number;
  createdAt: number;
  updatedAt: number;
  schemaVersion: NormalizedCardSchemaVersion;
}

export interface CardBackgroundComponentRecord extends NormalizedCardComponentBase {
  tint?: string;
}

export interface CardBorderComponentRecord extends NormalizedCardComponentBase {
  color?: string;
}

export interface CardTitleComponentRecord extends NormalizedCardComponentBase {
  title?: string;
  showTitle?: boolean;
  titleStyle?: "ribbon" | "plain";
  titleColor?: string;
  titlePlacement?: "top" | "bottom";
}

export interface CardTextComponentRecord extends NormalizedCardComponentBase {
  text?: string;
  textColor?: string;
  fitToBounds?: boolean;
  textStyle?: BodyTextStyle;
}

export interface CardCopyrightComponentRecord extends NormalizedCardComponentBase {
  text?: string;
  color?: string;
  show?: boolean;
}

export interface CardImageComponentRecord extends NormalizedCardComponentBase {
  assetId?: string;
  assetName?: string;
  scale?: number;
  scaleMode?: "absolute" | "relative";
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  originalWidth?: number;
  originalHeight?: number;
}

export interface CardIconComponentRecord extends NormalizedCardComponentBase {
  assetId?: string;
  assetName?: string;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  rotation?: number;
}

export interface CardHeroStatsComponentRecord extends NormalizedCardComponentBase {
  attackDice?: StatValue;
  defendDice?: StatValue;
  bodyPoints?: StatValue;
  mindPoints?: StatValue;
}

export interface CardMonsterStatsComponentRecord extends NormalizedCardComponentBase {
  movementSquares?: StatValue;
  attackDice?: StatValue;
  defendDice?: StatValue;
  bodyPoints?: StatValue;
  mindPoints?: StatValue;
}
