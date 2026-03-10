import {
  addAssetInputSchema,
  assetKindSchema,
  assetKindSourceSchema,
  assetKindStatusSchema,
  assetMetadataPatchSchema,
  assetRecordSchema,
  assetRecordWithBlobSchema,
  deleteAssetsInputSchema,
  replaceAssetInputSchema,
  updateAssetMetadataInputSchema,
} from "@/api/assets/schema";

import type { z } from "zod";

export type AssetKind = z.infer<typeof assetKindSchema>;
export type AssetKindStatus = z.infer<typeof assetKindStatusSchema>;
export type AssetKindSource = z.infer<typeof assetKindSourceSchema>;
export type AssetRecord = z.infer<typeof assetRecordSchema>;
export type AssetRecordWithBlob = z.infer<typeof assetRecordWithBlobSchema>;
export type AddAssetInput = z.infer<typeof addAssetInputSchema>;
export type ReplaceAssetInput = z.infer<typeof replaceAssetInputSchema>;
export type AssetMetadataPatch = z.infer<typeof assetMetadataPatchSchema>;
export type UpdateAssetMetadataInput = z.infer<typeof updateAssetMetadataInputSchema>;
export type DeleteAssetsInput = z.infer<typeof deleteAssetsInputSchema>;
