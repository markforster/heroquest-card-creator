import { makeApi } from "@zodios/core";
import { z } from "zod";

import {
  addAssetInputSchema,
  assetRecordSchema,
  assetRecordWithBlobSchema,
  deleteAssetsInputSchema,
  replaceAssetInputSchema,
  updateAssetMetadataInputSchema,
} from "@/api/assets/schema";

export const assetsApi = makeApi([
  {
    method: "get",
    path: "/assets",
    alias: "listAssets",
    response: z.array(assetRecordSchema),
  },
  {
    method: "get",
    path: "/assets/with-blobs",
    alias: "listAssetsWithBlobs",
    response: z.array(assetRecordWithBlobSchema),
  },
  {
    method: "get",
    path: "/assets/:id/blob",
    alias: "getAssetBlob",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: assetRecordWithBlobSchema.shape.blob.nullable(),
  },
  {
    method: "get",
    path: "/assets/:id/object-url",
    alias: "getAssetObjectUrl",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.string().nullable(),
  },
  {
    method: "post",
    path: "/assets",
    alias: "addAsset",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: addAssetInputSchema,
      },
    ],
    response: z.void(),
  },
  {
    method: "put",
    path: "/assets/:id",
    alias: "replaceAsset",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "body",
        type: "Body",
        schema: replaceAssetInputSchema,
      },
    ],
    response: z.void(),
  },
  {
    method: "put",
    path: "/assets/:id/metadata",
    alias: "updateAssetMetadata",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "body",
        type: "Body",
        schema: updateAssetMetadataInputSchema,
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/assets/:id/classification/reset",
    alias: "resetAssetClassification",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/assets/classification/reset",
    alias: "resetAssetClassificationAll",
    response: z.number(),
  },
  {
    method: "delete",
    path: "/assets",
    alias: "deleteAssets",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: deleteAssetsInputSchema,
      },
    ],
    response: z.void(),
  },
]);
