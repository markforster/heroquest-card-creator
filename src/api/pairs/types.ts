import {
  createPairInputSchema,
  deletePairInputSchema,
  listPairsFilterSchema,
  pairRecordSchema,
} from "@/api/pairs/schema";

import type { z } from "zod";

export type PairRecord = z.infer<typeof pairRecordSchema>;
export type ListPairsFilter = z.infer<typeof listPairsFilterSchema>;
export type CreatePairInput = z.infer<typeof createPairInputSchema>;
export type DeletePairInput = z.infer<typeof deletePairInputSchema>;
