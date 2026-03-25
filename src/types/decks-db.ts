export type DeckRecord = {
  id: string;
  title: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
};

export type DeckGroupRecord = {
  id: string;
  deckId: string;
  title: string;
  sortIndex: number;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
};

export type DeckSetRecord = {
  id: string;
  deckId: string;
  groupId: string;
  title: string;
  description: string | null;
  backFaceId: string;
  sortIndex: number;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
};

export type DeckEntryRecord = {
  id: string;
  deckId: string;
  setId: string;
  pairId: string;
  sortIndex: number;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
};
