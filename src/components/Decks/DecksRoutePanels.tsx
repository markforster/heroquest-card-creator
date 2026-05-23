"use client";

import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { apiClient } from "@/api/client";
import DeckDetailPanel from "@/components/Decks/DeckDetailPanel";
import { DeckExportProvider } from "@/components/Decks/context/DeckExportContext";
import { resolveDeckExportFaceIds } from "@/components/Decks/deck-export";
import DeckPdfExportModal from "@/components/Decks/pdf/DeckPdfExportModal";
import DecksGridPanel from "@/components/Decks/DecksGridPanel";
import { useDeckDetailSelectionModel } from "@/components/Decks/hooks/useDeckDetailSelectionModel";
import { useDeckDetailState } from "@/components/Decks/hooks/useDeckDetailState";
import { useDeckMutations } from "@/components/Decks/hooks/useDeckMutations";
import { useDecksDragController } from "@/components/Decks/hooks/useDecksDragController";
import { useDeckSetEntriesModel } from "@/components/Decks/hooks/useDeckSetEntriesModel";
import { buildDeckDeepLink } from "@/components/Decks/deckDeepLink";
import CardPreview from "@/components/Cards/CardPreview";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview/types";
import {
  useBulkCardExport,
  type MissingAssetsExportPrompt,
} from "@/components/Export/hooks/useBulkCardExport";
import ExportBleedPrompt, { type ExportPromptResult } from "@/components/Modals/ExportBleedPrompt";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useAppActions } from "@/components/Providers/AppActionsContext";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useExportSettingsState } from "@/components/Providers/ExportSettingsContext";
import StockpileMissingAssetsModal from "@/components/Stockpile/StockpileMissingAssetsModal";
import { waitForAssetElements, waitForFrame } from "@/components/Stockpile/stockpile-utils";
import { resolveExportFileName, resolveZipFileName } from "@/components/Stockpile/stockpile-utils";
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
  composeDeckSlotPairs,
  composePrintComposition,
  computeLayoutPlan,
  parseAlignmentFaceId,
  renderPdf,
  type PrintConfig,
} from "@/lib/pdf-export";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import { CARD_CORNER_RADIUS } from "@/components/Cards/CardPreview/consts";

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
  const [isDeckPdfExporting, setIsDeckPdfExporting] = useState(false);
  const [pdfPrompt, setPdfPrompt] = useState<{
    resolve: (result: ExportPromptResult | null) => void;
    initial: typeof exportSettings;
  } | null>(null);
  const [pdfRenderTarget, setPdfRenderTarget] = useState<Awaited<
    ReturnType<typeof apiClient.getCard>
  > | null>(null);
  const pdfPreviewRef = useRef<CardPreviewHandle | null>(null);

  const isDeckDetail = Boolean(deckId);
  const isDecksIndex = !isDeckDetail;

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

  const requestExportOptions = useCallback(async (): Promise<ExportPromptResult | null> => {
    if (!exportSettings.bleed.askBeforeExport) {
      return {
        bleedPx: exportSettings.bleed.enabled ? exportSettings.bleed.bleedPx : 0,
        cropMarks: {
          enabled: exportSettings.bleed.enabled ? exportSettings.cropMarks.enabled : false,
          color: exportSettings.cropMarks.color,
          style: exportSettings.cropMarks.style ?? "lines",
        },
        cutMarks: {
          enabled: exportSettings.cutMarks.enabled,
          color: exportSettings.cutMarks.color,
        },
        roundedCorners: exportSettings.roundedCorners,
      };
    }

    return new Promise<ExportPromptResult | null>((resolve) => {
      setPdfPrompt({ resolve, initial: exportSettings });
    });
  }, [exportSettings]);

  const startDeckPdfExport = useCallback(
    async (deckIdValue: string, scope: "decks_grid" | "deck_detail") => {
      setPendingDeckPdfExport({ deckId: deckIdValue, scope });
    },
    [],
  );

  const runDeckPdfExport = useCallback(
    async (config: PrintConfig) => {
      const pending = pendingDeckPdfExport;
      if (!pending) return;

      const exportOptions = await requestExportOptions();
      if (!exportOptions) return;

      const layout = computeLayoutPlan(config);
      if (layout.grid.perPage <= 0) {
        window.alert(t("decks.pdf.errors.layoutCapacity"));
        return;
      }

      const slotPairs = await composeDeckSlotPairs(pending.deckId, config.mode);
      if (!slotPairs.length) {
        window.alert(t("alert.selectCardToExport"));
        return;
      }

      const composition = composePrintComposition(slotPairs, layout.grid.perPage);
      if (!composition.sheets.length) {
        window.alert(t("decks.pdf.errors.noSheets"));
        return;
      }

      const cachedPngByFaceId = new Map<string, Uint8Array>();
      const renderFacePngBytes = async (faceId: string): Promise<Uint8Array | null> => {
        if (cachedPngByFaceId.has(faceId)) {
          return cachedPngByFaceId.get(faceId) ?? null;
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
          bleedPx: exportOptions.bleedPx,
          cropMarks: exportOptions.cropMarks,
          cutMarks: exportOptions.cutMarks,
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
        const now = new Date().toISOString().replace(/[:.]/g, "-");
        const pdfResult = await renderPdf({
          config,
          layout,
          composition,
          fileName: `heroquest-deck-${pending.deckId}-${config.mode}-${now}.pdf`,
          renderFacePngBytes,
        });
        const url = URL.createObjectURL(pdfResult.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = pdfResult.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setPendingDeckPdfExport(null);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[decks] PDF export failed", error);
        window.alert(t("alert.exportImagesFailed"));
      } finally {
        setIsDeckPdfExporting(false);
        setPdfRenderTarget(null);
      }
    },
    [pendingDeckPdfExport, requestExportOptions, t],
  );

  const runDeckPdfAlignmentTestExport = useCallback(
    async (config: PrintConfig) => {
      const pending = pendingDeckPdfExport;
      if (!pending) return;

      const exportOptions = await requestExportOptions();
      if (!exportOptions) return;

      const layout = computeLayoutPlan(config);
      if (layout.grid.perPage <= 0) {
        window.alert(t("decks.pdf.errors.layoutCapacity"));
        return;
      }

      const slotPairs = await composeDeckSlotPairs(pending.deckId, config.mode);
      if (!slotPairs.length) {
        window.alert(t("alert.selectCardToExport"));
        return;
      }

      const alignmentComposition = buildSingleSheetAlignmentComposition(
        layout.grid.perPage,
        config.mode === "frontAndBack",
      );
      if (!alignmentComposition.sheets.length) {
        window.alert(t("decks.pdf.errors.noSheets"));
        return;
      }

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
          exportOptions.bleedPx > 0 || exportOptions.cropMarks.enabled || exportOptions.cutMarks.enabled
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
        if (!cachedPngByFaceId.has(faceId)) {
          const bytes = await makeAlignmentImage(faceId);
          cachedPngByFaceId.set(faceId, bytes);
        }
        return cachedPngByFaceId.get(faceId) ?? null;
      };

      setIsDeckPdfExporting(true);
      try {
        const now = new Date().toISOString().replace(/[:.]/g, "-");
        const pdfResult = await renderPdf({
          config,
          layout,
          composition: alignmentComposition,
          fileName: `heroquest-deck-${pending.deckId}-alignment-test-${now}.pdf`,
          renderFacePngBytes,
        });
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
      }
    },
    [pendingDeckPdfExport, requestExportOptions, t],
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
  }, [
    deckId,
    isDraggingAny,
    navigate,
    routeSetId,
    selectionModel.sets.length,
    selectionModel,
  ]);

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
      navigate(
        buildDeckDeepLink({ deckId, setId: routeSetId }),
        { replace: true },
      );
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
          titleOverride: formatMessage("decks.rebuildSelectFronts", { title: currentSet.title ?? "" }),
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
      <DeckPdfExportModal
        isOpen={Boolean(pendingDeckPdfExport)}
        isExporting={isDeckPdfExporting}
        onCancel={() => {
          if (isDeckPdfExporting) return;
          setPendingDeckPdfExport(null);
        }}
        onExport={runDeckPdfExport}
        onExportAlignmentTest={runDeckPdfAlignmentTestExport}
      />
      {pdfPrompt ? (
        <ExportBleedPrompt
          isOpen={Boolean(pdfPrompt)}
          initialBleedEnabled={pdfPrompt.initial.bleed.enabled}
          initialBleedPx={pdfPrompt.initial.bleed.bleedPx}
          initialCropMarksEnabled={pdfPrompt.initial.cropMarks.enabled}
          initialCropMarkColor={pdfPrompt.initial.cropMarks.color}
          initialCropMarkStyle={pdfPrompt.initial.cropMarks.style ?? "lines"}
          initialCutMarksEnabled={pdfPrompt.initial.cutMarks.enabled}
          initialCutMarkColor={pdfPrompt.initial.cutMarks.color}
          initialRoundedCorners={pdfPrompt.initial.roundedCorners}
          onConfirm={(result) => {
            const prompt = pdfPrompt;
            if (!prompt) return;
            setPdfPrompt(null);
            prompt.resolve(result);
          }}
          onCancel={() => {
            const prompt = pdfPrompt;
            if (!prompt) return;
            setPdfPrompt(null);
            prompt.resolve(null);
          }}
        />
      ) : null}
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
