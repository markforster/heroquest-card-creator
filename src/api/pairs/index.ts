export { pairsApi } from "@/api/pairs/api";
export {
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
export type {
  CreatePairInput,
  DeckUsageLocation,
  DeletePairsForFacesInput,
  DeletePairInput,
  ListPairsFilter,
  PairDeleteResolution,
  PairRecord,
  PairUsageReport,
  PreviewDeletePairInput,
} from "@/api/pairs/types";
