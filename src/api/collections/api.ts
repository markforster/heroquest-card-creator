import { makeApi } from "@zodios/core";
import { z } from "zod";

import {
  collectionCreateInputSchema,
  collectionRecordSchema,
  collectionUpdateInputSchema,
} from "@/api/collections/schema";

export const collectionsApi = makeApi([
  {
    method: "get",
    path: "/collections",
    alias: "listCollections",
    response: z.array(collectionRecordSchema),
  },
  {
    method: "get",
    path: "/collections/:id",
    alias: "getCollection",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: collectionRecordSchema.nullable(),
  },
  {
    method: "post",
    path: "/collections",
    alias: "createCollection",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: collectionCreateInputSchema,
      },
    ],
    response: collectionRecordSchema,
  },
  {
    method: "put",
    path: "/collections/:id",
    alias: "updateCollection",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "body",
        type: "Body",
        schema: collectionUpdateInputSchema,
      },
    ],
    response: collectionRecordSchema.nullable(),
  },
  {
    method: "delete",
    path: "/collections/:id",
    alias: "deleteCollection",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.void(),
  },
]);
