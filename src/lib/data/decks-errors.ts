/**
 * Identifies a deck, group, and set where a dependent record is currently used.
 */
export type DeckUsageLocation = {
  deckId: string;
  deckTitle: string;
  groupId: string;
  groupTitle: string;
  setId: string;
  setTitle: string;
};

/**
 * Error payload returned when a pair cannot be deleted without violating deck usage constraints.
 */
export type PairInUseError = {
  code: "PAIR_IN_USE";
  usage: DeckUsageLocation[];
};

/**
 * Cascade work that would be performed if a pair deletion is allowed to continue.
 */
export type PairCascadePlan = {
  pairIds: string[];
  entryIds: string[];
  usage: DeckUsageLocation[];
};

/**
 * Preview of the impact of deleting a specific front/back pair.
 */
export type PairUsageReport = {
  frontFaceId: string;
  backFaceId: string;
  mode: "block" | "confirmable-cascade";
  cascadePlan: PairCascadePlan;
};

/**
 * Error payload returned when pair deletion requires explicit cascade confirmation.
 */
export type PairDeleteConfirmRequiredError = {
  code: "PAIR_DELETE_CONFIRM_REQUIRED";
  report: PairUsageReport;
};

/**
 * Card deletion behavior supported by the deck-aware delete flows.
 */
export type CardDeleteMode = "block" | "confirmable-cascade";

/**
 * Cascade work that would be performed if card deletion is allowed to continue.
 */
export type CardDeleteCascadePlan = {
  cardIds: string[];
  deckSetIds: string[];
  deckEntryIds: string[];
  deletedDeckUsage: DeckUsageLocation[];
  pairUsage: DeckUsageLocation[];
};

/**
 * Preview of the deck and pair impact of deleting one or more cards.
 */
export type CardDeleteUsageReport = {
  cardIds: string[];
  mode: CardDeleteMode;
  cascadePlan: CardDeleteCascadePlan;
};

/**
 * Error payload returned when card deletion requires explicit cascade confirmation.
 */
export type CardDeleteConfirmRequiredError = {
  code: "CARD_DELETE_CONFIRM_REQUIRED";
  report: CardDeleteUsageReport;
};

/**
 * Result returned by pair-deletion service methods.
 */
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

/**
 * Union of deck-service error payloads that callers should be prepared to handle.
 */
export type DecksError =
  | PairInUseError
  | PairDeleteConfirmRequiredError
  | CardDeleteConfirmRequiredError
  | {
      code: "DECK_SET_BACK_ALREADY_USED";
      deckId: string;
      backFaceId: string;
      existingSetId: string;
    }
  | {
      code: "DECK_ENTRY_PAIR_ALREADY_USED";
      deckId: string;
      pairId: string;
      existingEntryId: string;
    };

/**
 * Type guard for deck-service pair-in-use errors.
 */
export function isPairInUseError(error: unknown): error is PairInUseError {
  if (!error || typeof error !== "object") return false;
  return "code" in error && (error as { code?: string }).code === "PAIR_IN_USE";
}

/**
 * Creates the canonical pair-in-use error payload.
 */
export function createPairInUseError(usage: DeckUsageLocation[]): PairInUseError {
  return { code: "PAIR_IN_USE", usage };
}

/**
 * Type guard for pair-delete confirmation errors.
 */
export function isPairDeleteConfirmRequiredError(
  error: unknown,
): error is PairDeleteConfirmRequiredError {
  if (!error || typeof error !== "object") return false;
  return "code" in error && (error as { code?: string }).code === "PAIR_DELETE_CONFIRM_REQUIRED";
}

/**
 * Creates the canonical pair-delete confirmation error payload.
 */
export function createPairDeleteConfirmRequiredError(
  report: PairUsageReport,
): PairDeleteConfirmRequiredError {
  return { code: "PAIR_DELETE_CONFIRM_REQUIRED", report };
}

/**
 * Type guard for card-delete confirmation errors.
 */
export function isCardDeleteConfirmRequiredError(
  error: unknown,
): error is CardDeleteConfirmRequiredError {
  if (!error || typeof error !== "object") return false;
  return "code" in error && (error as { code?: string }).code === "CARD_DELETE_CONFIRM_REQUIRED";
}

/**
 * Creates the canonical card-delete confirmation error payload.
 */
export function createCardDeleteConfirmRequiredError(
  report: CardDeleteUsageReport,
): CardDeleteConfirmRequiredError {
  return { code: "CARD_DELETE_CONFIRM_REQUIRED", report };
}
