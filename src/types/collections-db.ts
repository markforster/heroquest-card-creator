/**
 * Persisted collection record used to organize cards in the stockpile.
 */
export interface CollectionRecord {
  id: string;
  name: string;
  description?: string;
  cardIds: string[];
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
}
