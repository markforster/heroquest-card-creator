import {
  deckCreateInputSchema,
  deckEntryAddFrontsInputSchema,
  deckEntryRecordSchema,
  deckEntryRemoveInputSchema,
  deckEntryReorderInputSchema,
  deckEntryCountUpdateInputSchema,
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

import type { z } from "zod";

export type DeckRecord = z.infer<typeof deckRecordSchema>;
export type DeckGroupRecord = z.infer<typeof deckGroupRecordSchema>;
export type DeckSetRecord = z.infer<typeof deckSetRecordSchema>;
export type DeckEntryRecord = z.infer<typeof deckEntryRecordSchema>;

export type DeckCreateInput = z.infer<typeof deckCreateInputSchema>;
export type DeckUpdateInput = z.infer<typeof deckUpdateInputSchema>;
export type DeckListFilter = z.infer<typeof deckListFilterSchema>;

export type DeckGroupCreateInput = z.infer<typeof deckGroupCreateInputSchema>;
export type DeckGroupUpdateInput = z.infer<typeof deckGroupUpdateInputSchema>;
export type DeckGroupReorderInput = z.infer<typeof deckGroupReorderInputSchema>;

export type DeckSetCreateInput = z.infer<typeof deckSetCreateInputSchema>;
export type DeckSetUpdateInput = z.infer<typeof deckSetUpdateInputSchema>;
export type DeckSetReorderInput = z.infer<typeof deckSetReorderInputSchema>;
export type DeckSetRebuildBackInput = z.infer<typeof deckSetRebuildBackInputSchema>;

export type DeckEntryAddFrontsInput = z.infer<typeof deckEntryAddFrontsInputSchema>;
export type DeckEntryRemoveInput = z.infer<typeof deckEntryRemoveInputSchema>;
export type DeckEntryReorderInput = z.infer<typeof deckEntryReorderInputSchema>;
export type DeckEntryCountUpdateInput = z.infer<typeof deckEntryCountUpdateInputSchema>;
