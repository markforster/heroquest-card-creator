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

export type DecksError = PairInUseError | { code: "DECK_SET_BACK_ALREADY_USED"; deckId: string; backFaceId: string; existingSetId: string } | { code: "DECK_ENTRY_PAIR_ALREADY_USED"; deckId: string; pairId: string; existingEntryId: string };

export function isPairInUseError(error: unknown): error is PairInUseError {
  if (!error || typeof error !== "object") return false;
  return "code" in error && (error as { code?: string }).code === "PAIR_IN_USE";
}

export function createPairInUseError(usage: DeckUsageLocation[]): PairInUseError {
  return { code: "PAIR_IN_USE", usage };
}
