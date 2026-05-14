import { z } from "zod";

export const deckRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  keySetId: z.string().nullable().optional().default(null),
  createdAt: z.number(),
  updatedAt: z.number(),
  schemaVersion: z.literal(1),
});

export const deckGroupRecordSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  title: z.string(),
  sortIndex: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  schemaVersion: z.literal(1),
});

export const deckSetRecordSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  groupId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  backFaceId: z.string(),
  sortIndex: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  schemaVersion: z.literal(1),
});

export const deckEntryRecordSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  setId: z.string(),
  pairId: z.string(),
  count: z.number().int().min(1).max(12),
  sortIndex: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  schemaVersion: z.literal(1),
});

export const deckCreateInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  keySetId: z.string().nullable().optional(),
});

export const deckUpdateInputSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  keySetId: z.string().nullable().optional(),
});

export const deckGroupCreateInputSchema = z.object({
  title: z.string().min(1),
});

export const deckGroupUpdateInputSchema = z.object({
  title: z.string().min(1),
});

export const deckGroupReorderInputSchema = z.object({
  orderedGroupIds: z.array(z.string()),
});

export const deckSetCreateInputSchema = z.object({
  deckId: z.string(),
  groupId: z.string(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  backFaceId: z.string(),
});

export const deckSetUpdateInputSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  groupId: z.string().optional(),
});

export const deckSetReorderInputSchema = z.object({
  orderedSetIds: z.array(z.string()),
});

export const deckSetRebuildBackInputSchema = z.object({
  newBackFaceId: z.string(),
  frontFaceIds: z.array(z.string()),
});

export const deckEntryAddFrontsInputSchema = z.object({
  frontFaceIds: z.array(z.string()),
});

export const deckEntryRemoveInputSchema = z.object({
  entryIds: z.array(z.string()),
});

export const deckEntryReorderInputSchema = z.object({
  orderedEntryIds: z.array(z.string()),
});

export const deckEntryCountUpdateInputSchema = z.object({
  entryId: z.string(),
  count: z.number().int(),
});

export const deckListFilterSchema = z.object({
  q: z.string().optional(),
});
