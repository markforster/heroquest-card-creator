import { makeApi } from "@zodios/core";
import { z } from "zod";

import {
  createPairInputSchema,
  deletePairInputSchema,
  listPairsFilterSchema,
  pairSummarySchema,
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
    response: z.array(pairSummarySchema),
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
    response: pairSummarySchema,
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
]);
