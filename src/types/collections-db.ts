export interface CollectionRecord {
  id: string;
  name: string;
  description?: string;
  cardIds: string[];
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
}
