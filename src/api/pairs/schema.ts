import { z } from "zod";

export const pairRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameLower: z.string(),
  frontFaceId: z.string().nullable(),
  backFaceId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  schemaVersion: z.literal(1),
});

export const listPairsFilterSchema = z.object({
  faceId: z.string().optional(),
});

export const createPairInputSchema = z.object({
  frontFaceId: z.string(),
  backFaceId: z.string(),
  id: z.string().optional(),
  name: z.string().optional(),
  nameLower: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  schemaVersion: z.literal(1).optional(),
});

export const deletePairInputSchema = z.object({
  frontFaceId: z.string(),
  backFaceId: z.string(),
});
