import { blueprintsByTemplateId } from "@/data/blueprints";
import { getBlueprintCopyrightDefaultVisible } from "@/lib/copyright-defaults";
import { openHqccDexieDb } from "@/lib/hqcc-dexie";
import type { CardBaseRecord, CardCopyrightComponentRecord, CardSlotLinkRecord } from "@/types/cards-normalized";

import type { BlueprintLayer } from "@/types/blueprints";
import type { Transaction } from "dexie";

type HqccDexieDb = Awaited<ReturnType<typeof openHqccDexieDb>>;

const EDITABLE_LAYER_TYPES = new Set([
  "background",
  "border",
  "image",
  "logo",
  "text",
  "title",
  "copyright",
  "icon",
  "stats-hero",
  "stats-monster",
]);

function getEditableNodes(baseRecord: CardBaseRecord): BlueprintLayer[] {
  const blueprint = blueprintsByTemplateId[baseRecord.templateId];
  if (!blueprint) {
    return [];
  }

  return [
    ...blueprint.layers.filter((layer) => EDITABLE_LAYER_TYPES.has(layer.type)),
    ...(blueprint.groups?.flatMap((group) =>
      group.children.filter((child) => EDITABLE_LAYER_TYPES.has(child.type)),
    ) ?? []),
  ];
}

function createComponentId(cardId: string, slotId: string): string {
  return `${cardId}:${slotId}`;
}

async function backfillCopyrightForCardInTransaction(
  tx: Transaction,
  baseRecord: CardBaseRecord,
): Promise<boolean> {
  const editableNodes = getEditableNodes(baseRecord);
  const copyrightNodeIndex = editableNodes.findIndex((node) => node.type === "copyright");
  if (copyrightNodeIndex < 0) {
    return false;
  }

  const copyrightNode = editableNodes[copyrightNodeIndex];
  const componentId = createComponentId(baseRecord.id, copyrightNode.id);
  const [existingSlot, existingComponent] = await Promise.all([
    tx.table("cardSlotLinks").get(componentId) as Promise<CardSlotLinkRecord | undefined>,
    tx.table("cardCopyrightComponents").get(componentId) as Promise<
      CardCopyrightComponentRecord | undefined
    >,
  ]);

  if (existingSlot && existingComponent) {
    return false;
  }

  if (!existingSlot) {
    await tx.table("cardSlotLinks").put({
      id: componentId,
      cardId: baseRecord.id,
      slotId: copyrightNode.id,
      slotType: copyrightNode.type,
      dataRecordId: componentId,
      order: copyrightNodeIndex,
      createdAt: baseRecord.createdAt,
      updatedAt: baseRecord.updatedAt,
      schemaVersion: 1,
    } satisfies CardSlotLinkRecord);
  }

  if (!existingComponent) {
    await tx.table("cardCopyrightComponents").put({
      id: componentId,
      cardId: baseRecord.id,
      slotId: copyrightNode.id,
      order: copyrightNodeIndex,
      createdAt: baseRecord.createdAt,
      updatedAt: baseRecord.updatedAt,
      schemaVersion: 1,
      show: getBlueprintCopyrightDefaultVisible(baseRecord.templateId),
    } satisfies CardCopyrightComponentRecord);
  }

  return true;
}

export async function backfillCardCopyrightComponents(
  db?: HqccDexieDb,
  options?: { cardId?: string },
): Promise<number> {
  const dexieDb = db ?? (await openHqccDexieDb());
  const baseRecords = options?.cardId
    ? ((await dexieDb.cardsBase.bulkGet([options.cardId])).filter(Boolean) as CardBaseRecord[])
    : await dexieDb.cardsBase.toArray();

  if (!baseRecords.length) {
    return 0;
  }

  let repairedCount = 0;
  await dexieDb.transaction(
    "rw",
    dexieDb.cardsBase,
    dexieDb.cardSlotLinks,
    dexieDb.cardCopyrightComponents,
    async (tx) => {
      for (let index = 0; index < baseRecords.length; index += 1) {
        const repaired = await backfillCopyrightForCardInTransaction(tx, baseRecords[index]);
        if (repaired) {
          repairedCount += 1;
        }
      }
    },
  );

  return repairedCount;
}
