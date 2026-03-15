import { z } from "zod";

export const collectionRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  cardIds: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
  schemaVersion: z.literal(1),
});

export const collectionCreateInputSchema = collectionRecordSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    schemaVersion: true,
  })
  .extend({
    cardIds: z.array(z.string()).optional(),
    id: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    schemaVersion: z.literal(1).optional(),
  });

export const collectionUpdateInputSchema = collectionRecordSchema
  .omit({
    id: true,
    createdAt: true,
    schemaVersion: true,
  })
  .partial();

export const deleteCollectionInputSchema = z.object({
  id: z.string(),
});
