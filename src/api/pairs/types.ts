import {
  createPairInputSchema,
  deletePairInputSchema,
  listPairsFilterSchema,
  pairSummarySchema,
} from "@/api/pairs/schema";

import type { z } from "zod";

export type PairSummary = z.infer<typeof pairSummarySchema>;
export type ListPairsFilter = z.infer<typeof listPairsFilterSchema>;
export type CreatePairInput = z.infer<typeof createPairInputSchema>;
export type DeletePairInput = z.infer<typeof deletePairInputSchema>;
