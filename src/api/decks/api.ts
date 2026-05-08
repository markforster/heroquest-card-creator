import { makeApi } from "@zodios/core";
import { z } from "zod";

import {
  deckCreateInputSchema,
  deckEntryAddFrontsInputSchema,
  deckEntryRecordSchema,
  deckEntryRemoveInputSchema,
  deckEntryReorderInputSchema,
  deckGroupCreateInputSchema,
  deckGroupRecordSchema,
  deckGroupReorderInputSchema,
  deckGroupUpdateInputSchema,
  deckListFilterSchema,
  deckRecordSchema,
  deckSetCreateInputSchema,
  deckSetRecordSchema,
  deckSetRebuildBackInputSchema,
  deckSetReorderInputSchema,
  deckSetUpdateInputSchema,
  deckUpdateInputSchema,
} from "@/api/decks/schema";

export const decksApi = makeApi([
  {
    method: "get",
    path: "/decks",
    alias: "listDecks",
    parameters: [
      {
        name: "q",
        type: "Query",
        schema: deckListFilterSchema.shape.q,
      },
    ],
    response: z.array(deckRecordSchema),
  },
  {
    method: "post",
    path: "/decks",
    alias: "createDeck",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: deckCreateInputSchema,
      },
    ],
    response: deckRecordSchema,
  },
  {
    method: "get",
    path: "/decks/:deckId",
    alias: "getDeck",
    parameters: [
      { name: "deckId", type: "Path", schema: z.string() },
    ],
    response: deckRecordSchema.nullable(),
  },
  {
    method: "patch",
    path: "/decks/:deckId",
    alias: "updateDeck",
    parameters: [
      { name: "deckId", type: "Path", schema: z.string() },
      { name: "body", type: "Body", schema: deckUpdateInputSchema },
    ],
    response: deckRecordSchema.nullable(),
  },
  {
    method: "post",
    path: "/decks/:deckId/duplicate",
    alias: "duplicateDeck",
    parameters: [
      { name: "deckId", type: "Path", schema: z.string() },
    ],
    response: deckRecordSchema.nullable(),
  },
  {
    method: "delete",
    path: "/decks/:deckId",
    alias: "deleteDeck",
    parameters: [
      { name: "deckId", type: "Path", schema: z.string() },
    ],
    response: z.void(),
  },

  {
    method: "get",
    path: "/decks/:deckId/groups",
    alias: "listDeckGroups",
    parameters: [
      { name: "deckId", type: "Path", schema: z.string() },
    ],
    response: z.array(deckGroupRecordSchema),
  },
  {
    method: "post",
    path: "/decks/:deckId/groups",
    alias: "createDeckGroup",
    parameters: [
      { name: "deckId", type: "Path", schema: z.string() },
      { name: "body", type: "Body", schema: deckGroupCreateInputSchema },
    ],
    response: deckGroupRecordSchema,
  },
  {
    method: "patch",
    path: "/deckGroups/:groupId",
    alias: "updateDeckGroup",
    parameters: [
      { name: "groupId", type: "Path", schema: z.string() },
      { name: "body", type: "Body", schema: deckGroupUpdateInputSchema },
    ],
    response: deckGroupRecordSchema.nullable(),
  },
  {
    method: "post",
    path: "/decks/:deckId/groups/reorder",
    alias: "reorderDeckGroups",
    parameters: [
      { name: "deckId", type: "Path", schema: z.string() },
      { name: "body", type: "Body", schema: deckGroupReorderInputSchema },
    ],
    response: z.void(),
  },
  {
    method: "delete",
    path: "/deckGroups/:groupId",
    alias: "deleteDeckGroup",
    parameters: [
      { name: "groupId", type: "Path", schema: z.string() },
    ],
    response: z.void(),
  },

  {
    method: "get",
    path: "/decks/:deckId/sets",
    alias: "listDeckSets",
    parameters: [
      { name: "deckId", type: "Path", schema: z.string() },
    ],
    response: z.array(deckSetRecordSchema),
  },
  {
    method: "post",
    path: "/deckSets",
    alias: "createDeckSet",
    parameters: [
      { name: "body", type: "Body", schema: deckSetCreateInputSchema },
    ],
    response: deckSetRecordSchema,
  },
  {
    method: "get",
    path: "/deckSets/:setId",
    alias: "getDeckSet",
    parameters: [
      { name: "setId", type: "Path", schema: z.string() },
    ],
    response: deckSetRecordSchema.nullable(),
  },
  {
    method: "patch",
    path: "/deckSets/:setId",
    alias: "updateDeckSet",
    parameters: [
      { name: "setId", type: "Path", schema: z.string() },
      { name: "body", type: "Body", schema: deckSetUpdateInputSchema },
    ],
    response: deckSetRecordSchema.nullable(),
  },
  {
    method: "post",
    path: "/deckSets/:setId/reorder",
    alias: "reorderDeckSets",
    parameters: [
      { name: "setId", type: "Path", schema: z.string() },
      { name: "body", type: "Body", schema: deckSetReorderInputSchema },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/deckSets/:setId/rebuildBack",
    alias: "rebuildDeckSetBack",
    parameters: [
      { name: "setId", type: "Path", schema: z.string() },
      { name: "body", type: "Body", schema: deckSetRebuildBackInputSchema },
    ],
    response: z.void(),
  },
  {
    method: "delete",
    path: "/deckSets/:setId",
    alias: "deleteDeckSet",
    parameters: [
      { name: "setId", type: "Path", schema: z.string() },
    ],
    response: z.void(),
  },

  {
    method: "get",
    path: "/deckSets/:setId/entries",
    alias: "listDeckEntries",
    parameters: [
      { name: "setId", type: "Path", schema: z.string() },
    ],
    response: z.array(deckEntryRecordSchema),
  },
  {
    method: "post",
    path: "/deckSets/:setId/entries/add-fronts",
    alias: "addDeckEntries",
    parameters: [
      { name: "setId", type: "Path", schema: z.string() },
      { name: "body", type: "Body", schema: deckEntryAddFrontsInputSchema },
    ],
    response: z.array(deckEntryRecordSchema),
  },
  {
    method: "post",
    path: "/deckSets/:setId/entries/remove",
    alias: "removeDeckEntries",
    parameters: [
      { name: "setId", type: "Path", schema: z.string() },
      { name: "body", type: "Body", schema: deckEntryRemoveInputSchema },
    ],
    response: z.void(),
  },
  {
    method: "post",
    path: "/deckSets/:setId/entries/reorder",
    alias: "reorderDeckEntries",
    parameters: [
      { name: "setId", type: "Path", schema: z.string() },
      { name: "body", type: "Body", schema: deckEntryReorderInputSchema },
    ],
    response: z.void(),
  },
]);
