import { z } from "zod";

import {
  blobSchema,
  bodyTextStyleSchema,
  cardFaceSchema,
  statAsteriskFlagsSchema,
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
  bodyTextFitToBounds: z.boolean().optional(),
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
  heroBackLogoMode: z.enum(["default", "none", "custom"]).optional(),
  heroBackLogoId: z.string().optional(),
  heroBackLogoName: z.string().optional(),
  heroBackLogoOriginalWidth: z.number().optional(),
  heroBackLogoOriginalHeight: z.number().optional(),

  heroAttackDice: statValueSchema.optional(),
  heroAttackDiceAsterisks: statAsteriskFlagsSchema.optional(),
  heroDefendDice: statValueSchema.optional(),
  heroDefendDiceAsterisks: statAsteriskFlagsSchema.optional(),
  heroBodyPoints: statValueSchema.optional(),
  heroBodyPointsAsterisks: statAsteriskFlagsSchema.optional(),
  heroMindPoints: statValueSchema.optional(),
  heroMindPointsAsterisks: statAsteriskFlagsSchema.optional(),

  monsterMovementSquares: statValueSchema.optional(),
  monsterMovementSquaresAsterisks: statAsteriskFlagsSchema.optional(),
  monsterAttackDice: statValueSchema.optional(),
  monsterAttackDiceAsterisks: statAsteriskFlagsSchema.optional(),
  monsterDefendDice: statValueSchema.optional(),
  monsterDefendDiceAsterisks: statAsteriskFlagsSchema.optional(),
  monsterBodyPoints: statValueSchema.optional(),
  monsterBodyPointsAsterisks: statAsteriskFlagsSchema.optional(),
  monsterMindPoints: statValueSchema.optional(),
  monsterMindPointsAsterisks: statAsteriskFlagsSchema.optional(),
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
    duplicateFromCardId: z.string().nullable().optional(),
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
  mode: z.enum(["block", "confirmable-cascade"]).optional(),
  confirmCascade: z.boolean().optional(),
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

export const cardThumbnailResponseSchema = blobSchema.nullable();

export const normalizeSelfPairingsInputSchema = z.object({});

export const normalizeSelfPairingsResponseSchema = z.number();

export const cardDeckMembershipSchema = z.object({
  deckId: z.string(),
  deckTitle: z.string(),
  count: z.number().int().nonnegative(),
  setId: z.string().optional(),
  entryId: z.string().optional(),
});
