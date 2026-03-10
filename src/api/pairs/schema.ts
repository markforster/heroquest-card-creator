import { z } from "zod";

export const pairSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  nameLower: z.string(),
  frontFaceId: z.string().nullable(),
  backFaceId: z.string().nullable(),
});

export const listPairsFilterSchema = z.object({
  faceId: z.string().optional(),
});

export const createPairInputSchema = z.object({
  frontFaceId: z.string(),
  backFaceId: z.string(),
});

export const deletePairInputSchema = z.object({
  frontFaceId: z.string(),
  backFaceId: z.string(),
});
