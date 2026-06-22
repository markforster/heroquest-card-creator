import { blueprintsByTemplateId } from "@/data/blueprints";
import { layerTypes } from "@/data/card-systems/types";
import type { Blueprint, BlueprintLayer } from "@/types/blueprints";
import type { CardRecord } from "@/types/cards-db";
import type {
  CardBackgroundComponentRecord,
  CardBaseRecord,
  CardBorderComponentRecord,
  CardCopyrightComponentRecord,
  CardHeroStatsComponentRecord,
  CardIconComponentRecord,
  CardImageComponentRecord,
  CardMonsterStatsComponentRecord,
  CardSlotLinkRecord,
  CardTextComponentRecord,
  CardThumbnailRecord,
  CardTitleComponentRecord,
} from "@/types/cards-normalized";
import type { TemplateId } from "@/types/templates";
import type { Transaction } from "dexie";

type EditableBlueprintNode = BlueprintLayer & {
  type:
    | typeof layerTypes.background
    | typeof layerTypes.border
    | typeof layerTypes.image
    | typeof layerTypes.text
    | typeof layerTypes.title
    | typeof layerTypes.copyright
    | typeof layerTypes.icon
    | typeof layerTypes.stats_hero
    | typeof layerTypes.stats_monster;
};

export type NormalizedCardMigrationBundle = {
  baseRecord: CardBaseRecord;
  slotLinks: CardSlotLinkRecord[];
  backgrounds: CardBackgroundComponentRecord[];
  borders: CardBorderComponentRecord[];
  titles: CardTitleComponentRecord[];
  texts: CardTextComponentRecord[];
  copyrights: CardCopyrightComponentRecord[];
  images: CardImageComponentRecord[];
  icons: CardIconComponentRecord[];
  heroStats: CardHeroStatsComponentRecord[];
  monsterStats: CardMonsterStatsComponentRecord[];
};

export type NormalizedCardAssemblySource = {
  baseRecord: CardBaseRecord;
  slotLinks: CardSlotLinkRecord[];
  backgrounds: CardBackgroundComponentRecord[];
  borders: CardBorderComponentRecord[];
  titles: CardTitleComponentRecord[];
  texts: CardTextComponentRecord[];
  copyrights: CardCopyrightComponentRecord[];
  images: CardImageComponentRecord[];
  icons: CardIconComponentRecord[];
  heroStats: CardHeroStatsComponentRecord[];
  monsterStats: CardMonsterStatsComponentRecord[];
  thumbnailBlob?: Blob | null;
};

export type NormalizedCardSummarySource = {
  baseRecord: CardBaseRecord;
  thumbnailBlob?: Blob | null;
};

const EDITABLE_LAYER_TYPES = new Set<EditableBlueprintNode["type"]>([
  layerTypes.background,
  layerTypes.border,
  layerTypes.image,
  layerTypes.text,
  layerTypes.title,
  layerTypes.copyright,
  layerTypes.icon,
  layerTypes.stats_hero,
  layerTypes.stats_monster,
]);

function isEditableBlueprintNode(layer: BlueprintLayer): layer is EditableBlueprintNode {
  return EDITABLE_LAYER_TYPES.has(layer.type as EditableBlueprintNode["type"]);
}

function getEditableBlueprintNodes(blueprint: Blueprint): EditableBlueprintNode[] {
  return [
    ...blueprint.layers.filter(isEditableBlueprintNode),
    ...(blueprint.groups?.flatMap((group) => group.children.filter(isEditableBlueprintNode)) ?? []),
  ];
}

function createComponentId(cardId: string, slotId: string): string {
  return `${cardId}:${slotId}`;
}

function getEditableBlueprintNodesForTemplate(templateId: TemplateId): EditableBlueprintNode[] | null {
  const blueprint = blueprintsByTemplateId[templateId];
  if (!blueprint) {
    return null;
  }

  return getEditableBlueprintNodes(blueprint);
}

function buildSlotLinkMap(slotLinks: CardSlotLinkRecord[]): Map<string, CardSlotLinkRecord> {
  const map = new Map<string, CardSlotLinkRecord>();
  slotLinks.forEach((slotLink) => {
    map.set(slotLink.slotId, slotLink);
  });
  return map;
}

function buildComponentMap<T extends { id: string }>(records: T[]): Map<string, T> {
  const map = new Map<string, T>();
  records.forEach((record) => {
    map.set(record.id, record);
  });
  return map;
}

function hasAllExpectedEditableSlots(
  templateId: TemplateId,
  slotLinks: CardSlotLinkRecord[],
): boolean {
  const editableNodes = getEditableBlueprintNodesForTemplate(templateId);
  if (!editableNodes) {
    return false;
  }

  const slotLinkMap = buildSlotLinkMap(slotLinks);
  for (let index = 0; index < editableNodes.length; index += 1) {
    const node = editableNodes[index];
    const slotLink = slotLinkMap.get(node.id);
    if (!slotLink) {
      return false;
    }
    if (slotLink.slotType !== node.type) {
      return false;
    }
  }

  return true;
}

export function assembleNormalizedCardRecord(
  source: NormalizedCardAssemblySource,
): CardRecord | null {
  const { baseRecord, slotLinks } = source;

  if (!hasAllExpectedEditableSlots(baseRecord.templateId, slotLinks)) {
    return null;
  }

  const backgroundMap = buildComponentMap(source.backgrounds);
  const borderMap = buildComponentMap(source.borders);
  const titleMap = buildComponentMap(source.titles);
  const textMap = buildComponentMap(source.texts);
  const copyrightMap = buildComponentMap(source.copyrights);
  const imageMap = buildComponentMap(source.images);
  const iconMap = buildComponentMap(source.icons);
  const heroStatsMap = buildComponentMap(source.heroStats);
  const monsterStatsMap = buildComponentMap(source.monsterStats);

  const result: CardRecord = {
    id: baseRecord.id,
    templateId: baseRecord.templateId,
    status: baseRecord.status,
    name: baseRecord.name,
    nameLower: baseRecord.nameLower,
    createdAt: baseRecord.createdAt,
    updatedAt: baseRecord.updatedAt,
    lastViewedAt: baseRecord.lastViewedAt,
    deletedAt: baseRecord.deletedAt,
    face: baseRecord.face,
    schemaVersion: 2,
    thumbnailBlob: source.thumbnailBlob,
  };

  for (let index = 0; index < slotLinks.length; index += 1) {
    const slotLink = slotLinks[index];

    switch (slotLink.slotType) {
      case layerTypes.background: {
        const component = backgroundMap.get(slotLink.dataRecordId);
        if (!component) return null;
        result.backgroundTint = component.tint;
        break;
      }
      case layerTypes.border: {
        const component = borderMap.get(slotLink.dataRecordId);
        if (!component) return null;
        result.borderColor = component.color;
        break;
      }
      case layerTypes.title: {
        const component = titleMap.get(slotLink.dataRecordId);
        if (!component) return null;
        result.title = component.title;
        result.showTitle = component.showTitle;
        result.titleStyle = component.titleStyle;
        result.titleColor = component.titleColor;
        result.titlePlacement = component.titlePlacement;
        break;
      }
      case layerTypes.text: {
        const component = textMap.get(slotLink.dataRecordId);
        if (!component) return null;
        result.description = component.text;
        result.bodyTextColor = component.textColor;
        result.bodyTextFitToBounds = component.fitToBounds;
        result.bodyTextStyle = component.textStyle;
        break;
      }
      case layerTypes.copyright: {
        const component = copyrightMap.get(slotLink.dataRecordId);
        if (!component) return null;
        result.copyright = component.text;
        result.copyrightColor = component.color;
        result.showCopyright = component.show;
        break;
      }
      case layerTypes.image: {
        const component = imageMap.get(slotLink.dataRecordId);
        if (!component) return null;
        result.imageAssetId = component.assetId;
        result.imageAssetName = component.assetName;
        result.imageScale = component.scale;
        result.imageScaleMode = component.scaleMode;
        result.imageOffsetX = component.offsetX;
        result.imageOffsetY = component.offsetY;
        result.imageRotation = component.rotation;
        result.imageOriginalWidth = component.originalWidth;
        result.imageOriginalHeight = component.originalHeight;
        break;
      }
      case layerTypes.icon: {
        const component = iconMap.get(slotLink.dataRecordId);
        if (!component) return null;
        result.monsterIconAssetId = component.assetId;
        result.monsterIconAssetName = component.assetName;
        result.monsterIconOffsetX = component.offsetX;
        result.monsterIconOffsetY = component.offsetY;
        result.monsterIconScale = component.scale;
        result.monsterIconRotation = component.rotation;
        break;
      }
      case layerTypes.stats_hero: {
        const component = heroStatsMap.get(slotLink.dataRecordId);
        if (!component) return null;
        result.heroAttackDice = component.attackDice;
        result.heroDefendDice = component.defendDice;
        result.heroBodyPoints = component.bodyPoints;
        result.heroMindPoints = component.mindPoints;
        break;
      }
      case layerTypes.stats_monster: {
        const component = monsterStatsMap.get(slotLink.dataRecordId);
        if (!component) return null;
        result.monsterMovementSquares = component.movementSquares;
        result.monsterAttackDice = component.attackDice;
        result.monsterDefendDice = component.defendDice;
        result.monsterBodyPoints = component.bodyPoints;
        result.monsterMindPoints = component.mindPoints;
        break;
      }
      default:
        return null;
    }
  }

  return result;
}

export function assembleNormalizedCardSummaryRecord(
  source: NormalizedCardSummarySource,
): CardRecord {
  const { baseRecord, thumbnailBlob } = source;

  return {
    id: baseRecord.id,
    templateId: baseRecord.templateId,
    status: baseRecord.status,
    name: baseRecord.name,
    nameLower: baseRecord.nameLower,
    createdAt: baseRecord.createdAt,
    updatedAt: baseRecord.updatedAt,
    lastViewedAt: baseRecord.lastViewedAt,
    deletedAt: baseRecord.deletedAt,
    face: baseRecord.face,
    schemaVersion: 2,
    thumbnailBlob,
  };
}

export function buildNormalizedCardRecords(
  record: CardRecord,
): NormalizedCardMigrationBundle | null {
  if (!record.templateId) {
    return null;
  }

  const blueprint = blueprintsByTemplateId[record.templateId];
  if (!blueprint) {
    return null;
  }

  const editableNodes = getEditableBlueprintNodes(blueprint);
  const baseRecord: CardBaseRecord = {
    id: record.id,
    templateId: record.templateId,
    systemFamily: blueprint.systemFamily,
    status: record.status,
    name: record.name,
    nameLower: record.nameLower,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastViewedAt: record.lastViewedAt,
    deletedAt: record.deletedAt,
    face: record.face,
    schemaVersion: 1,
  };

  const slotLinks: CardSlotLinkRecord[] = [];
  const backgrounds: CardBackgroundComponentRecord[] = [];
  const borders: CardBorderComponentRecord[] = [];
  const titles: CardTitleComponentRecord[] = [];
  const texts: CardTextComponentRecord[] = [];
  const copyrights: CardCopyrightComponentRecord[] = [];
  const images: CardImageComponentRecord[] = [];
  const icons: CardIconComponentRecord[] = [];
  const heroStats: CardHeroStatsComponentRecord[] = [];
  const monsterStats: CardMonsterStatsComponentRecord[] = [];

  editableNodes.forEach((node, order) => {
    const componentId = createComponentId(record.id, node.id);
    const shared = {
      id: componentId,
      cardId: record.id,
      slotId: node.id,
      order,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      schemaVersion: 1 as const,
    };

    slotLinks.push({
      id: componentId,
      cardId: record.id,
      slotId: node.id,
      slotType: node.type,
      dataRecordId: componentId,
      order,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      schemaVersion: 1,
    });

    switch (node.type) {
      case layerTypes.background:
        backgrounds.push({
          ...shared,
          tint: record.backgroundTint,
        });
        return;
      case layerTypes.border:
        borders.push({
          ...shared,
          color: record.borderColor,
        });
        return;
      case layerTypes.title:
        titles.push({
          ...shared,
          title: record.title,
          showTitle: record.showTitle,
          titleStyle: record.titleStyle,
          titleColor: record.titleColor,
          titlePlacement: record.titlePlacement,
        });
        return;
      case layerTypes.text:
        texts.push({
          ...shared,
          text: record.description,
          textColor: record.bodyTextColor,
          fitToBounds: record.bodyTextFitToBounds,
          textStyle: record.bodyTextStyle,
        });
        return;
      case layerTypes.copyright:
        copyrights.push({
          ...shared,
          text: record.copyright,
          color: record.copyrightColor,
          show: record.showCopyright,
        });
        return;
      case layerTypes.image:
        images.push({
          ...shared,
          assetId: record.imageAssetId,
          assetName: record.imageAssetName,
          scale: record.imageScale,
          scaleMode: record.imageScaleMode,
          offsetX: record.imageOffsetX,
          offsetY: record.imageOffsetY,
          rotation: record.imageRotation,
          originalWidth: record.imageOriginalWidth,
          originalHeight: record.imageOriginalHeight,
        });
        return;
      case layerTypes.icon:
        icons.push({
          ...shared,
          assetId: record.monsterIconAssetId,
          assetName: record.monsterIconAssetName,
          offsetX: record.monsterIconOffsetX,
          offsetY: record.monsterIconOffsetY,
          scale: record.monsterIconScale,
          rotation: record.monsterIconRotation,
        });
        return;
      case layerTypes.stats_hero:
        heroStats.push({
          ...shared,
          attackDice: record.heroAttackDice,
          defendDice: record.heroDefendDice,
          bodyPoints: record.heroBodyPoints,
          mindPoints: record.heroMindPoints,
        });
        return;
      case layerTypes.stats_monster:
        monsterStats.push({
          ...shared,
          movementSquares: record.monsterMovementSquares,
          attackDice: record.monsterAttackDice,
          defendDice: record.monsterDefendDice,
          bodyPoints: record.monsterBodyPoints,
          mindPoints: record.monsterMindPoints,
        });
        return;
    }
  });

  return {
    baseRecord,
    slotLinks,
    backgrounds,
    borders,
    titles,
    texts,
    copyrights,
    images,
    icons,
    heroStats,
    monsterStats,
  };
}

const NORMALIZED_COMPONENT_STORE_NAMES = [
  "cardSlotLinks",
  "cardBackgroundComponents",
  "cardBorderComponents",
  "cardTitleComponents",
  "cardTextComponents",
  "cardCopyrightComponents",
  "cardImageComponents",
  "cardIconComponents",
  "cardHeroStatsComponents",
  "cardMonsterStatsComponents",
] as const;

export async function replaceNormalizedCardRecords(
  tx: Transaction,
  record: CardRecord,
): Promise<NormalizedCardMigrationBundle | null> {
  const bundle = buildNormalizedCardRecords(record);
  if (!bundle) {
    return null;
  }

  await tx.table("cardsBase").put(bundle.baseRecord);

  for (let index = 0; index < NORMALIZED_COMPONENT_STORE_NAMES.length; index += 1) {
    const storeName = NORMALIZED_COMPONENT_STORE_NAMES[index];
    await tx.table(storeName).where("cardId").equals(record.id).delete();
  }

  if (bundle.slotLinks.length > 0) {
    await tx.table("cardSlotLinks").bulkPut(bundle.slotLinks);
  }
  if (bundle.backgrounds.length > 0) {
    await tx.table("cardBackgroundComponents").bulkPut(bundle.backgrounds);
  }
  if (bundle.borders.length > 0) {
    await tx.table("cardBorderComponents").bulkPut(bundle.borders);
  }
  if (bundle.titles.length > 0) {
    await tx.table("cardTitleComponents").bulkPut(bundle.titles);
  }
  if (bundle.texts.length > 0) {
    await tx.table("cardTextComponents").bulkPut(bundle.texts);
  }
  if (bundle.copyrights.length > 0) {
    await tx.table("cardCopyrightComponents").bulkPut(bundle.copyrights);
  }
  if (bundle.images.length > 0) {
    await tx.table("cardImageComponents").bulkPut(bundle.images);
  }
  if (bundle.icons.length > 0) {
    await tx.table("cardIconComponents").bulkPut(bundle.icons);
  }
  if (bundle.heroStats.length > 0) {
    await tx.table("cardHeroStatsComponents").bulkPut(bundle.heroStats);
  }
  if (bundle.monsterStats.length > 0) {
    await tx.table("cardMonsterStatsComponents").bulkPut(bundle.monsterStats);
  }

  return bundle;
}

export async function replaceNormalizedCardThumbnail(
  tx: Transaction,
  record: CardRecord,
): Promise<void> {
  const normalizedThumbnailBlob = record.thumbnailBlob;

  if (!normalizedThumbnailBlob) {
    await tx.table("cardThumbnails").delete(record.id);
    return;
  }

  const existing = (await tx.table("cardThumbnails").get(record.id)) as CardThumbnailRecord | undefined;
  await tx.table("cardThumbnails").put({
    id: record.id,
    cardId: record.id,
    thumbnailBlob: normalizedThumbnailBlob,
    createdAt: existing?.createdAt ?? record.createdAt,
    updatedAt: record.updatedAt,
    schemaVersion: 1,
  });
}

export async function deleteNormalizedCardRecords(tx: Transaction, cardId: string): Promise<void> {
  await tx.table("cardsBase").delete(cardId);
  await tx.table("cardThumbnails").delete(cardId);

  for (let index = 0; index < NORMALIZED_COMPONENT_STORE_NAMES.length; index += 1) {
    const storeName = NORMALIZED_COMPONENT_STORE_NAMES[index];
    await tx.table(storeName).where("cardId").equals(cardId).delete();
  }
}

export async function touchNormalizedCardBaseLastViewed(
  tx: Transaction,
  cardId: string,
  viewedAt: number,
): Promise<void> {
  const existing = await tx.table("cardsBase").get(cardId);
  if (!existing) {
    return;
  }

  await tx.table("cardsBase").put({
    ...existing,
    lastViewedAt: viewedAt,
  });
}
