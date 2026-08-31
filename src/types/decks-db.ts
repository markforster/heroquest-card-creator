/**
 * Persisted top-level deck record.
 */
export type DeckRecord = {
  id: string;
  title: string;
  description: string | null;
  keySetId?: string | null;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
};

/**
 * Persisted deck group record that orders sets within a deck.
 */
export type DeckGroupRecord = {
  id: string;
  deckId: string;
  title?: string;
  sortIndex: number;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
};

/**
 * Persisted deck set record that binds a back face to a group and deck.
 */
export type DeckSetRecord = {
  id: string;
  deckId: string;
  groupId: string;
  title?: string;
  description: string | null;
  backFaceId: string;
  sortIndex: number;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
};

/**
 * Persisted deck entry record that links a pair into a set.
 */
export type DeckEntryRecord = {
  id: string;
  deckId: string;
  setId: string;
  pairId: string;
  count?: number | null;
  sortIndex: number;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
};
