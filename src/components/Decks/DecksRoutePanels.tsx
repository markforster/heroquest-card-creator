"use client";

import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { apiClient } from "@/api/client";
import CardPreview from "@/components/Cards/CardPreview";
import { CARD_CORNER_RADIUS } from "@/components/Cards/CardPreview/consts";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview/types";
import { DeckExportProvider } from "@/components/Decks/context/DeckExportContext";
import {
  parseDeckPdfPlaceholderFrontId,
  resolveDeckExportFaceIds,
  resolveDeckPdfRunData,
  summarizeDeckPdfRunData,
  type DeckPdfSetScopeMode,
  type DeckPdfExportSummary,
} from "@/components/Decks/deck-export";
import { buildDeckDeepLink } from "@/components/Decks/deckDeepLink";
import DeckDetailPanel from "@/components/Decks/DeckDetailPanel";
import DecksGridPanel from "@/components/Decks/DecksGridPanel";
import { useDeckDetailSelectionModel } from "@/components/Decks/hooks/useDeckDetailSelectionModel";
import { useDeckDetailState } from "@/components/Decks/hooks/useDeckDetailState";
import { useDeckMutations } from "@/components/Decks/hooks/useDeckMutations";
import { useDecksDragController } from "@/components/Decks/hooks/useDecksDragController";
import { useDeckSetEntriesModel } from "@/components/Decks/hooks/useDeckSetEntriesModel";
import DeckPdfExportProgressModal from "@/components/Decks/pdf/DeckPdfExportProgressModal";
import DeckPdfExportSummaryModal from "@/components/Decks/pdf/DeckPdfExportSummaryModal";
import { resolveDeckPdfBleedOptions as resolveDeckPdfBleedConfig } from "@/components/Decks/pdf/deckPdfBleed";
import {
  buildDeckPdfAlignmentFileName,
  buildDeckPdfFileName,
} from "@/components/Decks/pdf/deckPdfFileName";
import type { ExportOptionsFormState } from "@/components/Export/ExportOptionsForm";
import {
  useBulkCardExport,
  type MissingAssetsExportPrompt,
} from "@/components/Export/hooks/useBulkCardExport";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useAppActions } from "@/components/Providers/AppActionsContext";
import { useExportSettingsState } from "@/components/Providers/ExportSettingsContext";
import {
  resolveExportFileName,
  resolveZipFileName,
  waitForAssetElements,
  waitForFrame,
} from "@/components/Stockpile/stockpile-utils";
import StockpileMissingAssetsModal from "@/components/Stockpile/StockpileMissingAssetsModal";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { composeBleedCanvas } from "@/lib/bleed-export";
import { collectCardAssetIds } from "@/lib/card-assets";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { buildAssetCache } from "@/lib/export-assets-cache";
import formatMessageWith from "@/lib/format-message-with";
import {
  buildSingleSheetAlignmentComposition,
  composePrintComposition,
  computeLayoutPlan,
  DEFAULT_PDF_PRINT_CONFIG,
  getPdfFooterReserveMm,
  normalizePdfPrintConfig,
  parseAlignmentFaceId,
  renderPdf,
  type PrintConfig,
} from "@/lib/pdf-export";

export default function DecksRoutePanels() {
  const { t, language } = useI18n();
  const { track } = useAnalytics();
  const { settings: exportSettings } = useExportSettingsState();
  const formatMessage = useMemo(
    () => (key: string, vars: Record<string, string | number>) =>
      formatMessageWith(t as never, key as never, vars),
    [t],
  );
  const navigate = useNavigate();
  const location = useLocation();
  const { deckId, setId: routeSetId, entryId: routeEntryId } = useParams();
  const { openStockpile } = useAppActions();
  const mutations = useDeckMutations();
  const exportFlow = useBulkCardExport();
  const [missingAssetsPrompt, setMissingAssetsPrompt] = useState<MissingAssetsExportPrompt | null>(
    null,
  );
  const [pendingExportContext, setPendingExportContext] = useState<{
    deckId: string;
    scope: "decks_grid" | "deck_detail";
  } | null>(null);
  const [pendingDeckExportConfirm, setPendingDeckExportConfirm] = useState<{
    deckId: string;
    scope: "decks_grid" | "deck_detail";
    setCount: number;
    totalCount: number;
    frontCount: number;
    backCount: number;
  } | null>(null);
  const [pendingDeckPdfExport, setPendingDeckPdfExport] = useState<{
    deckId: string;
    scope: "decks_grid" | "deck_detail";
  } | null>(null);
  const [deckPdfSetScopeMode, setDeckPdfSetScopeMode] = useState<DeckPdfSetScopeMode>("complete");
  const [deckPdfLayoutMode, setDeckPdfLayoutMode] = useState<"default" | "custom">("default");
  const [deckPdfBleedMode, setDeckPdfBleedMode] = useState<"default" | "custom">("default");
  const [deckPdfSelectedSetIds, setDeckPdfSelectedSetIds] = useState<Set<string>>(new Set());
  const [deckPdfRunConfig, setDeckPdfRunConfig] = useState<PrintConfig>(DEFAULT_PDF_PRINT_CONFIG);
  const [deckPdfRunBleedOptions, setDeckPdfRunBleedOptions] = useState<ExportOptionsFormState>({
    bleedEnabled: false,
    bleedPx: 0,
    askBeforeExport: false,
    roundedCorners: true,
    cropMarksEnabled: false,
    cropMarkColor: "#00FFFF",
    cropMarkStyle: "lines",
    cutMarksEnabled: false,
    cutMarkColor: "#00FFFF",
  });
  const [deckPdfSummary, setDeckPdfSummary] = useState<DeckPdfExportSummary | null>(null);
  const [isDeckPdfExporting, setIsDeckPdfExporting] = useState(false);
  const [isDeckPdfProgressOpen, setIsDeckPdfProgressOpen] = useState(false);
  const [deckPdfProgressCurrent, setDeckPdfProgressCurrent] = useState(0);
  const [deckPdfProgressTotal, setDeckPdfProgressTotal] = useState(0);
  const [deckPdfProgressPhase, setDeckPdfProgressPhase] = useState<string | null>(null);
  const [deckPdfIsCancelling, setDeckPdfIsCancelling] = useState(false);
  const deckPdfCancelRequestedRef = useRef(false);
  const [pdfRenderTarget, setPdfRenderTarget] = useState<Awaited<
    ReturnType<typeof apiClient.getCard>
  > | null>(null);
  const pdfPreviewRef = useRef<CardPreviewHandle | null>(null);

  const isDeckDetail = Boolean(deckId);
  const isDecksIndex = !isDeckDetail;
  const deckPdfDefaultConfig = normalizePdfPrintConfig(exportSettings.pdf ?? DEFAULT_PDF_PRINT_CONFIG);
  const deckPdfDefaultBleedOptions: ExportOptionsFormState = {
    bleedEnabled: exportSettings.bleed.enabled,
    bleedPx: exportSettings.bleed.bleedPx,
    askBeforeExport: false,
    roundedCorners: exportSettings.roundedCorners,
    cropMarksEnabled: exportSettings.cropMarks.enabled,
    cropMarkColor: exportSettings.cropMarks.color,
    cropMarkStyle: exportSettings.cropMarks.style ?? "lines",
    cutMarksEnabled: exportSettings.cutMarks.enabled,
    cutMarkColor: exportSettings.cutMarks.color,
  };

  const detail = useDeckDetailState(deckId ?? null);
  const selectionModel = useDeckDetailSelectionModel(deckId ?? null);
  const entriesModel = useDeckSetEntriesModel(selectionModel.selectedSetId);
  const isSelectionPathSyncDisabledRef = useRef(false);
  const hydratedSetRouteKeyRef = useRef<string | null>(null);
  const hydratedEntryRouteKeyRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const executeDeckExport = useCallback(
    async (
      deckIdValue: string,
      scope: "decks_grid" | "deck_detail",
      faceIds: string[],
      options?: { skipIds?: Set<string>; skipNotes?: Map<string, string>; skipPrecheck?: boolean },
    ) => {
      if (!faceIds.length) {
        window.alert(t("alert.selectCardToExport"));
        return;
      }
      const records = await Promise.all(
        faceIds.map(async (id) => {
          try {
            return await apiClient.getCard({ params: { id } });
          } catch {
            return null;
          }
        }),
      );
      const cards = records.filter((card): card is NonNullable<typeof card> => Boolean(card));
      if (!cards.length) {
        window.alert(t("alert.noImagesExported"));
        return;
      }
      track("export_started", { scope });
      const result = await exportFlow.startBulkCardExport({
        cards,
        skipIds: options?.skipIds,
        skipNotes: options?.skipNotes,
        skipPrecheck: options?.skipPrecheck,
        resolveName: (card, usedNames) =>
          resolveExportFileName(card.name || card.title || card.templateId, usedNames),
        resolveZipName: () => resolveZipFileName(() => null),
      });
      if (result.status === "missing-assets") {
        setPendingExportContext({ deckId: deckIdValue, scope });
        setMissingAssetsPrompt(result.prompt);
      }
    },
    [exportFlow, t, track],
  );

  const startDeckExport = useCallback(
    async (deckIdValue: string, scope: "decks_grid" | "deck_detail") => {
      const { faceIds, setCount, totalCount, frontCount, backCount } =
        await resolveDeckExportFaceIds(deckIdValue);
      if (!faceIds.length) {
        window.alert(t("alert.selectCardToExport"));
        return;
      }
      setPendingDeckExportConfirm({
        deckId: deckIdValue,
        scope,
        setCount,
        totalCount,
        frontCount,
        backCount,
      });
    },
    [t],
  );

  const resolveDeckPdfBleedOptions = useCallback(() => {
    const source =
      deckPdfBleedMode === "custom"
        ? deckPdfRunBleedOptions
        : {
            bleedEnabled: exportSettings.bleed.enabled,
            bleedPx: exportSettings.bleed.bleedPx,
            roundedCorners: exportSettings.roundedCorners,
            cropMarksEnabled: exportSettings.cropMarks.enabled,
            cropMarkColor: exportSettings.cropMarks.color,
            cropMarkStyle: exportSettings.cropMarks.style ?? "lines",
            cutMarksEnabled: exportSettings.cutMarks.enabled,
            cutMarkColor: exportSettings.cutMarks.color,
          };
    return resolveDeckPdfBleedConfig(source);
  }, [deckPdfBleedMode, deckPdfRunBleedOptions, exportSettings]);

  const refreshDeckPdfRun = useCallback(
    async (
      deckIdValue: string,
      mode: PrintConfig["mode"],
      scopeMode: DeckPdfSetScopeMode,
      selectedSetIds: Set<string>,
    ) => {
      const runData = await resolveDeckPdfRunData(deckIdValue, mode, scopeMode, [...selectedSetIds]);
      const nextSummary = summarizeDeckPdfRunData(runData, mode, scopeMode, selectedSetIds);
      setDeckPdfSummary(nextSummary);
      return { runData, nextSummary };
    },
    [],
  );

  const startDeckPdfExport = useCallback(
    async (deckIdValue: string, scope: "decks_grid" | "deck_detail") => {
      const initialConfig = normalizePdfPrintConfig(exportSettings.pdf ?? DEFAULT_PDF_PRINT_CONFIG);
      const initialRunData = await resolveDeckPdfRunData(
        deckIdValue,
        initialConfig.mode,
        "complete",
        [],
      );
      const autoSelectedIds = new Set(
        initialRunData.sets.filter((set) => set.hasEntries).map((set) => set.setId),
      );
      const summary = summarizeDeckPdfRunData(
        initialRunData,
        initialConfig.mode,
        "complete",
        autoSelectedIds,
      );
      setDeckPdfRunConfig(initialConfig);
      setDeckPdfSetScopeMode("complete");
      setDeckPdfLayoutMode("default");
      setDeckPdfBleedMode("default");
      setDeckPdfSelectedSetIds(autoSelectedIds);
      setDeckPdfRunBleedOptions({
        bleedEnabled: exportSettings.bleed.enabled,
        bleedPx: exportSettings.bleed.bleedPx,
        askBeforeExport: false,
        roundedCorners: exportSettings.roundedCorners,
        cropMarksEnabled: exportSettings.cropMarks.enabled,
        cropMarkColor: exportSettings.cropMarks.color,
        cropMarkStyle: exportSettings.cropMarks.style ?? "lines",
        cutMarksEnabled: exportSettings.cutMarks.enabled,
        cutMarkColor: exportSettings.cutMarks.color,
      });
      setDeckPdfSummary(summary);
      setPendingDeckPdfExport({ deckId: deckIdValue, scope });
    },
    [exportSettings],
  );

  useEffect(() => {
    const pending = pendingDeckPdfExport;
    if (!pending) return;
    let active = true;
    void refreshDeckPdfRun(
      pending.deckId,
      deckPdfRunConfig.mode,
      deckPdfSetScopeMode,
      deckPdfSelectedSetIds,
    ).then(({ nextSummary }) => {
      if (!active) return;
      setDeckPdfSummary(nextSummary);
    });
    return () => {
      active = false;
    };
  }, [
    deckPdfRunConfig.mode,
    deckPdfSelectedSetIds,
    deckPdfSetScopeMode,
    pendingDeckPdfExport,
    refreshDeckPdfRun,
  ]);

  const openDeckPdfProgress = useCallback((total: number) => {
    deckPdfCancelRequestedRef.current = false;
    setDeckPdfIsCancelling(false);
    setDeckPdfProgressCurrent(0);
    setDeckPdfProgressTotal(total);
    setDeckPdfProgressPhase(t("status.exportingImages"));
    setIsDeckPdfProgressOpen(true);
  }, [t]);

  const closeDeckPdfProgress = useCallback(() => {
    setIsDeckPdfProgressOpen(false);
    setDeckPdfProgressCurrent(0);
    setDeckPdfProgressTotal(0);
    setDeckPdfProgressPhase(null);
    setDeckPdfIsCancelling(false);
    deckPdfCancelRequestedRef.current = false;
  }, []);

  const runDeckPdfExport = useCallback(
    async () => {
      const pending = pendingDeckPdfExport;
      if (!pending) return;
      const effectiveConfig =
        deckPdfLayoutMode === "custom"
          ? deckPdfRunConfig
          : normalizePdfPrintConfig(exportSettings.pdf ?? DEFAULT_PDF_PRINT_CONFIG);
      const exportOptions = resolveDeckPdfBleedOptions();
      const configForRun: PrintConfig = {
        ...effectiveConfig,
        bleedMm: exportOptions.bleedMm,
      };

      const layout = computeLayoutPlan(configForRun, {
        imagePaddingMm: exportOptions.imagePaddingMm,
        reservedBottomMm: getPdfFooterReserveMm(),
      });
      if (layout.grid.perPage <= 0) {
        window.alert(t("decks.pdf.errors.layoutCapacity"));
        return;
      }

      const { runData } = await refreshDeckPdfRun(
        pending.deckId,
        configForRun.mode,
        deckPdfSetScopeMode,
        deckPdfSelectedSetIds,
      );
      const slotPairs = runData.slotPairs;
      if (!slotPairs.length) {
        window.alert(t("alert.selectCardToExport"));
        return;
      }

      const composition = composePrintComposition(slotPairs, layout.grid.perPage);
      if (!composition.sheets.length) {
        window.alert(t("decks.pdf.errors.noSheets"));
        return;
      }
      const totalFaces = composition.sheets.reduce((sum, sheet) => {
        for (const slot of sheet.slots) {
          if (slot.frontId) sum += 1;
          if (configForRun.mode === "frontAndBack" && slot.backId) sum += 1;
        }
        return sum;
      }, 0);
      openDeckPdfProgress(totalFaces);

      const cachedPngByFaceId = new Map<string, Uint8Array>();
      const renderFacePngBytes = async (faceId: string): Promise<Uint8Array | null> => {
        if (deckPdfCancelRequestedRef.current) {
          return null;
        }
        if (cachedPngByFaceId.has(faceId)) {
          return cachedPngByFaceId.get(faceId) ?? null;
        }
        const placeholder = parseDeckPdfPlaceholderFrontId(faceId);
        if (placeholder) {
          const set = runData.sets.find((item) => item.setId === placeholder.setId) ?? null;
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
            exportOptions.bleedPx > 0 && configForRun.bleedMode === "bakedInImage"
              ? composeBleedCanvas({
                  fullCanvas: base,
                  backgroundCanvas: base,
                  bleedPx: exportOptions.bleedPx,
                  renderBleedBands: false,
                  cropMarks: exportOptions.cropMarks,
                  cutMarks: exportOptions.cutMarks,
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
        if (deckPdfCancelRequestedRef.current) {
          cache.clear();
          return null;
        }

        const blob = await pdfPreviewRef.current?.renderToPngBlob({
          bleedPx: configForRun.bleedMode === "bakedInImage" ? exportOptions.bleedPx : 0,
          cropMarks:
            configForRun.bleedMode === "bakedInImage"
              ? exportOptions.cropMarks
              : { enabled: false, color: exportOptions.cropMarks.color, style: exportOptions.cropMarks.style },
          cutMarks:
            configForRun.bleedMode === "bakedInImage"
              ? exportOptions.cutMarks
              : { enabled: false, color: exportOptions.cutMarks.color },
          roundedCorners: exportOptions.roundedCorners,
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

      setIsDeckPdfExporting(true);
      try {
        const now = new Date();
        const deck = await apiClient.getDeck({ params: { deckId: pending.deckId } }).catch(() => null);
        const deckName = deck?.title?.trim() || t("decks.untitledDeck");
        const pdfResult = await renderPdf({
          config: configForRun,
          layout,
          composition,
          fileName: buildDeckPdfFileName({ deckName, date: now }),
          renderFacePngBytes,
          shouldCancel: () => deckPdfCancelRequestedRef.current,
          includeCalibrationPage: true,
          onPhase: (phase) => {
            setDeckPdfProgressPhase(
              phase === "finalizing" ? t("status.finalizing") : t("status.exportingImages"),
            );
          },
          onProgress: ({ completedFaces, totalFaces: total }) => {
            setDeckPdfProgressCurrent(completedFaces);
            setDeckPdfProgressTotal(total);
          },
        });
        if (pdfResult.status === "cancelled") {
          return;
        }
        const url = URL.createObjectURL(pdfResult.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = pdfResult.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[decks] PDF export failed", error);
        window.alert(t("alert.exportImagesFailed"));
      } finally {
        setIsDeckPdfExporting(false);
        closeDeckPdfProgress();
        setPdfRenderTarget(null);
      }
    },
    [
      closeDeckPdfProgress,
      deckPdfLayoutMode,
      deckPdfRunConfig,
      deckPdfSelectedSetIds,
      deckPdfSetScopeMode,
      exportSettings.pdf,
      openDeckPdfProgress,
      pendingDeckPdfExport,
      refreshDeckPdfRun,
      resolveDeckPdfBleedOptions,
      t,
    ],
  );

  const runDeckPdfAlignmentTestExport = useCallback(
    async () => {
      const pending = pendingDeckPdfExport;
      if (!pending) return;
      const effectiveConfig =
        deckPdfLayoutMode === "custom"
          ? deckPdfRunConfig
          : normalizePdfPrintConfig(exportSettings.pdf ?? DEFAULT_PDF_PRINT_CONFIG);
      const exportOptions = resolveDeckPdfBleedOptions();
      const configForRun: PrintConfig = {
        ...effectiveConfig,
        bleedMm: exportOptions.bleedMm,
      };
      const layout = computeLayoutPlan(configForRun, {
        imagePaddingMm: exportOptions.imagePaddingMm,
        reservedBottomMm: getPdfFooterReserveMm(),
      });
      if (layout.grid.perPage <= 0) {
        window.alert(t("decks.pdf.errors.layoutCapacity"));
        return;
      }

      const { runData } = await refreshDeckPdfRun(
        pending.deckId,
        configForRun.mode,
        deckPdfSetScopeMode,
        deckPdfSelectedSetIds,
      );
      const slotPairs = runData.slotPairs;
      if (!slotPairs.length) {
        window.alert(t("alert.selectCardToExport"));
        return;
      }

      const alignmentComposition = buildSingleSheetAlignmentComposition(
        layout.grid.perPage,
        configForRun.mode === "frontAndBack",
      );
      if (!alignmentComposition.sheets.length) {
        window.alert(t("decks.pdf.errors.noSheets"));
        return;
      }
      const totalFaces = alignmentComposition.sheets.reduce((sum, sheet) => {
        for (const slot of sheet.slots) {
          if (slot.frontId) sum += 1;
          if (configForRun.mode === "frontAndBack" && slot.backId) sum += 1;
        }
        return sum;
      }, 0);
      openDeckPdfProgress(totalFaces);

      const makeAlignmentImage = async (faceId: string): Promise<Uint8Array> => {
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
        // Low-ink alignment target: plain white base, thin monochrome guides.
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

        // Minimal orientation cues.
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
          exportOptions.bleedPx > 0 && configForRun.bleedMode === "bakedInImage"
            ? composeBleedCanvas({
                fullCanvas: base,
                backgroundCanvas: base,
                bleedPx: exportOptions.bleedPx,
                renderBleedBands: false,
                cropMarks: exportOptions.cropMarks,
                cutMarks: exportOptions.cutMarks,
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

      const cachedPngByFaceId = new Map<string, Uint8Array>();
      const renderFacePngBytes = async (faceId: string): Promise<Uint8Array | null> => {
        if (deckPdfCancelRequestedRef.current) {
          return null;
        }
        if (!cachedPngByFaceId.has(faceId)) {
          const bytes = await makeAlignmentImage(faceId);
          cachedPngByFaceId.set(faceId, bytes);
        }
        return cachedPngByFaceId.get(faceId) ?? null;
      };

      setIsDeckPdfExporting(true);
      try {
        const now = new Date();
        const pdfResult = await renderPdf({
          config: configForRun,
          layout,
          composition: alignmentComposition,
          fileName: buildDeckPdfAlignmentFileName(now),
          renderFacePngBytes,
          shouldCancel: () => deckPdfCancelRequestedRef.current,
          includeCalibrationPage: true,
          onPhase: (phase) => {
            setDeckPdfProgressPhase(
              phase === "finalizing" ? t("status.finalizing") : t("status.exportingImages"),
            );
          },
          onProgress: ({ completedFaces, totalFaces: total }) => {
            setDeckPdfProgressCurrent(completedFaces);
            setDeckPdfProgressTotal(total);
          },
        });
        if (pdfResult.status === "cancelled") {
          return;
        }
        const url = URL.createObjectURL(pdfResult.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = pdfResult.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[decks] PDF alignment test export failed", error);
        window.alert(t("alert.exportImagesFailed"));
      } finally {
        setIsDeckPdfExporting(false);
        closeDeckPdfProgress();
      }
    },
    [
      closeDeckPdfProgress,
      deckPdfLayoutMode,
      deckPdfRunConfig,
      deckPdfSelectedSetIds,
      deckPdfSetScopeMode,
      exportSettings.pdf,
      openDeckPdfProgress,
      pendingDeckPdfExport,
      refreshDeckPdfRun,
      resolveDeckPdfBleedOptions,
      t,
    ],
  );

  const createSetFromBackFace = async (
    deckIdValue: string,
    groupId: string,
    backFaceId: string,
  ) => {
    return mutations.createSetFromBackFace(deckIdValue, groupId, backFaceId);
  };

  const { dragState, dndHandlers, groupRowRef, entriesRowRef } = useDecksDragController({
    deckId: deckId ?? null,
    orderedGroups: selectionModel.orderedGroups,
    sets: selectionModel.sets,
    groupBySetId: selectionModel.groupBySetId,
    selectedGroupId: selectionModel.selectedGroupId,
    selectedSetId: selectionModel.selectedSetId,
    activeSetId: selectionModel.selectedSetId,
    entries: entriesModel.entries,
    entryFrontIdByEntryId: entriesModel.entryFrontIdByEntryId,
    setSelectedGroupId: selectionModel.setSelectedGroupId,
    createSetFromBackFace,
    addFrontFaceToSet: async (setId, frontFaceId) => entriesModel.addFront(frontFaceId, setId),
    reorderSetEntries: mutations.reorderEntries,
    reorderSetEntriesOptimistic: async (setId, orderedEntryIds) =>
      entriesModel.reorderEntriesOptimistic(orderedEntryIds, setId),
    applyOptimisticSets: selectionModel.applyOptimisticSets,
    createDeckGroup: async (targetDeckId) => mutations.createGroup(targetDeckId),
    reorderDeckGroups: mutations.reorderGroups,
    reorderDeckSets: mutations.reorderSets,
    updateDeckSetGroup: mutations.updateSetGroup,
    deleteDeckSet: mutations.deleteSet,
    deleteDeckGroup: mutations.deleteGroup,
    reloadStructure: selectionModel.reloadStructure,
    refreshSetEntries: async (setId) => entriesModel.refreshEntries(setId),
  });
  const isDraggingAny =
    dragState.isBackFaceDragActive ||
    dragState.isFrontFaceDragActive ||
    dragState.isEntryDragActive ||
    dragState.isGroupDragActive ||
    dragState.isSetDragActive;

  useEffect(() => {
    if (!deckId || !routeSetId) {
      hydratedSetRouteKeyRef.current = null;
      return;
    }
    if (!deckId || isDraggingAny) return;
    const routeKey = `${deckId}:${routeSetId}`;
    if (hydratedSetRouteKeyRef.current === routeKey) return;
    const routeSet = selectionModel.setById.get(routeSetId);
    if (!routeSet) {
      if (selectionModel.sets.length > 0) {
        navigate(buildDeckDeepLink({ deckId }), { replace: true });
        hydratedSetRouteKeyRef.current = routeKey;
      }
      return;
    }
    if (selectionModel.selectedSetId !== routeSet.id) {
      isSelectionPathSyncDisabledRef.current = true;
      selectionModel.selectSet(routeSet);
      return;
    }
    hydratedSetRouteKeyRef.current = routeKey;
  }, [deckId, isDraggingAny, navigate, routeSetId, selectionModel.sets.length, selectionModel]);

  useEffect(() => {
    if (!deckId || !routeSetId || !routeEntryId) {
      hydratedEntryRouteKeyRef.current = null;
      return;
    }
    if (!deckId || isDraggingAny) return;
    if (!selectionModel.selectedSetId) return;
    if (selectionModel.selectedSetId !== routeSetId) return;
    const routeKey = `${deckId}:${routeSetId}:${routeEntryId}`;
    if (hydratedEntryRouteKeyRef.current === routeKey) return;
    const matched = entriesModel.entriesSorted.some((entry) => entry.id === routeEntryId);
    if (!matched) {
      navigate(buildDeckDeepLink({ deckId, setId: routeSetId }), { replace: true });
      hydratedEntryRouteKeyRef.current = routeKey;
      return;
    }
    if (selectionModel.selectedEntryId !== routeEntryId) {
      isSelectionPathSyncDisabledRef.current = true;
      selectionModel.setSelectedEntryId(routeEntryId);
      return;
    }
    hydratedEntryRouteKeyRef.current = routeKey;
  }, [
    deckId,
    entriesModel.entriesSorted,
    isDraggingAny,
    navigate,
    routeSetId,
    routeEntryId,
    selectionModel,
  ]);

  useEffect(() => {
    if (!deckId || isDraggingAny) return;
    if (routeSetId) {
      const expectedSetHydrationKey = `${deckId}:${routeSetId}`;
      if (hydratedSetRouteKeyRef.current !== expectedSetHydrationKey) {
        return;
      }
    }
    if (routeSetId && routeEntryId) {
      const expectedEntryHydrationKey = `${deckId}:${routeSetId}:${routeEntryId}`;
      if (hydratedEntryRouteKeyRef.current !== expectedEntryHydrationKey) {
        return;
      }
    }
    if (isSelectionPathSyncDisabledRef.current) {
      isSelectionPathSyncDisabledRef.current = false;
      return;
    }
    const target = buildDeckDeepLink({
      deckId,
      setId: selectionModel.selectedSetId,
      entryId: selectionModel.selectedEntryId,
    });
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [
    deckId,
    isDraggingAny,
    location.pathname,
    navigate,
    selectionModel.selectedEntryId,
    selectionModel.selectedSetId,
  ]);

  const handleDeleteSet = async () => {
    if (!detail.pendingDeleteSet) return;
    const wasSelected = selectionModel.selectedSetId === detail.pendingDeleteSet.id;
    const deletedSetGroupId = detail.pendingDeleteSet.groupId;
    await mutations.deleteSet(detail.pendingDeleteSet.id);
    detail.setPendingDeleteSet(null);
    detail.setIsDeleteSetOpen(false);
    await selectionModel.reloadStructure(
      wasSelected ? null : selectionModel.selectedSetId,
      wasSelected && deletedSetGroupId
        ? { suppressSingleSetAutoSelectGroupId: deletedSetGroupId }
        : undefined,
    );
    if (wasSelected) {
      selectionModel.clearSelection();
    }
  };

  const handleDeleteGroup = async () => {
    if (!detail.pendingDeleteGroup) return;
    await mutations.deleteGroup(detail.pendingDeleteGroup.id);
    detail.setPendingDeleteGroup(null);
    detail.setIsDeleteGroupOpen(false);
    await selectionModel.reloadStructure();
  };

  const startRebuildFlow = () => {
    const setId = detail.pendingRebuildSetId;
    if (!setId) return;
    detail.setIsRebuildConfirmOpen(false);
    const currentSet = selectionModel.sets.find((set) => set.id === setId);
    if (!currentSet) return;

    openStockpile({
      mode: "pair-backs",
      titleOverride: formatMessage("decks.changeBackTitle", { title: currentSet.title ?? "" }),
      onConfirmSelection: (backIds) => {
        const newBackFaceId = backIds[0];
        if (!newBackFaceId) return;
        openStockpile({
          mode: "pair-fronts",
          titleOverride: formatMessage("decks.rebuildSelectFronts", {
            title: currentSet.title ?? "",
          }),
          onConfirmSelection: async (frontIds) => {
            await mutations.rebuildSetBack(currentSet.id, newBackFaceId, frontIds);
            await selectionModel.reloadStructure(currentSet.id);
          },
        });
      },
    });
  };

  const exportProviderValue = useMemo(
    () => ({ exportDeck: startDeckExport, exportDeckPdf: startDeckPdfExport }),
    [startDeckExport, startDeckPdfExport],
  );

  return (
    <DeckExportProvider value={exportProviderValue}>
      {isDecksIndex ? (
        <DecksGridPanel />
      ) : (
        <DeckDetailPanel
          deckId={deckId ?? null}
          actions={{
            handleDeleteSet,
            handleDeleteGroup,
            startRebuildFlow,
            navigateToDecks: () => navigate("/decks"),
            onOpenCardEditor: (cardId) => navigate(`/cards/${cardId}`),
            makeSelectedSetKeyCard: async (setId) => {
              if (!deckId) return;
              await mutations.setDeckKeySet(deckId, setId);
            },
            deleteSetFromGroupCard: async (setId) => {
              const targetSet = selectionModel.setById.get(setId);
              if (!targetSet) return;
              detail.setPendingDeleteSet(targetSet);
              detail.setIsDeleteSetOpen(true);
            },
            deleteDeck: async (id) => {
              await mutations.deleteDecks([id]);
            },
          }}
          drag={dragState}
          dndProps={{ sensors, ...dndHandlers }}
          modalState={{
            isDeleteDeckOpen: detail.isDeleteDeckOpen,
            isDeleteSetOpen: detail.isDeleteSetOpen,
            isDeleteGroupOpen: detail.isDeleteGroupOpen,
            isRebuildConfirmOpen: detail.isRebuildConfirmOpen,
          }}
          modalActions={{
            setIsDeleteDeckOpen: detail.setIsDeleteDeckOpen,
            setIsDeleteSetOpen: detail.setIsDeleteSetOpen,
            setIsDeleteGroupOpen: detail.setIsDeleteGroupOpen,
            setPendingDeleteSet: detail.setPendingDeleteSet,
            setPendingDeleteGroup: detail.setPendingDeleteGroup,
            setIsRebuildConfirmOpen: detail.setIsRebuildConfirmOpen,
            setPendingRebuildSetId: detail.setPendingRebuildSetId,
          }}
          groupRowRef={groupRowRef}
          entriesRowRef={entriesRowRef}
          selectionModel={selectionModel}
          entriesModel={entriesModel}
        />
      )}
      {exportFlow.exportUi}
      <StockpileMissingAssetsModal
        prompt={missingAssetsPrompt}
        onConfirm={async () => {
          const prompt = missingAssetsPrompt;
          const pending = pendingExportContext;
          if (!prompt || !pending) return;
          setMissingAssetsPrompt(null);
          setPendingExportContext(null);
          const { faceIds } = await resolveDeckExportFaceIds(pending.deckId);
          await executeDeckExport(pending.deckId, pending.scope, faceIds, {
            skipIds: prompt.skipIds,
            skipNotes: prompt.skipNotes,
            skipPrecheck: true,
          });
        }}
        onCancel={() => {
          setMissingAssetsPrompt(null);
          setPendingExportContext(null);
        }}
      />
      <ConfirmModal
        isOpen={Boolean(pendingDeckExportConfirm)}
        title={t("decks.exportConfirm.title")}
        confirmLabel={t("actions.proceedExport")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          const pending = pendingDeckExportConfirm;
          if (!pending) return;
          setPendingDeckExportConfirm(null);
          const { faceIds } = await resolveDeckExportFaceIds(pending.deckId);
          await executeDeckExport(pending.deckId, pending.scope, faceIds);
        }}
        onCancel={() => setPendingDeckExportConfirm(null)}
      >
        {pendingDeckExportConfirm ? (
          <div className="d-flex flex-column gap-2">
            <div>
              {formatMessage("decks.exportConfirm.summary", {
                totalCount: pendingDeckExportConfirm.totalCount,
                setCount: pendingDeckExportConfirm.setCount,
              })}
            </div>
            <div>
              {formatMessage("decks.exportConfirm.breakdown", {
                frontCount: pendingDeckExportConfirm.frontCount,
                backCount: pendingDeckExportConfirm.backCount,
              })}
            </div>
            <div>{t("decks.exportConfirm.uniqueNotice")}</div>
          </div>
        ) : null}
      </ConfirmModal>
      <DeckPdfExportSummaryModal
        isOpen={Boolean(pendingDeckPdfExport)}
        isExporting={isDeckPdfExporting}
        summary={deckPdfSummary}
        config={deckPdfRunConfig}
        defaultConfig={deckPdfDefaultConfig}
        bleedOptions={deckPdfRunBleedOptions}
        defaultBleedOptions={deckPdfDefaultBleedOptions}
        setScopeMode={deckPdfSetScopeMode}
        layoutMode={deckPdfLayoutMode}
        bleedMode={deckPdfBleedMode}
        selectedSetIds={deckPdfSelectedSetIds}
        onCancel={() => {
          if (isDeckPdfExporting) return;
          setPendingDeckPdfExport(null);
          setDeckPdfSummary(null);
          setDeckPdfSetScopeMode("complete");
          setDeckPdfLayoutMode("default");
          setDeckPdfBleedMode("default");
          setDeckPdfSelectedSetIds(new Set());
          setDeckPdfRunConfig(normalizePdfPrintConfig(exportSettings.pdf ?? DEFAULT_PDF_PRINT_CONFIG));
        }}
        onSetScopeMode={(mode) => setDeckPdfSetScopeMode(mode)}
        onLayoutMode={(mode) => setDeckPdfLayoutMode(mode)}
        onBleedMode={(mode) => setDeckPdfBleedMode(mode)}
        onToggleSet={(setId) =>
          setDeckPdfSelectedSetIds((prev) => {
            const next = new Set(prev);
            if (next.has(setId)) next.delete(setId);
            else next.add(setId);
            return next;
          })
        }
        onConfigChange={(next) => setDeckPdfRunConfig(normalizePdfPrintConfig(next))}
        onBleedOptionsChange={(next) =>
          setDeckPdfRunBleedOptions((prev) => ({ ...prev, ...next }))
        }
        onExport={() => runDeckPdfExport()}
        onExportAlignmentTest={() => runDeckPdfAlignmentTestExport()}
      />
      <DeckPdfExportProgressModal
        isOpen={isDeckPdfProgressOpen}
        title={`${t("decks.pdf.modal.export")} (${deckPdfProgressTotal})`}
        progress={deckPdfProgressCurrent}
        total={deckPdfProgressTotal}
        phaseLabel={deckPdfProgressPhase}
        isCancelling={deckPdfIsCancelling}
        onCancel={() => {
          deckPdfCancelRequestedRef.current = true;
          setDeckPdfIsCancelling(true);
        }}
      />
      {pdfRenderTarget ? (
        <div style={{ position: "fixed", left: -99999, top: -99999, pointerEvents: "none" }} aria-hidden="true">
          <CardPreview
            ref={pdfPreviewRef}
            templateId={pdfRenderTarget.templateId}
            templateName={getTemplateNameLabel(language, cardTemplatesById[pdfRenderTarget.templateId])}
            backgroundSrc={cardTemplatesById[pdfRenderTarget.templateId]?.background}
            cardData={cardRecordToCardData(pdfRenderTarget as never)}
            copyrightTextColor={pdfRenderTarget.copyrightColor ?? undefined}
          />
        </div>
      ) : null}
    </DeckExportProvider>
  );
}
