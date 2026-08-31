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
  mode: z.enum(["block", "confirmable-cascade"]).optional(),
  confirmCascade: z.boolean().optional(),
});

export const deckUsageLocationSchema = z.object({
  deckId: z.string(),
  deckTitle: z.string(),
  groupId: z.string(),
  groupTitle: z.string(),
  setId: z.string(),
  setTitle: z.string(),
});

export const pairCascadePlanSchema = z.object({
  pairIds: z.array(z.string()),
  entryIds: z.array(z.string()),
  usage: z.array(deckUsageLocationSchema),
});

export const pairUsageReportSchema = z.object({
  frontFaceId: z.string(),
  backFaceId: z.string(),
  mode: z.enum(["block", "confirmable-cascade"]),
  cascadePlan: pairCascadePlanSchema,
});

export const previewDeletePairInputSchema = z.object({
  frontFaceId: z.string(),
  backFaceId: z.string(),
  mode: z.enum(["block", "confirmable-cascade"]).optional(),
});

export const deletePairsForFacesInputSchema = z.object({
  faceIds: z.array(z.string()),
  mode: z.enum(["block", "confirmable-cascade"]).optional(),
  confirmCascade: z.boolean().optional(),
});

export const pairDeleteResolutionSchema = z.union([
  z.object({
    kind: z.literal("no-impact"),
    report: pairUsageReportSchema,
  }),
  z.object({
    kind: z.literal("executed"),
    report: pairUsageReportSchema,
    cascadedEntries: z.number(),
    deletedPairs: z.number(),
  }),
]);
