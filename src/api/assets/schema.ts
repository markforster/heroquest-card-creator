import { z } from "zod";

import { blobSchema } from "@/api/shared/schema";

export const assetKindSchema = z.enum(["icon", "artwork"]);
export const assetKindStatusSchema = z.enum(["unclassified", "classifying", "classified"]);
export const assetKindSourceSchema = z.enum(["auto", "manual"]);

export const assetRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  width: z.number(),
  height: z.number(),
  createdAt: z.number(),
  assetKind: assetKindSchema.optional(),
  assetKindStatus: assetKindStatusSchema.optional(),
  assetKindSource: assetKindSourceSchema.optional(),
  assetKindConfidence: z.number().optional(),
  assetKindUpdatedAt: z.number().optional(),
});

export const assetRecordWithBlobSchema = assetRecordSchema.extend({
  blob: blobSchema,
});

export const addAssetInputSchema = z.object({
  id: z.string(),
  blob: blobSchema,
  name: z.string(),
  mimeType: z.string(),
  width: z.number(),
  height: z.number(),
  assetKind: assetKindSchema.optional(),
  assetKindStatus: assetKindStatusSchema.optional(),
  assetKindSource: assetKindSourceSchema.optional(),
  assetKindConfidence: z.number().optional(),
  assetKindUpdatedAt: z.number().optional(),
});

export const replaceAssetInputSchema = z.object({
  blob: blobSchema,
  name: z.string(),
  mimeType: z.string(),
  width: z.number(),
  height: z.number(),
  createdAt: z.number().optional(),
  assetKind: assetKindSchema.optional(),
  assetKindStatus: assetKindStatusSchema.optional(),
  assetKindSource: assetKindSourceSchema.optional(),
  assetKindConfidence: z.number().optional(),
  assetKindUpdatedAt: z.number().optional(),
});

export const assetMetadataPatchSchema = z.object({
  name: z.string().optional(),
  mimeType: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  assetKind: assetKindSchema.optional(),
  assetKindStatus: assetKindStatusSchema.optional(),
  assetKindSource: assetKindSourceSchema.optional(),
  assetKindConfidence: z.number().optional(),
  assetKindUpdatedAt: z.number().optional(),
});

export const updateAssetMetadataInputSchema = z.object({
  patch: assetMetadataPatchSchema,
});

export const deleteAssetsInputSchema = z.object({
  ids: z.array(z.string()).min(1),
});
