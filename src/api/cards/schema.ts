import { z } from "zod";

import {
  blobSchema,
  bodyTextStyleSchema,
  cardFaceSchema,
  statValueSchema,
  templateIdSchema,
} from "@/api/shared/schema";

export const cardStatusSchema = z.enum(["draft", "saved", "archived"]);

export const cardSchemaVersionSchema = z.union([z.literal(1), z.literal(2)]);

export const cardRecordSchema = z.object({
  id: z.string(),
  templateId: templateIdSchema,
  status: cardStatusSchema,

  name: z.string(),
  nameLower: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastViewedAt: z.number().optional(),
  deletedAt: z.number().nullable().optional(),

  schemaVersion: cardSchemaVersionSchema,

  title: z.string().optional(),
  showTitle: z.boolean().optional(),
  titleStyle: z.enum(["ribbon", "plain"]).optional(),
  titleColor: z.string().optional(),
  bodyTextColor: z.string().optional(),
  titlePlacement: z.enum(["top", "bottom"]).optional(),
  bodyTextStyle: bodyTextStyleSchema,
  face: cardFaceSchema.optional(),
  description: z.string().optional(),
  copyright: z.string().optional(),
  copyrightColor: z.string().optional(),
  showCopyright: z.boolean().optional(),

  imageAssetId: z.string().optional(),
  imageAssetName: z.string().optional(),
  imageScale: z.number().optional(),
  imageScaleMode: z.enum(["absolute", "relative"]).optional(),
  imageOffsetX: z.number().optional(),
  imageOffsetY: z.number().optional(),
  imageRotation: z.number().optional(),
  imageOriginalWidth: z.number().optional(),
  imageOriginalHeight: z.number().optional(),
  borderColor: z.string().optional(),
  backgroundTint: z.string().optional(),

  heroAttackDice: statValueSchema.optional(),
  heroDefendDice: statValueSchema.optional(),
  heroBodyPoints: statValueSchema.optional(),
  heroMindPoints: statValueSchema.optional(),

  monsterMovementSquares: statValueSchema.optional(),
  monsterAttackDice: statValueSchema.optional(),
  monsterDefendDice: statValueSchema.optional(),
  monsterBodyPoints: statValueSchema.optional(),
  monsterMindPoints: statValueSchema.optional(),
  monsterIconAssetId: z.string().optional(),
  monsterIconAssetName: z.string().optional(),
  monsterIconOffsetX: z.number().optional(),
  monsterIconOffsetY: z.number().optional(),
  monsterIconScale: z.number().optional(),
  monsterIconRotation: z.number().optional(),

  thumbnailBlob: blobSchema.nullable().optional(),
});

export const cardCreateInputSchema = cardRecordSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    nameLower: true,
    schemaVersion: true,
  })
  .extend({
    id: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    nameLower: z.string().optional(),
    schemaVersion: cardSchemaVersionSchema.optional(),
  });

export const cardUpdateInputSchema = cardRecordSchema
  .omit({
    id: true,
    createdAt: true,
    schemaVersion: true,
  })
  .partial();

export const listCardsFilterSchema = z.object({
  templateId: templateIdSchema.optional(),
  status: cardStatusSchema.optional(),
  search: z.string().optional(),
  deleted: z.enum(["exclude", "include", "only"]).optional(),
});

export const deleteCardsInputSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const softDeleteCardsInputSchema = z.object({
  ids: z.array(z.string()).min(1),
  deletedAt: z.number().optional(),
});

export const restoreCardsInputSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const touchCardLastViewedInputSchema = z.object({
  viewedAt: z.number().optional(),
});

export const updateCardsInputSchema = z.object({
  ids: z.array(z.string()).min(1),
  patch: cardUpdateInputSchema,
});

export const updateCardThumbnailInputSchema = z.object({
  thumbnailBlob: blobSchema.nullable(),
});

export const normalizeSelfPairingsInputSchema = z.object({});

export const normalizeSelfPairingsResponseSchema = z.number();
