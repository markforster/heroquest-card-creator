import {
  cardCreateInputSchema,
  cardRecordSchema,
  cardSchemaVersionSchema,
  cardStatusSchema,
  cardUpdateInputSchema,
  deleteCardsInputSchema,
  listCardsFilterSchema,
  normalizeSelfPairingsResponseSchema,
  normalizeSelfPairingsInputSchema,
  restoreCardsInputSchema,
  softDeleteCardsInputSchema,
  touchCardLastViewedInputSchema,
  updateCardsInputSchema,
  updateCardThumbnailInputSchema,
} from "@/api/cards/schema";

import type { z } from "zod";

export type CardSchemaVersion = z.infer<typeof cardSchemaVersionSchema>;
export type CardStatus = z.infer<typeof cardStatusSchema>;
export type CardRecord = z.infer<typeof cardRecordSchema>;
export type CardCreateInput = z.infer<typeof cardCreateInputSchema>;
export type CardUpdateInput = z.infer<typeof cardUpdateInputSchema>;
export type ListCardsFilter = z.infer<typeof listCardsFilterSchema>;
export type DeleteCardsInput = z.infer<typeof deleteCardsInputSchema>;
export type SoftDeleteCardsInput = z.infer<typeof softDeleteCardsInputSchema>;
export type RestoreCardsInput = z.infer<typeof restoreCardsInputSchema>;
export type TouchCardLastViewedInput = z.infer<typeof touchCardLastViewedInputSchema>;
export type UpdateCardsInput = z.infer<typeof updateCardsInputSchema>;
export type UpdateCardThumbnailInput = z.infer<typeof updateCardThumbnailInputSchema>;
export type NormalizeSelfPairingsResponse = z.infer<typeof normalizeSelfPairingsResponseSchema>;
export type NormalizeSelfPairingsInput = z.infer<typeof normalizeSelfPairingsInputSchema>;
