"use client";

import type { CardPreviewHandle } from "@/components/Cards/CardPreview/types";
import { resolveExportFileName, resolveZipFileName } from "@/components/Stockpile/stockpile-utils";
import { getCard } from "@/lib/cards-db";
import { runBulkExport, type BulkExportResult } from "@/lib/export-cards";
import type { CardRecord } from "@/types/cards-db";

export type ExportFaceIdsOptions = {
  previewRef: React.RefObject<CardPreviewHandle>;
  resolveName?: (card: CardRecord, usedNames: Map<string, number>) => string;
  resolveZipName?: () => string;
  shouldCancel?: () => boolean;
  onTargetChange?: (card: CardRecord | null) => void;
  onProgress?: (exportedCount: number) => void;
  onZipProgress?: (percent: number) => void;
  onZipStatus?: (mode: "worker" | "fallback") => void;
  skipCardIds?: Set<string>;
  skipCardNotes?: Map<string, string>;
  bleedPx?: number;
  cropMarks?: { enabled: boolean; color: string; style?: "lines" | "squares" };
  cutMarks?: { enabled: boolean; color: string };
  roundedCorners?: boolean;
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
    onZipProgress,
    onZipStatus,
    skipCardIds,
    skipCardNotes,
    bleedPx,
    cropMarks,
    cutMarks,
    roundedCorners,
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
    onZipProgress,
    onZipStatus,
    skipCardIds,
    skipCardNotes,
    bleedPx,
    cropMarks,
    cutMarks,
    roundedCorners,
  });
};
