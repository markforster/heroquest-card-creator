"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiClient } from "@/api/client";
import CardPreview from "@/components/Cards/CardPreview";
import { CARD_CORNER_RADIUS } from "@/components/Cards/CardPreview/consts";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview/types";
import {
  parseDeckPdfPlaceholderFrontId,
  resolveDeckPdfRunData,
  summarizeDeckPdfRunData,
  type DeckPdfExportSummary,
  type DeckPdfSetScopeMode,
} from "@/components/Decks/deck-export";
import DeckPdfExportPanel from "@/components/Decks/pdf/DeckPdfExportPanel";
import {
  buildDeckPdfAlignmentFileName,
  buildDeckPdfFileName,
} from "@/components/Decks/pdf/deckPdfFileName";
import { buildDeckPdfSummaryContent } from "@/components/Decks/pdf/buildDeckPdfSummaryContent";
import PdfExportShellModal, {
  type PdfExportAlignmentRun,
  type PdfExportRun,
  type PdfExportRunBuildContext,
  type PdfExportShellState,
} from "@/components/Export/PdfExportShellModal";
import { waitForAssetElements, waitForFrame } from "@/components/Stockpile/stockpile-utils";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { composeBleedCanvas } from "@/lib/bleed-export";
import { collectCardAssetIds } from "@/lib/card-assets";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { buildAssetCache } from "@/lib/export-assets-cache";
import {
  buildSingleSheetAlignmentComposition,
  parseAlignmentFaceId,
  type PrintConfig,
} from "@/lib/pdf-export";

type DeckPdfRunData = Awaited<ReturnType<typeof resolveDeckPdfRunData>>;

type DeckPdfExportSummaryModalProps = {
  isOpen: boolean;
  deckId: string | null;
  scope: "decks_grid" | "deck_detail";
  onClose: () => void;
};

export default function DeckPdfExportSummaryModal({
  isOpen,
  deckId,
  scope,
  onClose,
}: DeckPdfExportSummaryModalProps) {
  const { t, language } = useI18n();
  const [setScopeMode, setSetScopeMode] = useState<DeckPdfSetScopeMode>("complete");
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
  const [slotPairs, setSlotPairs] = useState<DeckPdfRunData["slotPairs"]>([]);
  const [summary, setSummary] = useState<DeckPdfExportSummary | null>(null);
  const [runData, setRunData] = useState<DeckPdfRunData | null>(null);
  const [shellState, setShellState] = useState<PdfExportShellState | null>(null);
  const [pdfRenderTarget, setPdfRenderTarget] = useState<Awaited<
    ReturnType<typeof apiClient.getCard>
  > | null>(null);
  const initializedForDeckRef = useRef<string | null>(null);
  const pdfPreviewRef = useRef<CardPreviewHandle | null>(null);
  void scope;

  const resetState = useCallback(() => {
    setSummary(null);
    setRunData(null);
    setSlotPairs([]);
    setSetScopeMode("complete");
    setSelectedSetIds(new Set());
    setShellState(null);
    setPdfRenderTarget(null);
  }, []);

  const refreshDeckPdfRun = useCallback(
    async (
      deckIdValue: string,
      mode: PdfExportShellState["effectiveConfig"]["mode"],
      nextSetScopeMode: DeckPdfSetScopeMode,
      nextSelectedSetIds: Set<string>,
    ) => {
      const nextRunData = await resolveDeckPdfRunData(
        deckIdValue,
        mode,
        nextSetScopeMode,
        [...nextSelectedSetIds],
      );
      const nextSummary = summarizeDeckPdfRunData(
        nextRunData,
        mode,
        nextSetScopeMode,
        nextSelectedSetIds,
      );
      setRunData(nextRunData);
      setSlotPairs(nextRunData.slotPairs);
      setSummary(nextSummary);
      return { nextRunData, nextSummary };
    },
    [],
  );

  useEffect(() => {
    if (!isOpen || !deckId || !shellState) return;
    if (initializedForDeckRef.current === `${deckId}:${shellState.effectiveConfig.mode}`) return;
    let active = true;

    void (async () => {
      const initialMode = shellState.effectiveConfig.mode;
      const initialRunData = await resolveDeckPdfRunData(
        deckId,
        initialMode,
        "complete",
        [],
      );
      if (!active) return;
      const autoSelectedIds = new Set(
        initialRunData.sets.filter((set) => set.hasEntries).map((set) => set.setId),
      );
      const nextSummary = summarizeDeckPdfRunData(
        initialRunData,
        initialMode,
        "complete",
        autoSelectedIds,
      );
      setSetScopeMode("complete");
      setSelectedSetIds(autoSelectedIds);
      setRunData(initialRunData);
      setSlotPairs(initialRunData.slotPairs);
      setSummary(nextSummary);
      setPdfRenderTarget(null);
      initializedForDeckRef.current = `${deckId}:${initialMode}`;
    })();

    return () => {
      active = false;
    };
  }, [deckId, isOpen, shellState]);

  const activeMode = shellState?.effectiveConfig.mode ?? null;

  useEffect(() => {
    if (!isOpen || !deckId || !activeMode) return;
    let active = true;

    void refreshDeckPdfRun(deckId, activeMode, setScopeMode, selectedSetIds).then(
      ({ nextRunData, nextSummary }) => {
        if (!active) return;
        setRunData(nextRunData);
        setSlotPairs(nextRunData.slotPairs);
        setSummary(nextSummary);
      },
    );

    return () => {
      active = false;
    };
  }, [activeMode, deckId, isOpen, refreshDeckPdfRun, selectedSetIds, setScopeMode]);

  const buildRenderFacePngBytes = useCallback(
    (configForRun: PrintConfig, currentRunData: DeckPdfRunData, currentShellState: PdfExportShellState) => {
      const cachedPngByFaceId = new Map<string, Uint8Array>();

      return async (faceId: string): Promise<Uint8Array | null> => {
        if (cachedPngByFaceId.has(faceId)) {
          return cachedPngByFaceId.get(faceId) ?? null;
        }

        const placeholder = parseDeckPdfPlaceholderFrontId(faceId);
        if (placeholder) {
          const set = currentRunData.sets.find((item) => item.setId === placeholder.setId) ?? null;
          const base = document.createElement("canvas");
          base.width = CARD_WIDTH;
          base.height = CARD_HEIGHT;
          const ctx = base.getContext("2d");
          if (!ctx) return null;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, base.width, base.height);
          ctx.strokeStyle = "#222222";
          ctx.lineWidth = 1;
          const edgeInset = 0.5;
          const insetX = edgeInset;
          const insetY = edgeInset;
          const borderWidth = base.width - edgeInset * 2;
          const borderHeight = base.height - edgeInset * 2;
          const radius = Math.max(0, CARD_CORNER_RADIUS - edgeInset);
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(insetX, insetY, borderWidth, borderHeight, radius);
          }
          ctx.stroke();
          ctx.fillStyle = "#111111";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = "700 28px sans-serif";
          ctx.fillText("EMPTY FRONT", base.width / 2, base.height * 0.45);
          ctx.font = "500 16px sans-serif";
          ctx.fillText(set?.setTitle ?? "Set", base.width / 2, base.height * 0.55);
          const finalCanvas =
            currentShellState.resolvedBleedOptions.bleedPx > 0 &&
            configForRun.bleedMode === "bakedInImage"
              ? composeBleedCanvas({
                  fullCanvas: base,
                  backgroundCanvas: base,
                  bleedPx: currentShellState.resolvedBleedOptions.bleedPx,
                  renderBleedBands: false,
                  cropMarks: currentShellState.resolvedBleedOptions.cropMarks,
                  cutMarks: currentShellState.resolvedBleedOptions.cutMarks,
                })
              : base;
          const blob = await new Promise<Blob | null>((resolve) =>
            finalCanvas.toBlob((nextBlob) => resolve(nextBlob), "image/png"),
          );
          if (!blob) return null;
          const bytes = new Uint8Array(await blob.arrayBuffer());
          cachedPngByFaceId.set(faceId, bytes);
          return bytes;
        }

        const card = await apiClient.getCard({ params: { id: faceId } }).catch(() => null);
        if (!card) {
          return null;
        }

        setPdfRenderTarget(card);
        await waitForFrame();
        await waitForFrame();
        await pdfPreviewRef.current?.waitForBackgroundLoaded?.();
        await pdfPreviewRef.current?.syncCopyrightContrast?.();

        const assetIds = collectCardAssetIds(cardRecordToCardData(card as never));
        const { cache } = await buildAssetCache(assetIds);
        if (assetIds.length > 0) {
          await waitForAssetElements(() => pdfPreviewRef.current?.getSvgElement(), assetIds);
        }

        const blob = await pdfPreviewRef.current?.renderToPngBlob({
          bleedPx:
            configForRun.bleedMode === "bakedInImage"
              ? currentShellState.resolvedBleedOptions.bleedPx
              : 0,
          cropMarks:
            configForRun.bleedMode === "bakedInImage"
              ? currentShellState.resolvedBleedOptions.cropMarks
              : {
                  enabled: false,
                  color: currentShellState.resolvedBleedOptions.cropMarks.color,
                  style: currentShellState.resolvedBleedOptions.cropMarks.style,
                },
          cutMarks:
            configForRun.bleedMode === "bakedInImage"
              ? currentShellState.resolvedBleedOptions.cutMarks
              : {
                  enabled: false,
                  color: currentShellState.resolvedBleedOptions.cutMarks.color,
                },
          roundedCorners: currentShellState.resolvedBleedOptions.roundedCorners,
          assetBlobsById: cache,
        });
        cache.clear();
        if (!blob) {
          return null;
        }
        const bytes = new Uint8Array(await blob.arrayBuffer());
        cachedPngByFaceId.set(faceId, bytes);
        return bytes;
      };
    },
    [],
  );

  const buildExportRun = useCallback(
    async ({
      shellState: currentShellState,
      config: configForRun,
    }: PdfExportRunBuildContext): Promise<PdfExportRun | null> => {
      if (!deckId || !runData) {
        window.alert(t("alert.selectCardToExport"));
        return null;
      }

      const deck = await apiClient.getDeck({ params: { deckId } }).catch(() => null);
      const deckName = deck?.title?.trim() || t("decks.untitledDeck");

      return {
        fileName: buildDeckPdfFileName({ deckName, date: new Date() }),
        includeCalibrationPage: true,
        renderFacePngBytes: buildRenderFacePngBytes(configForRun, runData, currentShellState),
      };
    },
    [buildRenderFacePngBytes, deckId, runData, t],
  );

  const buildAlignmentExportRun = useCallback(
    async ({
      shellState: currentShellState,
      config: configForRun,
      layout,
    }: PdfExportRunBuildContext): Promise<PdfExportAlignmentRun | null> => {
      if (!slotPairs.length) {
        window.alert(t("alert.selectCardToExport"));
        return null;
      }

      const composition = buildSingleSheetAlignmentComposition(
        layout.grid.perPage,
        configForRun.mode === "frontAndBack",
      );

      const renderFacePngBytes = async (faceId: string): Promise<Uint8Array | null> => {
        const parsed = parseAlignmentFaceId(faceId);
        if (!parsed) {
          throw new Error(`Invalid alignment face id: ${faceId}`);
        }
        const base = document.createElement("canvas");
        base.width = CARD_WIDTH;
        base.height = CARD_HEIGHT;
        const ctx = base.getContext("2d");
        if (!ctx) {
          throw new Error("Unable to create alignment canvas context");
        }

        const sideLabel = parsed.side === "front" ? "FRONT" : "BACK";
        const title = `S${parsed.sheetIndex + 1} • ${sideLabel}`;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, base.width, base.height);

        ctx.strokeStyle = "#222222";
        ctx.lineWidth = 1;
        const edgeInset = 0.5;
        const insetX = edgeInset;
        const insetY = edgeInset;
        const borderWidth = base.width - edgeInset * 2;
        const borderHeight = base.height - edgeInset * 2;
        const radius = Math.max(0, CARD_CORNER_RADIUS - edgeInset);
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(insetX, insetY, borderWidth, borderHeight, radius);
        } else {
          const right = insetX + borderWidth;
          const bottom = insetY + borderHeight;
          const r = Math.min(radius, borderWidth / 2, borderHeight / 2);
          ctx.moveTo(insetX + r, insetY);
          ctx.lineTo(right - r, insetY);
          ctx.quadraticCurveTo(right, insetY, right, insetY + r);
          ctx.lineTo(right, bottom - r);
          ctx.quadraticCurveTo(right, bottom, right - r, bottom);
          ctx.lineTo(insetX + r, bottom);
          ctx.quadraticCurveTo(insetX, bottom, insetX, bottom - r);
          ctx.lineTo(insetX, insetY + r);
          ctx.quadraticCurveTo(insetX, insetY, insetX + r, insetY);
        }
        ctx.stroke();

        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(base.width / 2, insetY);
        ctx.lineTo(base.width / 2, base.height - insetY);
        ctx.moveTo(insetX, base.height / 2);
        ctx.lineTo(base.width - insetX, base.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#111111";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "700 112px sans-serif";
        ctx.fillText(String(parsed.slotNumber), base.width / 2, base.height * 0.4);

        ctx.font = "500 20px sans-serif";
        ctx.fillText(title, base.width / 2, base.height * 0.56);
        ctx.font = "400 13px monospace";
        ctx.fillText(`slot ${parsed.slotNumber}`, base.width / 2, base.height * 0.63);

        const triangle = 14;
        const markerInset = 28;
        ctx.beginPath();
        ctx.moveTo(insetX + markerInset, insetY + markerInset);
        ctx.lineTo(insetX + markerInset + triangle, insetY + markerInset);
        ctx.lineTo(insetX + markerInset, insetY + markerInset + triangle);
        ctx.closePath();
        ctx.fillStyle = "#111111";
        ctx.fill();

        const finalCanvas =
          currentShellState.resolvedBleedOptions.bleedPx > 0 &&
          configForRun.bleedMode === "bakedInImage"
            ? composeBleedCanvas({
                fullCanvas: base,
                backgroundCanvas: base,
                bleedPx: currentShellState.resolvedBleedOptions.bleedPx,
                renderBleedBands: false,
                cropMarks: currentShellState.resolvedBleedOptions.cropMarks,
                cutMarks: currentShellState.resolvedBleedOptions.cutMarks,
              })
            : base;

        const blob = await new Promise<Blob | null>((resolve) =>
          finalCanvas.toBlob((nextBlob) => resolve(nextBlob), "image/png"),
        );
        if (!blob) {
          throw new Error("Unable to encode alignment image");
        }
        return new Uint8Array(await blob.arrayBuffer());
      };

      return {
        composition,
        fileName: buildDeckPdfAlignmentFileName(new Date()),
        includeCalibrationPage: true,
        renderFacePngBytes,
      };
    },
    [slotPairs.length, t],
  );

  const handleClose = useCallback(() => {
    initializedForDeckRef.current = null;
    resetState();
    onClose();
  }, [onClose, resetState]);

  const summaryContent = buildDeckPdfSummaryContent({
    summary,
    setScopeMode,
    slotPairs,
    t,
  });

  const resolvedTopContent = useCallback(
    () => (
      <DeckPdfExportPanel
        isOpen={isOpen}
        summary={summary}
        setScopeMode={setScopeMode}
        selectedSetIds={selectedSetIds}
        onSetScopeMode={setSetScopeMode}
        onToggleSet={(setId) =>
          setSelectedSetIds((prev) => {
            const next = new Set(prev);
            if (next.has(setId)) next.delete(setId);
            else next.add(setId);
            return next;
          })
        }
      />
    ),
    [isOpen, selectedSetIds, setScopeMode, summary],
  );

  return (
    <>
      <PdfExportShellModal
        isOpen={isOpen}
        title={t("decks.pdf.modal.title") + " (Beta)"}
        slotPairs={slotPairs}
        summaryContent={summaryContent}
        onCancel={handleClose}
        onStateChange={setShellState}
        buildExportRun={buildExportRun}
        buildAlignmentExportRun={buildAlignmentExportRun}
        topContent={resolvedTopContent}
      >
        {pdfRenderTarget ? (
          <div
            style={{ position: "fixed", left: -99999, top: -99999, pointerEvents: "none" }}
            aria-hidden="true"
          >
            <CardPreview
              ref={pdfPreviewRef}
              templateId={pdfRenderTarget.templateId}
              templateName={getTemplateNameLabel(
                language,
                cardTemplatesById[pdfRenderTarget.templateId],
              )}
              backgroundSrc={cardTemplatesById[pdfRenderTarget.templateId]?.background}
              cardData={cardRecordToCardData(pdfRenderTarget as never)}
              copyrightTextColor={pdfRenderTarget.copyrightColor ?? undefined}
            />
          </div>
        ) : null}
      </PdfExportShellModal>
    </>
  );
}
