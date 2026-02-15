"use client";

import type { PairRecord } from "@/types/pairs-db";
import type { CardRecord } from "@/types/cards-db";

import { openHqccDb } from "./hqcc-db";
import { getCard, listCards } from "./cards-db";

export type PairSummary = Pick<
  PairRecord,
  "id" | "name" | "nameLower" | "frontFaceId" | "backFaceId"
>;

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
      results.push({
        id: value.id,
        name: value.name,
        nameLower: value.nameLower,
        frontFaceId: value.frontFaceId,
        backFaceId: value.backFaceId,
      });
      cursor.continue();
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to list pairs"));
    };
  });
}

async function listLegacyPairsForFace(faceId: string): Promise<PairSummary[]> {
  const active = await getCard(faceId);
  if (!active) return [];

  const isFront = active.face === "front";
  if (isFront && active.pairedWith) {
    const back = await getCard(active.pairedWith);
    if (!back) return [];
    const name = buildPairName(active, back);
    return [
      {
        id: `legacy:${active.id}:${back.id}`,
        name,
        nameLower: name.toLocaleLowerCase(),
        frontFaceId: active.id,
        backFaceId: back.id,
      },
    ];
  }

  const cards = await listCards({ status: "saved" });
  const matches = cards.filter((card) => card.pairedWith === faceId);
  if (!matches.length) return [];

  const summaries: PairSummary[] = [];
  matches.forEach((front) => {
    const name = buildPairName(front, active);
    summaries.push({
      id: `legacy:${front.id}:${active.id}`,
      name,
      nameLower: name.toLocaleLowerCase(),
      frontFaceId: front.id,
      backFaceId: active.id,
    });
  });
  return summaries;
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
