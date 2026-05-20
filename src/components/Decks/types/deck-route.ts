import type { DeckEntryRecord, DeckGroupRecord, DeckSetRecord } from "@/api/decks";
import type { PairRecord } from "@/api/pairs";

export type DeckMutationCommands = {
  createDeck: (title: string, description: string, fallbackTitle: string) => Promise<string | null>;
  updateDeck: (
    deckId: string,
    title: string,
    description: string,
    fallbackTitle: string,
  ) => Promise<void>;
  updateDeckTitle: (deckId: string, title: string, fallbackTitle: string) => Promise<void>;
  setDeckKeySet: (deckId: string, keySetId: string | null) => Promise<void>;
  deleteDecks: (ids: string[]) => Promise<void>;
  duplicateDeck: (deckId: string) => Promise<string | null>;
  createSetFromBackFace: (
    deckId: string,
    groupId: string,
    backFaceId: string,
  ) => Promise<DeckSetRecord>;
  addFrontToSetAndRefresh: (
    setId: string,
    frontFaceId: string,
  ) => Promise<{ entries: DeckEntryRecord[]; pairsById: Map<string, PairRecord> }>;
  removeEntryAndRefresh: (entryId: string, setId: string) => Promise<DeckEntryRecord[]>;
  refreshEntriesAndPairs: (
    setId: string,
  ) => Promise<{ entries: DeckEntryRecord[]; pairsById: Map<string, PairRecord> }>;
  deleteSet: (setId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  rebuildSetBack: (setId: string, newBackFaceId: string, frontFaceIds: string[]) => Promise<void>;
  reorderEntries: (setId: string, orderedEntryIds: string[]) => Promise<void>;
  createGroup: (deckId: string) => Promise<DeckGroupRecord>;
  reorderGroups: (deckId: string, orderedGroupIds: string[]) => Promise<void>;
  reorderSets: (setId: string, orderedSetIds: string[]) => Promise<void>;
  updateSetGroup: (setId: string, groupId: string) => Promise<void>;
  listPairsMap: () => Promise<Map<string, PairRecord>>;
};
