export type DeckUsageLocation = {
  deckId: string;
  deckTitle: string;
  groupId: string;
  groupTitle: string;
  setId: string;
  setTitle: string;
};

export type PairInUseError = {
  code: "PAIR_IN_USE";
  usage: DeckUsageLocation[];
};

export type PairCascadePlan = {
  pairIds: string[];
  entryIds: string[];
  usage: DeckUsageLocation[];
};

export type PairUsageReport = {
  frontFaceId: string;
  backFaceId: string;
  mode: "block" | "confirmable-cascade";
  cascadePlan: PairCascadePlan;
};

export type PairDeleteConfirmRequiredError = {
  code: "PAIR_DELETE_CONFIRM_REQUIRED";
  report: PairUsageReport;
};

export type PairDeleteResolution =
  | {
      kind: "no-impact";
      report: PairUsageReport;
    }
  | {
      kind: "executed";
      report: PairUsageReport;
      cascadedEntries: number;
      deletedPairs: number;
    };

export type DecksError =
  | PairInUseError
  | PairDeleteConfirmRequiredError
  | { code: "DECK_SET_BACK_ALREADY_USED"; deckId: string; backFaceId: string; existingSetId: string }
  | { code: "DECK_ENTRY_PAIR_ALREADY_USED"; deckId: string; pairId: string; existingEntryId: string };

export function isPairInUseError(error: unknown): error is PairInUseError {
  if (!error || typeof error !== "object") return false;
  return "code" in error && (error as { code?: string }).code === "PAIR_IN_USE";
}

export function createPairInUseError(usage: DeckUsageLocation[]): PairInUseError {
  return { code: "PAIR_IN_USE", usage };
}

export function isPairDeleteConfirmRequiredError(
  error: unknown,
): error is PairDeleteConfirmRequiredError {
  if (!error || typeof error !== "object") return false;
  return (
    "code" in error &&
    (error as { code?: string }).code === "PAIR_DELETE_CONFIRM_REQUIRED"
  );
}

export function createPairDeleteConfirmRequiredError(
  report: PairUsageReport,
): PairDeleteConfirmRequiredError {
  return { code: "PAIR_DELETE_CONFIRM_REQUIRED", report };
}
