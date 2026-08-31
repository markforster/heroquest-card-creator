import {
  createPairInputSchema,
  deckUsageLocationSchema,
  deletePairsForFacesInputSchema,
  deletePairInputSchema,
  listPairsFilterSchema,
  pairRecordSchema,
  pairDeleteResolutionSchema,
  pairUsageReportSchema,
  previewDeletePairInputSchema,
} from "@/api/pairs/schema";

import type { z } from "zod";

export type PairRecord = z.infer<typeof pairRecordSchema>;
export type ListPairsFilter = z.infer<typeof listPairsFilterSchema>;
export type CreatePairInput = z.infer<typeof createPairInputSchema>;
export type DeletePairInput = z.infer<typeof deletePairInputSchema>;
export type DeckUsageLocation = z.infer<typeof deckUsageLocationSchema>;
export type PairUsageReport = z.infer<typeof pairUsageReportSchema>;
export type PreviewDeletePairInput = z.infer<typeof previewDeletePairInputSchema>;
export type DeletePairsForFacesInput = z.infer<typeof deletePairsForFacesInputSchema>;
export type PairDeleteResolution = z.infer<typeof pairDeleteResolutionSchema>;
