import { makeApi } from "@zodios/core";
import { z } from "zod";

import {
  createPairInputSchema,
  deletePairsForFacesInputSchema,
  deletePairInputSchema,
  listPairsFilterSchema,
  pairDeleteResolutionSchema,
  pairRecordSchema,
  pairUsageReportSchema,
  previewDeletePairInputSchema,
} from "@/api/pairs/schema";

export const pairsApi = makeApi([
  {
    method: "get",
    path: "/pairs",
    alias: "listPairs",
    parameters: [
      {
        name: "faceId",
        type: "Query",
        schema: listPairsFilterSchema.shape.faceId,
      },
    ],
    response: z.array(pairRecordSchema),
  },
  {
    method: "post",
    path: "/pairs",
    alias: "createPair",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: createPairInputSchema,
      },
    ],
    response: pairRecordSchema,
  },
  {
    method: "delete",
    path: "/pairs",
    alias: "deletePair",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: deletePairInputSchema,
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/pairs/preview-delete",
    alias: "previewDeletePair",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: previewDeletePairInputSchema,
      },
    ],
    response: pairUsageReportSchema,
  },
  {
    method: "post",
    path: "/pairs/delete-for-faces",
    alias: "deletePairsForFaces",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: deletePairsForFacesInputSchema,
      },
    ],
    response: pairDeleteResolutionSchema,
  },
]);
