"use client";

import JSZip from "jszip";

import { waitForAssetElements, waitForFrame } from "@/components/Stockpile/stockpile-utils";
import { USE_ZIP_COMPRESSION } from "@/config/flags";
import { openDownloadsFolderIfTauri } from "@/lib/tauri";
import type { CardPreviewHandle } from "@/components/CardPreview/types";
import type { CardRecord } from "@/types/cards-db";

export type BulkExportResult =
  | { status: "success"; exportedCount: number }
  | { status: "cancelled"; exportedCount: number }
  | { status: "empty"; exportedCount: 0 }
  | { status: "no-images"; exportedCount: 0 };

export type BulkExportParams = {
  cards: CardRecord[];
  previewRef: React.RefObject<CardPreviewHandle>;
  resolveName: (card: CardRecord, usedNames: Map<string, number>) => string;
  resolveZipName: () => string;
  shouldCancel: () => boolean;
  onTargetChange: (card: CardRecord | null) => void;
  onProgress: (exportedCount: number) => void;
};

export const runBulkExport = async ({
  cards,
  previewRef,
  resolveName,
  resolveZipName,
  shouldCancel,
  onTargetChange,
  onProgress,
}: BulkExportParams): Promise<BulkExportResult> => {
  if (!cards.length) {
    return { status: "empty", exportedCount: 0 };
  }

  const usedNames = new Map<string, number>();
  const zip = new JSZip();
  let exportedCount = 0;

  for (const card of cards) {
    if (shouldCancel()) {
      return { status: "cancelled", exportedCount };
    }
    onTargetChange(card);
    await waitForFrame();
    await waitForFrame();

    const assetIds = [card.imageAssetId, card.monsterIconAssetId].filter(
      (id): id is string => Boolean(id),
    );
    await waitForAssetElements(() => previewRef.current?.getSvgElement(), assetIds);

    const pngBlob = await previewRef.current?.renderToPngBlob();
    if (!pngBlob) {
      if (shouldCancel()) {
        return { status: "cancelled", exportedCount };
      }
      continue;
    }

    const fileName = resolveName(card, usedNames);
    zip.file(fileName, pngBlob);
    exportedCount += 1;
    onProgress(exportedCount);
  }

  if (shouldCancel()) {
    return { status: "cancelled", exportedCount };
  }

  if (!exportedCount) {
    return { status: "no-images", exportedCount: 0 };
  }

  const zipBlob = await zip.generateAsync({
    type: "blob",
    ...(USE_ZIP_COMPRESSION ? { compression: "DEFLATE", compressionOptions: { level: 6 } } : {}),
  });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = resolveZipName();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  void openDownloadsFolderIfTauri();

  return { status: "success", exportedCount };
};
