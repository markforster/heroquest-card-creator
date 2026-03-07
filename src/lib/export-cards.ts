"use client";

import { waitForAssetElements, waitForFrame } from "@/components/Stockpile/stockpile-utils";
import { USE_ZIP_COMPRESSION } from "@/config/flags";
import {
  endExportLogging,
  logAssetPrefetch,
  logCardInfo,
  logCardFileName,
  logCardRender,
  logCardSkip,
  logCardWait,
  logDeviceInfo,
  logSummary,
  startExportLogging,
} from "@/lib/export-logging";
import {
  buildAssetCache,
  collectAssetIdsFromCard,
  EXPORT_CHUNK_SIZE,
} from "@/lib/export-assets-cache";
import { openDownloadsFolderIfTauri } from "@/lib/tauri";
import { createZipBlobWithProgress } from "@/lib/zip-utils";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview/types";
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
  onZipProgress?: (percent: number) => void;
  onZipStatus?: (mode: "worker" | "fallback") => void;
  skipCardIds?: Set<string>;
  skipCardNotes?: Map<string, string>;
  bleedPx?: number;
  cropMarks?: { enabled: boolean; color: string; style?: "lines" | "squares" };
  cutMarks?: { enabled: boolean; color: string };
  roundedCorners?: boolean;
};

export const runBulkExport = async ({
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
}: BulkExportParams): Promise<BulkExportResult> => {
  const session = startExportLogging({ mode: "bulk", totalCards: cards.length });
  logDeviceInfo(session);

  let renders = 0;
  let failures = 0;

  if (!cards.length) {
    const endedAt = Date.now();
    logSummary(session, {
      endedAt,
      totalMs: endedAt - session.startedAt,
      cards: 0,
      renders,
      failures,
    });
    endExportLogging(session);
    return { status: "empty", exportedCount: 0 };
  }

  const usedNames = new Map<string, number>();
  const zipFiles: { name: string; data: Blob | string }[] = [];
  const zipNameSet = new Set<string>();
  let exportedCount = 0;
  const exportNotes: string[] = [];
  const skipIds = skipCardIds ?? new Set<string>();
  const skipNotes = skipCardNotes ?? new Map<string, string>();

  try {
    for (let start = 0; start < cards.length; start += EXPORT_CHUNK_SIZE) {
      const chunk = cards.slice(start, start + EXPORT_CHUNK_SIZE);
      if (!chunk.length) break;

      const exportableChunk = chunk.filter((card) => !skipIds.has(card.id));
      const chunkAssetIds = exportableChunk.flatMap((card) => collectAssetIdsFromCard(card));
      const { cache, missing } = await buildAssetCache(chunkAssetIds);
      logAssetPrefetch(session, {
        total: chunkAssetIds.length,
        cached: cache.size,
        missing: missing.size,
      });

      for (const card of chunk) {
        if (skipIds.has(card.id)) {
          failures += 1;
          const note =
            skipNotes.get(card.id) ??
            `Card "${card.title ?? card.name ?? "Untitled"}" (id=${card.id}, template=${
              card.templateId
            }, face=${card.face ?? "unknown"}) was skipped due to missing assets.`;
          logCardSkip(session, { reason: note });
          exportNotes.push(note);
          continue;
        }
        if (shouldCancel()) {
          return { status: "cancelled", exportedCount };
        }
        onTargetChange(card);
        await waitForFrame();
        await waitForFrame();

        logCardInfo(session, {
          cardId: card.id,
          title: card.title ?? card.name,
          templateId: card.templateId,
          face: card.face ?? "unknown",
          imageAsset: { id: card.imageAssetId, name: card.imageAssetName },
          iconAsset: { id: card.monsterIconAssetId, name: card.monsterIconAssetName },
        });

        const missingAssets: { label: string; id: string; name?: string | null }[] = [];
        if (card.imageAssetId && missing.has(card.imageAssetId)) {
          missingAssets.push({
            label: "image",
            id: card.imageAssetId,
            name: card.imageAssetName ?? null,
          });
        }
        if (card.monsterIconAssetId && missing.has(card.monsterIconAssetId)) {
          missingAssets.push({
            label: "icon",
            id: card.monsterIconAssetId,
            name: card.monsterIconAssetName ?? null,
          });
        }
        if (missingAssets.length > 0) {
          failures += 1;
          const titleLabel = card.title ?? card.name ?? "Untitled";
          const missingSummary = missingAssets
            .map(
              (asset) =>
                `${asset.label} asset "${asset.name ?? "unknown"}" (id=${asset.id})`,
            )
            .join(", ");
          logCardSkip(session, { reason: `Missing ${missingSummary}` });
          exportNotes.push(
            `Card "${titleLabel}" (id=${card.id}, template=${card.templateId}, face=${
              card.face ?? "unknown"
            }) could not be exported because the ${missingSummary}.`,
          );
          continue;
        }

        const now = () =>
          typeof performance !== "undefined" ? performance.now() : Date.now();

        const assetIds = [card.imageAssetId, card.monsterIconAssetId].filter(
          (id): id is string => Boolean(id),
        );
        const waitStart = now();
        await waitForAssetElements(() => previewRef.current?.getSvgElement(), assetIds);
        logCardWait(session, { durationMs: now() - waitStart });

        await previewRef.current?.waitForBackgroundLoaded?.();
        const renderStart = now();
        const pngBlob = await previewRef.current?.renderToPngBlob({
          loggingId: session.sessionId,
          assetBlobsById: cache,
          bleedPx,
          cropMarks,
          cutMarks,
          roundedCorners,
        });
        renders += 1;
        const renderDuration = now() - renderStart;
        const success = Boolean(pngBlob);
        logCardRender(session, { durationMs: renderDuration, success });

        if (!pngBlob) {
          failures += 1;
          if (shouldCancel()) {
            return { status: "cancelled", exportedCount };
          }
          continue;
        }

        const resolvedName = resolveName(card, usedNames);
        let fileName = resolvedName;
        let dedupeAttempts = 0;
        const shortId = card.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "card";
        while (zipNameSet.has(fileName)) {
          dedupeAttempts += 1;
          const dotIndex = fileName.lastIndexOf(".");
          const stem = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
          const ext = dotIndex >= 0 ? fileName.slice(dotIndex) : "";
          fileName = `${stem}-${shortId}${ext}`;
          if (dedupeAttempts > 3) {
            fileName = `${stem}-${shortId}-${dedupeAttempts}${ext}`;
          }
        }
        logCardFileName(session, {
          cardId: card.id,
          fileName,
          wasDeduped: fileName !== resolvedName,
        });
        zipFiles.push({ name: fileName, data: pngBlob });
        zipNameSet.add(fileName);
        exportedCount += 1;
        onProgress(exportedCount);
      }

      cache.clear();
    }

    if (shouldCancel()) {
      return { status: "cancelled", exportedCount };
    }

    if (!exportedCount) {
      if (exportNotes.length > 0) {
        zipFiles.push({ name: "export-issues.txt", data: exportNotes.join("\n") });
        zipNameSet.add("export-issues.txt");
        const zipBlob = await createZipBlobWithProgress({
          files: zipFiles,
          compress: USE_ZIP_COMPRESSION,
          onProgress: onZipProgress,
          onStatus: onZipStatus,
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
        return { status: "success", exportedCount: 0 };
      }
      return { status: "no-images", exportedCount: 0 };
    }

    if (exportNotes.length > 0) {
      zipFiles.push({ name: "export-issues.txt", data: exportNotes.join("\n") });
      zipNameSet.add("export-issues.txt");
    }

    const zipBlob = await createZipBlobWithProgress({
      files: zipFiles,
      compress: USE_ZIP_COMPRESSION,
      onProgress: onZipProgress,
      onStatus: onZipStatus,
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
  } finally {
    const endedAt = Date.now();
    logSummary(session, {
      endedAt,
      totalMs: endedAt - session.startedAt,
      cards: cards.length,
      renders,
      failures,
    });
    endExportLogging(session);
  }
};
