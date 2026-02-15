export interface PairRecord {
  id: string;
  name: string;
  nameLower: string;
  frontFaceId: string | null;
  backFaceId: string | null;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
}
