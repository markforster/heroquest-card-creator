"use client";

import { resolveExportFileName, resolveZipFileName } from "@/components/Stockpile/stockpile-utils";
import { runBulkExport, type BulkExportResult } from "@/lib/export-cards";
import { getCard } from "@/lib/cards-db";
import type { CardPreviewHandle } from "@/components/CardPreview/types";
import type { CardRecord } from "@/types/cards-db";

export type ExportFaceIdsOptions = {
  previewRef: React.RefObject<CardPreviewHandle>;
  resolveName?: (card: CardRecord, usedNames: Map<string, number>) => string;
  resolveZipName?: () => string;
  shouldCancel?: () => boolean;
  onTargetChange?: (card: CardRecord | null) => void;
  onProgress?: (exportedCount: number) => void;
};

const defaultResolveName = (card: CardRecord, usedNames: Map<string, number>) =>
  resolveExportFileName(card.name || card.title || card.templateId, usedNames);

const defaultResolveZipName = () => resolveZipFileName(() => null);

export const exportFaceIdsToZip = async (
  faceIds: string[],
  {
    previewRef,
    resolveName = defaultResolveName,
    resolveZipName = defaultResolveZipName,
    shouldCancel = () => false,
    onTargetChange = () => {},
    onProgress = () => {},
  }: ExportFaceIdsOptions,
): Promise<BulkExportResult> => {
  if (!faceIds.length) {
    return { status: "empty", exportedCount: 0 };
  }

  const records = await Promise.all(
    faceIds.map(async (id) => {
      try {
        return await getCard(id);
      } catch {
        return null;
      }
    }),
  );

  const cards = records.filter((record): record is CardRecord => Boolean(record));
  if (!cards.length) {
    return { status: "empty", exportedCount: 0 };
  }

  return runBulkExport({
    cards,
    previewRef,
    resolveName,
    resolveZipName,
    shouldCancel,
    onTargetChange,
    onProgress,
  });
};
