"use client";

import { apiClient } from "@/api/client";
import type { CardDataByTemplate } from "@/types/card-data";
import type { CardRecord } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";

type AssetSource = {
  imageAssetId?: string;
  imageAssetName?: string;
  monsterIconAssetId?: string;
  monsterIconAssetName?: string;
  iconAssetId?: string;
  iconAssetName?: string;
  face?: string;
  templateId?: string;
  title?: string;
  name?: string;
};

export const EXPORT_CHUNK_SIZE = 12;

export type MissingAssetReport = {
  cardId: string;
  title: string;
  templateId: string;
  face: string;
  thumbnailBlob?: Blob | null;
  missing: { label: "image" | "icon"; id: string; name: string }[];
};

export function collectAssetIdsFromCard(
  card: CardRecord | CardDataByTemplate[TemplateId],
): string[] {
  const source = card as AssetSource;
  const ids: string[] = [];
  if (typeof source.imageAssetId === "string" && source.imageAssetId) {
    ids.push(source.imageAssetId);
  }
  if (typeof source.monsterIconAssetId === "string" && source.monsterIconAssetId) {
    ids.push(source.monsterIconAssetId);
  }
  if (typeof source.iconAssetId === "string" && source.iconAssetId) {
    ids.push(source.iconAssetId);
  }
  return ids;
}

export async function buildAssetCache(assetIds: string[]): Promise<{
  cache: Map<string, Blob>;
  missing: Set<string>;
}> {
  const cache = new Map<string, Blob>();
  const missing = new Set<string>();
  const uniqueIds = Array.from(new Set(assetIds));

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const blob = await apiClient.getAssetBlob({ params: { id } });
        if (blob) {
          cache.set(id, blob);
        } else {
          missing.add(id);
        }
      } catch {
        missing.add(id);
      }
    }),
  );

  return { cache, missing };
}

export async function buildMissingAssetsReport(
  cards: CardRecord[],
): Promise<MissingAssetReport[]> {
  const reports: MissingAssetReport[] = [];

  for (let start = 0; start < cards.length; start += EXPORT_CHUNK_SIZE) {
    const chunk = cards.slice(start, start + EXPORT_CHUNK_SIZE);
    if (!chunk.length) break;

    const assetIds = chunk.flatMap((card) => collectAssetIdsFromCard(card));
    const { missing } = await buildAssetCache(assetIds);

    chunk.forEach((card) => {
      const missingAssets: MissingAssetReport["missing"] = [];
      if (card.imageAssetId && missing.has(card.imageAssetId)) {
        missingAssets.push({
          label: "image",
          id: card.imageAssetId,
          name: card.imageAssetName ?? "unknown",
        });
      }
      if (card.monsterIconAssetId && missing.has(card.monsterIconAssetId)) {
        missingAssets.push({
          label: "icon",
          id: card.monsterIconAssetId,
          name: card.monsterIconAssetName ?? "unknown",
        });
      }
      if (missingAssets.length > 0) {
        reports.push({
          cardId: card.id,
          title: card.title ?? card.name ?? "Untitled",
          templateId: card.templateId,
          face: card.face ?? "unknown",
          thumbnailBlob: card.thumbnailBlob ?? null,
          missing: missingAssets,
        });
      }
    });
  }

  return reports;
}
