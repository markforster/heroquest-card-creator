import { z } from "zod";

import { blobSchema } from "@/api/shared";

export const libraryImportInputSchema = z.object({
  file: blobSchema,
  fileName: z.string(),
});

export const libraryExportResultSchema = z.object({
  blob: blobSchema,
  fileName: z.string(),
  meta: z.object({
    cardsCount: z.number(),
    assetsCount: z.number(),
    collectionsCount: z.number(),
    decksCount: z.number(),
    deckGroupsCount: z.number(),
    deckSetsCount: z.number(),
    deckEntriesCount: z.number(),
  }),
});

export const libraryImportResultSchema = z.object({
  cardsCount: z.number(),
  assetsCount: z.number(),
  collectionsCount: z.number(),
  decksCount: z.number(),
  deckGroupsCount: z.number(),
  deckSetsCount: z.number(),
  deckEntriesCount: z.number(),
});
