import { makeApi } from "@zodios/core";
import { z } from "zod";

import {
  cardCreateInputSchema,
  cardRecordSchema,
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
  cardThumbnailResponseSchema,
} from "@/api/cards/schema";

export const cardsApi = makeApi([
  {
    method: "get",
    path: "/cards",
    alias: "listCards",
    parameters: [
      {
        name: "templateId",
        type: "Query",
        schema: listCardsFilterSchema.shape.templateId,
      },
      {
        name: "status",
        type: "Query",
        schema: listCardsFilterSchema.shape.status,
      },
      {
        name: "search",
        type: "Query",
        schema: listCardsFilterSchema.shape.search,
      },
      {
        name: "deleted",
        type: "Query",
        schema: listCardsFilterSchema.shape.deleted,
      },
    ],
    response: z.array(cardRecordSchema),
  },
  {
    method: "get",
    path: "/cards/:id",
    alias: "getCard",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: cardRecordSchema.nullable(),
  },
  {
    method: "get",
    path: "/cards/:id/thumbnail",
    alias: "getCardThumbnail",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: cardThumbnailResponseSchema,
  },
  {
    method: "post",
    path: "/cards",
    alias: "createCard",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: cardCreateInputSchema,
      },
    ],
    response: cardRecordSchema,
  },
  {
    method: "put",
    path: "/cards/:id",
    alias: "updateCard",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "body",
        type: "Body",
        schema: cardUpdateInputSchema,
      },
    ],
    response: cardRecordSchema.nullable(),
  },
  {
    method: "put",
    path: "/cards/:id/thumbnail",
    alias: "updateCardThumbnail",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "body",
        type: "Body",
        schema: updateCardThumbnailInputSchema,
      },
    ],
    response: z.boolean(),
  },
  {
    method: "delete",
    path: "/cards/:id",
    alias: "deleteCard",
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
    path: "/cards/delete",
    alias: "deleteCards",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: deleteCardsInputSchema,
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/cards/soft-delete",
    alias: "softDeleteCards",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: softDeleteCardsInputSchema,
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/cards/restore",
    alias: "restoreCards",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: restoreCardsInputSchema,
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/cards/:id/touch",
    alias: "touchCardLastViewed",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "body",
        type: "Body",
        schema: touchCardLastViewedInputSchema,
      },
    ],
    response: cardRecordSchema.nullable(),
  },
  {
    method: "post",
    path: "/cards/bulk-update",
    alias: "updateCards",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: updateCardsInputSchema,
      },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/cards/normalize-self-pairings",
    alias: "normalizeSelfPairings",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: normalizeSelfPairingsInputSchema,
      },
    ],
    response: normalizeSelfPairingsResponseSchema,
  },
]);
