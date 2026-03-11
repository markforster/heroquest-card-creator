"use client";

import type { CardRecord } from "@/types/cards-db";
import type { PairRecord } from "@/types/pairs-db";

import { getCard } from "./cards-db";
import { openHqccDb } from "./hqcc-db";

import { generateId } from ".";

export type PairSummary = PairRecord;

async function getPairsStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openHqccDb();
  const tx = db.transaction("pairs", mode);
  return tx.objectStore("pairs");
}

function buildPairName(front?: CardRecord | null, back?: CardRecord | null): string {
  const frontName = front?.title ?? front?.name ?? "Untitled front";
  const backName = back?.title ?? back?.name ?? "Untitled back";
  return `${frontName} - ${backName}`;
}

async function listPairsByIndex(
  indexName: "frontFaceId" | "backFaceId",
  faceId: string,
): Promise<PairSummary[]> {
  const store = await getPairsStore("readonly");
  if (!store.indexNames.contains(indexName)) return [];
  const index = store.index(indexName);

  return new Promise<PairSummary[]>((resolve, reject) => {
    const results: PairSummary[] = [];
    const request = index.openCursor(IDBKeyRange.only(faceId));

    request.onsuccess = () => {
      const cursor = request.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve(results);
        return;
      }
      const value = cursor.value as PairRecord;
      results.push(value);
      cursor.continue();
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to list pairs"));
    };
  });
}

async function listAllPairsFromStore(): Promise<PairSummary[]> {
  const store = await getPairsStore("readonly");
  return new Promise<PairSummary[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const values = (request.result as PairRecord[] | undefined) ?? [];
      resolve(values);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to list pairs"));
    };
  });
}

async function listLegacyPairsFromCards(): Promise<PairSummary[]> {
  return [];
}

async function listLegacyPairsForFace(faceId: string): Promise<PairSummary[]> {
  void faceId;
  return [];
}

export async function listPairsForFace(faceId: string): Promise<PairSummary[]> {
  const [frontMatches, backMatches] = await Promise.all([
    listPairsByIndex("frontFaceId", faceId),
    listPairsByIndex("backFaceId", faceId),
  ]);
  const combined = [...frontMatches, ...backMatches];
  if (combined.length > 0) return combined;
  return listLegacyPairsForFace(faceId);
}

export async function listAllPairs(): Promise<PairSummary[]> {
  const pairs = await listAllPairsFromStore();
  if (pairs.length > 0) return pairs;
  return listLegacyPairsFromCards();
}

async function listPairsForBack(backId: string): Promise<PairSummary[]> {
  const pairs = await listPairsForFace(backId);
  return pairs.filter((pair) => pair.backFaceId === backId);
}

export async function createPair(
  frontFaceId: string,
  backFaceId: string,
): Promise<PairSummary> {
  return createPairWithOverrides({ frontFaceId, backFaceId });
}

export async function createPairWithOverrides(input: {
  frontFaceId: string;
  backFaceId: string;
  id?: string;
  name?: string;
  nameLower?: string;
  createdAt?: number;
  updatedAt?: number;
  schemaVersion?: 1;
}): Promise<PairSummary> {
  const existing = await listPairsForFace(input.frontFaceId);
  const match = existing.find(
    (pair) =>
      pair.frontFaceId === input.frontFaceId && pair.backFaceId === input.backFaceId,
  );
  if (match) return match;

  const [front, back] = await Promise.all([
    getCard(input.frontFaceId),
    getCard(input.backFaceId),
  ]);
  const name = input.name ?? buildPairName(front, back);
  const now = Date.now();
  const createdAt = input.createdAt ?? now;
  const updatedAt = input.updatedAt ?? createdAt;
  const record: PairRecord = {
    id: input.id ?? generateId(),
    name,
    nameLower: input.nameLower ?? name.toLocaleLowerCase(),
    frontFaceId: input.frontFaceId,
    backFaceId: input.backFaceId,
    createdAt,
    updatedAt,
    schemaVersion: input.schemaVersion ?? 1,
  };

  const store = await getPairsStore("readwrite");
  await new Promise<void>((resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to create pair"));
  });

  return record;
}

export async function deletePairsForFront(frontFaceId: string): Promise<void> {
  const pairs = await listPairsForFace(frontFaceId);
  const deletions = pairs.filter((pair) => pair.frontFaceId === frontFaceId);
  if (!deletions.length) return;
  const store = await getPairsStore("readwrite");
  await new Promise<void>((resolve, reject) => {
    let remaining = deletions.length;
    deletions.forEach((pair) => {
      const request = store.delete(pair.id);
      request.onsuccess = () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Failed to delete pair"));
      };
    });
  });
}

export async function deletePairsForBack(backFaceId: string): Promise<void> {
  const pairs = await listPairsForFace(backFaceId);
  const deletions = pairs.filter((pair) => pair.backFaceId === backFaceId);
  if (!deletions.length) return;
  const store = await getPairsStore("readwrite");
  await new Promise<void>((resolve, reject) => {
    let remaining = deletions.length;
    deletions.forEach((pair) => {
      const request = store.delete(pair.id);
      request.onsuccess = () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Failed to delete pair"));
      };
    });
  });
}

export async function deletePairsForFace(faceId: string): Promise<void> {
  const pairs = await listPairsForFace(faceId);
  if (!pairs.length) return;
  const store = await getPairsStore("readwrite");
  await new Promise<void>((resolve, reject) => {
    let remaining = pairs.length;
    pairs.forEach((pair) => {
      const request = store.delete(pair.id);
      request.onsuccess = () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Failed to delete pair"));
      };
    });
  });
}

export async function deletePair(frontFaceId: string, backFaceId: string): Promise<void> {
  const pairs = await listPairsForFace(frontFaceId);
  const matches = pairs.filter(
    (pair) => pair.frontFaceId === frontFaceId && pair.backFaceId === backFaceId,
  );
  if (!matches.length) return;
  const store = await getPairsStore("readwrite");
  await new Promise<void>((resolve, reject) => {
    let remaining = matches.length;
    matches.forEach((pair) => {
      const request = store.delete(pair.id);
      request.onsuccess = () => {
        remaining -= 1;
        if (remaining === 0) resolve();
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Failed to delete pair"));
      };
    });
  });
}

export async function replacePairsForBack(
  backFaceId: string,
  frontFaceIds: string[],
): Promise<void> {
  const existing = await listPairsForBack(backFaceId);
  const nextFrontSet = new Set(frontFaceIds);
  const toRemove = existing.filter((pair) => !nextFrontSet.has(pair.frontFaceId ?? ""));
  const existingFronts = new Set(
    existing.map((pair) => pair.frontFaceId).filter((id): id is string => Boolean(id)),
  );
  const toAdd = frontFaceIds.filter((frontId) => !existingFronts.has(frontId));

  if (!toRemove.length && !toAdd.length) return;

  if (toRemove.length) {
    const store = await getPairsStore("readwrite");
    await new Promise<void>((resolve, reject) => {
      let remaining = toRemove.length;
      toRemove.forEach((pair) => {
        const request = store.delete(pair.id);
        request.onsuccess = () => {
          remaining -= 1;
          if (remaining === 0) resolve();
        };
        request.onerror = () => {
          reject(request.error ?? new Error("Failed to delete pair"));
        };
      });
    });
  }

  if (toAdd.length) {
    await Promise.all(toAdd.map((frontId) => createPair(frontId, backFaceId)));
  }
}

export async function getPairedFaceIds(faceId: string): Promise<string[]> {
  const pairs = await listPairsForFace(faceId);
  const ids = new Set<string>();
  pairs.forEach((pair) => {
    if (pair.frontFaceId && pair.frontFaceId !== faceId) {
      ids.add(pair.frontFaceId);
    }
    if (pair.backFaceId && pair.backFaceId !== faceId) {
      ids.add(pair.backFaceId);
    }
  });
  return Array.from(ids);
}
